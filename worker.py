"""
worker.py
---------
Processing worker skeleton — Kamya's day 3 deliverable.

What this does:
  1. Connects to Postgres
  2. Polls the event_queue table for jobs (using Dolphin's claim_next_job)
  3. Calls Kaif's signal classifier on the event content
  4. Logs the result
  5. Marks the job completed or failed

No storage yet — classification result is logged only, nothing written
to the knowledge graph. That comes next sprint.

To run:
  pip install asyncpg python-dotenv
  python worker.py

Env vars needed (put in .env):
  DATABASE_URL=postgresql://user:password@localhost:5432/archaeon
"""

from __future__ import annotations

import asyncio
import logging
import os
import json
import sys
from datetime import datetime, timezone
from typing import Any, Optional

import asyncpg
from dotenv import load_dotenv

# Kaif's classifier
sys.path.append(os.path.join(os.path.dirname(__file__), "extraction", "classifiers"))
sys.path.append(os.path.join(os.path.dirname(__file__), "shared"))
from signal import SignalClassifier
from extraction_classes import SignalClassification

# Dolphin's queue operations
sys.path.append(os.path.join(os.path.dirname(__file__), "integrations"))
from queue import (
    claim_next_job,
    mark_job_completed,
    mark_job_failed,
    run_watchdog,
)

# Instantiate once at startup — Ollama model loads here, not per-job
classifier = SignalClassifier()

load_dotenv()

# ---------------------------------------------------------------------------
# Logging setup — structured enough to grep, human enough to read
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("archaeon.worker")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

DATABASE_URL     = os.getenv("DATABASE_URL", "postgresql://localhost:5432/archaeon")
POLL_INTERVAL    = 2     # seconds to sleep when queue is empty
WATCHDOG_EVERY   = 60    # run watchdog once per minute


# ---------------------------------------------------------------------------
# Classifier
# ---------------------------------------------------------------------------

def classify_event(payload: dict[str, Any]) -> SignalClassification:
    """
    Pull the most meaningful text out of the canonical event payload
    and run it through Kaif's SignalClassifier.

    We build a single text string from the fields most likely to carry
    signal — title, body, commit message, PR description — and hand it
    to the classifier. The classifier handles everything from there
    including the Ollama call, regex fallback, and score gating.
    """
    content  = payload.get("content", {})
    metadata = payload.get("metadata", {})

    # Collect the richest text fields available in the payload
    parts = [
        content.get("title", ""),
        content.get("body", ""),
        content.get("message", ""),       # commit message
        content.get("description", ""),   # PR description
        metadata.get("pr_title", ""),
    ]

    text = " ".join(p for p in parts if p).strip()

    return classifier.classify(text)


# ---------------------------------------------------------------------------
# Core processing logic
# ---------------------------------------------------------------------------

async def process_job(db: asyncpg.Connection, job: dict[str, Any]) -> None:
    """
    Process one job from the queue.

    Steps:
      1. Extract payload from the job row
      2. Run classifier
      3. Log the result
      4. Mark job completed (or failed if something throws)

    No writes to knowledge graph yet — logging only for now.
    """
    job_id     = job["id"]
    event_id   = job["event_id"]
    source     = job["source"]
    event_type = job["event_type"]
    payload    = job["payload"]  # asyncpg auto-parses JSONB to dict

    logger.info(
        "Processing job %s  |  source=%-10s  event_type=%s  event_id=%s",
        job_id, source, event_type, event_id,
    )

    try:
        # --- classify ---
        result: SignalClassification = classify_event(payload)

        # --- log the result (this is the whole deliverable for today) ---
        logger.info(
            "Classified   job %s  |  signal=%-30s  score=%.2f  "
            "needs_entity=%s  needs_reasoning=%s",
            job_id,
            result.content_type.value,
            result.score,
            result.needs_entity_extraction,
            result.needs_reasoning_extraction,
        )

        # Highlight anything above the 0.6 extraction threshold
        if result.score >= 0.6:
            logger.info(
                "HIGH SIGNAL  job %s  |  %s (%.2f) — will need extraction once storage is wired in",
                job_id,
                result.content_type.value,
                result.score,
            )

        # TODO (next sprint): if score >= threshold, hand off to Kaif's
        # extractor and write KnowledgeClaim to knowledge_nodes table.
        # For now, log only.

        await mark_job_completed(db, job_id)

    except Exception as exc:
        error_msg = f"{type(exc).__name__}: {exc}"
        logger.error("Failed to process job %s — %s", job_id, error_msg)
        await mark_job_failed(db, job_id, error_msg)


# ---------------------------------------------------------------------------
# Main worker loop
# ---------------------------------------------------------------------------

async def run_worker(db: asyncpg.Connection) -> None:
    """
    Poll the queue in a loop. Claims and processes one job per iteration.
    Sleeps POLL_INTERVAL seconds when the queue is empty.
    """
    logger.info("Worker started — polling every %ds when idle", POLL_INTERVAL)

    last_watchdog = datetime.now(timezone.utc).timestamp()

    while True:
        # Run watchdog roughly once per minute
        now = datetime.now(timezone.utc).timestamp()
        if now - last_watchdog >= WATCHDOG_EVERY:
            reset_count = await run_watchdog(db)
            if reset_count:
                logger.warning("Watchdog reset %d stuck jobs", reset_count)
            last_watchdog = now

        # Claim next job
        job = await claim_next_job(db)

        if job is None:
            # Queue is empty — wait before polling again
            await asyncio.sleep(POLL_INTERVAL)
            continue

        await process_job(db, job)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

async def main() -> None:
    logger.info("Connecting to database...")

    try:
        db = await asyncpg.connect(DATABASE_URL)
    except Exception as exc:
        logger.error("Could not connect to database: %s", exc)
        logger.error("Make sure DATABASE_URL is set correctly in your .env file")
        sys.exit(1)

    logger.info("Connected. Starting worker loop.")

    try:
        await run_worker(db)
    except KeyboardInterrupt:
        logger.info("Shutting down worker (KeyboardInterrupt)")
    finally:
        await db.close()
        logger.info("Database connection closed. Goodbye.")


if __name__ == "__main__":
    asyncio.run(main())
