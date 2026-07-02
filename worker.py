"""
Polls the event queue, classifies each event, logs the result.
Nothing gets saved to the database yet , just classifying and logging for now.

Run with:
    python worker.py

Needs DATABASE_URL set as an env variable — ask Michele for the dev connection string.
Also needs Ollama running locally: ollama pull llama3.2:3b
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any

import asyncpg
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), "extraction", "classifiers"))
sys.path.append(os.path.join(os.path.dirname(__file__), "shared"))
from signal import SignalClassifier
from extraction_classes import SignalClassification

sys.path.append(os.path.join(os.path.dirname(__file__), "integrations"))
from queue import claim_next_job, mark_job_completed, mark_job_failed, run_watchdog

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("archaeon.worker")

DATABASE_URL  = os.getenv("DATABASE_URL", "postgresql://localhost:5432/archaeon")
POLL_INTERVAL = 2   # seconds between queue polls when idle
WATCHDOG_EVERY = 60  # how often the watchdog runs

# one instance at startup — don't reinstantiate per job, Ollama load is slow
classifier = SignalClassifier()


def classify_event(payload: dict[str, Any]) -> SignalClassification:
    # pull whatever text fields are available and join them into one string
    content  = payload.get("content", {})
    metadata = payload.get("metadata", {})

    parts = [
        content.get("title", ""),
        content.get("body", ""),
        content.get("message", ""),
        content.get("description", ""),
        metadata.get("pr_title", ""),
    ]

    text = " ".join(p for p in parts if p).strip()
    return classifier.classify(text)


async def process_job(db: asyncpg.Connection, job: dict[str, Any]) -> None:
    job_id     = job["id"]
    event_id   = job["event_id"]
    source     = job["source"]
    event_type = job["event_type"]
    payload    = job["payload"]

    logger.info(
        "Processing job %s  |  source=%-10s  event_type=%s  event_id=%s",
        job_id, source, event_type, event_id,
    )

    try:
        result: SignalClassification = classify_event(payload)

        logger.info(
            "Classified   job %s  |  signal=%-30s  score=%.2f  needs_entity=%s  needs_reasoning=%s",
            job_id,
            result.content_type.value,
            result.score,
            result.needs_entity_extraction,
            result.needs_reasoning_extraction,
        )

        if result.score >= 0.6:
            logger.info(
                "HIGH SIGNAL  job %s  |  %s (%.2f)",
                job_id,
                result.content_type.value,
                result.score,
            )

        # TODO: once storage is ready, hand high-signal events to Kaif's extractor
        # and write the KnowledgeClaim to knowledge_nodes

        await mark_job_completed(db, job_id)

    except Exception as exc:
        error_msg = f"{type(exc).__name__}: {exc}"
        logger.error("Failed job %s — %s", job_id, error_msg)
        await mark_job_failed(db, job_id, error_msg)


async def run_worker(db: asyncpg.Connection) -> None:
    logger.info("Worker started, polling every %ds when idle", POLL_INTERVAL)

    last_watchdog = datetime.now(timezone.utc).timestamp()

    while True:
        now = datetime.now(timezone.utc).timestamp()
        if now - last_watchdog >= WATCHDOG_EVERY:
            reset_count = await run_watchdog(db)
            if reset_count:
                logger.warning("Watchdog reset %d stuck jobs", reset_count)
            last_watchdog = now

        job = await claim_next_job(db)

        if job is None:
            await asyncio.sleep(POLL_INTERVAL)
            continue

        await process_job(db, job)


async def main() -> None:
    logger.info("Connecting to database...")

    try:
        db = await asyncpg.connect(DATABASE_URL)
    except Exception as exc:
        logger.error("Could not connect: %s", exc)
        sys.exit(1)

    logger.info("Connected.")

    try:
        await run_worker(db)
    except KeyboardInterrupt:
        logger.info("Shutting down")
    finally:
        await db.close()


if __name__ == "__main__":
    asyncio.run(main())
