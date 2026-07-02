# Processing Worker

Reads from the event queue, runs each event through Kaif's signal classifier, logs what comes out. No writes to the knowledge graph yet — that's next sprint once the storage layer is ready.

## What's wired in

- Polls `event_queue` using Dolphin's `claim_next_job()` — picks up jobs oldest first, atomically so multiple workers don't step on each other
- Pulls the relevant text fields out of each event (title, body, commit message, PR description) and passes them straight to Kaif's `SignalClassifier`
- Logs the signal type, confidence score, and whether it needs entity/reasoning extraction
- Anything scoring 0.6+ gets flagged as high signal in the logs
- Failed jobs go back into the queue via `mark_job_failed()` — retries up to 3 times before permanently marking failed
- Watchdog runs every 60 seconds and resets any jobs stuck in `processing` for over 10 minutes

## How to run

```bash
pip install asyncpg python-dotenv ollama
python worker.py
```

You'll also need:
- `DATABASE_URL` set as an environment variable — ask Michelle for the dev connection string
- Ollama running locally with `llama3.2:3b` pulled (`ollama pull llama3.2:3b`)

## What the logs look like

```
2026-06-30 12:00:00  INFO      Worker started — polling every 2s when idle
2026-06-30 12:00:02  INFO      Processing job abc123  |  source=github  event_type=pr_opened
2026-06-30 12:00:02  INFO      Classified   job abc123  |  signal=ARCHITECTURAL_DECISION  score=0.87  needs_entity=True  needs_reasoning=True
2026-06-30 12:00:02  INFO      HIGH SIGNAL  job abc123  |  ARCHITECTURAL_DECISION (0.87) — will need extraction once storage is wired in
```

