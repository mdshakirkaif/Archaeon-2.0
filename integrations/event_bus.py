"""
queue.py
--------
The event bus. A Postgres-backed job queue that is the central nervous
system of the integrations layer.

Rules:
  1. Deduplication: same source + event_id can NEVER be inserted twice,
     regardless of the incoming status.
  2. Watchdog: jobs stuck in 'processing' for > 10 minutes are reset to
     'queued' so they get retried.
  3. Max retries: after 3 failures a job moves to 'failed' and an alert
     fires. It is never retried again automatically.
  4. Worker claim: a worker claims a job by atomically setting status to
     'processing' and recording picked_up_at. No two workers can claim the
     same job (SELECT ... FOR UPDATE SKIP LOCKED).
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import asyncpg

from shared.canonical_events import CanonicalEvent, QueueStatus

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants 
# ---------------------------------------------------------------------------

MAX_RETRY_COUNT        = 3    # after this many failures, status = failed
WATCHDOG_TIMEOUT_MINS  = 10   # jobs stuck in processing longer than this get reset


# ---------------------------------------------------------------------------
# Core bus operations
# ---------------------------------------------------------------------------

async def enqueue(
    db: asyncpg.Connection,
    event: CanonicalEvent,
) -> Optional[str]:
    """
    Insert a canonical event into the event_queue table.

    Deduplication check runs BEFORE insert:
      If any row with the same (source, event_id) already exists — in ANY
      status (queued, processing, completed, failed) — the event is silently
      discarded and None is returned.

    Returns the new row's UUID if inserted, or None if deduplicated away.

    This function is the ONLY path by which events enter the queue.
    Connectors must not write to event_queue directly.

    Parameters
    ----------
    db    : Active asyncpg connection (caller manages transaction if needed)
    event : The normalized canonical event to enqueue
    """
    # ------------------------------------------------------------------ #
    # Step 1: Deduplication check                                         #
    # ------------------------------------------------------------------ #
    # We check ALL statuses intentionally. Even a 'completed' duplicate   #
    # must be dropped — reprocessing completed events would corrupt the   #
    # graph with duplicate knowledge nodes.                               #
    # ------------------------------------------------------------------ #
    existing = await db.fetchval(
        """
        SELECT id
        FROM event_queue
        WHERE source   = $1
          AND event_id = $2
        LIMIT 1
        """,
        event.source.value,
        event.event_id,
    )

    if existing is not None:
        # Duplicate — discard silently. This is expected and normal during
        # backfill or when webhooks fire more than once for the same event.
        logger.debug(
            "Deduplicated event %s/%s — already exists as row %s",
            event.source.value,
            event.event_id,
            existing,
        )
        return None

    # ------------------------------------------------------------------ #
    # Step 2: Insert                                                       #
    # ------------------------------------------------------------------ #
    row_id = str(uuid.uuid4())
    now    = datetime.now(timezone.utc)

    await db.execute(
        """
        INSERT INTO event_queue (
            id,
            event_id,
            source,
            event_type,
            payload,
            status,
            created_at,
            picked_up_at,
            completed_at,
            retry_count,
            last_error
        ) VALUES (
            $1, $2, $3, $4, $5,
            'queued',
            $6,
            NULL, NULL, 0, NULL
        )
        """,
        row_id,
        event.event_id,
        event.source.value,
        event.event_type.value,
        event.to_dict(),    # asyncpg serializes dict -> JSONB automatically
        now,
    )

    logger.info(
        "Enqueued %s event %s (row %s)",
        event.event_type.value,
        event.event_id,
        row_id,
    )
    return row_id


async def claim_next_job(
    db: asyncpg.Connection,
) -> Optional[dict[str, Any]]:
    """
    Atomically claim the next queued job for processing.

    Uses SELECT ... FOR UPDATE SKIP LOCKED so that multiple workers running
    concurrently never claim the same job. This is the only safe pattern
    for a Postgres-backed job queue under concurrency.

    Returns the full row as a dict, or None if the queue is empty.

    The caller (Kamya's processing worker) is responsible for calling
    mark_job_completed() or mark_job_failed() after processing.
    """
    row = await db.fetchrow(
        """
        UPDATE event_queue
        SET
            status       = 'processing',
            picked_up_at = $1
        WHERE id = (
            SELECT id
            FROM event_queue
            WHERE status = 'queued'
            ORDER BY created_at ASC   -- oldest first (FIFO)
            LIMIT 1
            FOR UPDATE SKIP LOCKED    -- skip rows already locked by another worker
        )
        RETURNING *
        """,
        datetime.now(timezone.utc),
    )

    if row is None:
        return None  # Queue is empty — caller should sleep and retry

    return dict(row)


async def mark_job_completed(
    db: asyncpg.Connection,
    job_id: str,
) -> None:
    """
    Mark a job as successfully processed.
    Called by Kamya's worker after the event has been fully extracted
    and written to the knowledge graph.
    """
    await db.execute(
        """
        UPDATE event_queue
        SET
            status       = 'completed',
            completed_at = $1
        WHERE id = $2
        """,
        datetime.now(timezone.utc),
        job_id,
    )
    logger.debug("Job %s marked completed", job_id)


async def mark_job_failed(
    db: asyncpg.Connection,
    job_id: str,
    error_message: str,
) -> None:
    """
    Record a job failure. Increments retry_count.

    If retry_count reaches MAX_RETRY_COUNT (3), the job is permanently
    marked 'failed' and an alert is triggered. It will never be retried
    automatically — a human must investigate.

    If retry_count is below the limit, the job is reset to 'queued' so
    the watchdog (or the next worker poll) can retry it.

    Parameters
    ----------
    db            : Active asyncpg connection
    job_id        : UUID of the job row
    error_message : The exception or error description to store for debugging
    """
    # Fetch current retry count
    row = await db.fetchrow(
        "SELECT retry_count FROM event_queue WHERE id = $1",
        job_id,
    )
    if row is None:
        logger.error("mark_job_failed: job %s not found", job_id)
        return

    new_retry_count = row["retry_count"] + 1

    if new_retry_count >= MAX_RETRY_COUNT:
        # Permanently failed — stop retrying
        await db.execute(
            """
            UPDATE event_queue
            SET
                status      = 'failed',
                retry_count = $1,
                last_error  = $2
            WHERE id = $3
            """,
            new_retry_count,
            error_message[:2000],   # truncate to fit the column
            job_id,
        )
        # Alert — in production this would publish to PagerDuty / Slack ops channel
        logger.error(
            "ALERT: Job %s permanently failed after %d attempts. Last error: %s",
            job_id,
            new_retry_count,
            error_message,
        )
    else:
        # Retry allowed — put back in queue
        await db.execute(
            """
            UPDATE event_queue
            SET
                status      = 'queued',
                retry_count = $1,
                last_error  = $2,
                picked_up_at = NULL
            WHERE id = $3
            """,
            new_retry_count,
            error_message[:2000],
            job_id,
        )
        logger.warning(
            "Job %s failed (attempt %d/%d), re-queued. Error: %s",
            job_id,
            new_retry_count,
            MAX_RETRY_COUNT,
            error_message,
        )


# ---------------------------------------------------------------------------
# Watchdog
# ---------------------------------------------------------------------------

async def run_watchdog(db: asyncpg.Connection) -> int:
    """
    Reset any jobs that have been stuck in 'processing' for more than
    WATCHDOG_TIMEOUT_MINS minutes back to 'queued'.

    This handles the case where a worker process crashed mid-job without
    calling mark_job_failed(). Without the watchdog, those jobs would be
    stuck in 'processing' forever.

    Rule from the brief:
      "If a job stays in processing for more than 10 minutes, a watchdog
       process resets it to queued."

    Returns the number of jobs reset. Caller should log this.

    This function is called once per minute by the scheduler in main.py.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=WATCHDOG_TIMEOUT_MINS)

    result = await db.execute(
        """
        UPDATE event_queue
        SET
            status       = 'queued',
            picked_up_at = NULL,
            last_error   = COALESCE(last_error, '') || ' | Watchdog reset at ' || NOW()::text
        WHERE
            status       = 'processing'
            AND picked_up_at < $1
            AND retry_count  < $2
        """,
        cutoff,
        MAX_RETRY_COUNT,
    )

    # asyncpg returns "UPDATE N" as a string
    count = int(result.split()[-1]) if result else 0

    if count > 0:
        logger.warning("Watchdog reset %d stuck jobs back to queued", count)

    return count


# ---------------------------------------------------------------------------
# Migration SQL — hand this to Michele
# ---------------------------------------------------------------------------

EVENT_QUEUE_DDL = """
-- Table: event_queue
-- Owner: Dolphin (integrations layer)
-- Consumed by: Kamya (processing worker)
--
-- This is the central event bus. All connectors push here.
-- Kamya's worker pops from here.

CREATE TABLE IF NOT EXISTS event_queue (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id     TEXT        NOT NULL,
    source       TEXT        NOT NULL,
    event_type   TEXT        NOT NULL,
    payload      JSONB       NOT NULL,
    status       TEXT        NOT NULL DEFAULT 'queued'
                             CHECK (status IN ('queued','processing','completed','failed')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    picked_up_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    retry_count  INT         NOT NULL DEFAULT 0,
    last_error   TEXT
);

-- Deduplication index: enforces that (source, event_id) is unique across
-- ALL statuses. The application-level check in enqueue() is the primary
-- guard, but this index is the safety net.
CREATE UNIQUE INDEX IF NOT EXISTS uq_event_queue_source_event_id
    ON event_queue (source, event_id);

-- Worker poll index: the worker queries for status='queued' ordered by
-- created_at. This index makes that query fast even with millions of rows.
CREATE INDEX IF NOT EXISTS idx_event_queue_status_created
    ON event_queue (status, created_at ASC)
    WHERE status = 'queued';

-- Watchdog index: scans for stuck processing jobs older than 10 minutes.
CREATE INDEX IF NOT EXISTS idx_event_queue_processing_picked_up
    ON event_queue (picked_up_at)
    WHERE status = 'processing';

COMMENT ON TABLE event_queue IS
    'Central Postgres-backed job queue. Dolphin writes. Kamya reads. '
    'Deduplication enforced at both application and database layer.';
"""
