# API Endpoints

Base URL to be confirmed once infra is set up. OpenAPI docs live at `/docs` once the server is running 

---

## Authentication

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/login` | Email + password → JWT access token + refresh token. No auth required. |
| `POST` | `/auth/refresh` | Swap a refresh token for a new access token. |
| `POST` | `/auth/logout` | Invalidate the refresh token. |
| `GET` | `/auth/me` | Current user's profile and ring level. |

---

## Sources

These are the admin-side endpoints for connecting data sources. Webhook receipt has a hard 2-second response requirement — hand off to the queue immediately and do nothing else in the handler.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/sources/github/connect` | Complete GitHub OAuth flow; store token; return available repos. |
| `GET` | `/sources/github/repos` | List repos available to connect for this org. |
| `POST` | `/sources/github/repos/{repo_id}/enable` | Start ingestion for a repo. |
| `POST` | `/sources/slack/connect` | Complete Slack OAuth flow; start channel sync. |
| `GET` | `/sources/status` | Sync status for all connected sources (last synced, error state). |
| `POST` | `/sources/{source}/webhook` | Inbound webhook from Dolphin's connectors. Must `200` within 2 s. |

---

## Knowledge

The core read/write surface for knowledge nodes. Note that `/knowledge/search` is **not** the main query path — it returns raw node matches for the admin view only. Engineers asking questions go through `POST /query`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/knowledge/systems` | Systems the requester can access, scoped to their ring and domain. |
| `GET` | `/knowledge/systems/{system_id}` | System detail: coverage score, ownership breakdown. |
| `GET` | `/knowledge/nodes/{node_id}` | A single knowledge node with its source citations. Ring-gated. |
| `GET` | `/knowledge/search?q=` | Raw keyword search over nodes — admin view only, not the conversational interface. |
| `PATCH` | `/knowledge/nodes/{node_id}` | Update a claim (attributed person or their manager only). Creates a new version; old one is superseded, not overwritten. |
| `DELETE` | `/knowledge/nodes/{node_id}/attribution` | Strip a person's name from a node. Content stays; attribution goes. Requires the attributed person or Ring 5. |

---

## Engineers

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/engineers/{person_id}/profile` | Owned systems, recent commits, significant PRs, gap score. Ring 1 can only fetch their own. |
| `GET` | `/engineers/{person_id}/knowledge-gaps` | Ordered gap targets for this engineer — this is what the interview agent uses to build its question list. |
| `GET` | `/engineers/{person_id}/interviews` | Interview history for this person. |

---

## Interviews

The interview flow is: create → exchange messages → review extractions → approve. Nothing hits the graph until `POST /approve` is called.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/interviews` | Create an interview. Body: `person_id`, `trigger_type`. Ring 3 or the engineer themselves. |
| `GET` | `/interviews/{interview_id}` | Current interview state, message thread, targets addressed so far. |
| `POST` | `/interviews/{interview_id}/message` | Send an engineer's answer; get back the next question or a completion signal. |
| `GET` | `/interviews/{interview_id}/extractions` | Pending knowledge claims waiting for the engineer to review. |
| `POST` | `/interviews/{interview_id}/approve` | Engineer approves (and optionally edits) a list of claim IDs. Triggers the graph write. |
| `PUT` | `/interviews/{interview_id}/extractions/{extraction_id}` | Edit a specific claim before approving the batch. |
| `DELETE` | `/interviews/{interview_id}/extractions/{extraction_id}` | Remove a claim from the queue — it will never be written to the graph. |

---

## Dashboard

All dashboard endpoints require Ring 3 minimum.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/dashboard/knowledge-health` | Coverage scores by system for the requester's domain. |
| `GET` | `/dashboard/bus-factor` | Engineers who are single points of failure on their systems. |
| `GET` | `/dashboard/stale-knowledge` | Systems with decayed confidence scores that need attention. |
| `GET` | `/dashboard/interview-recommendations` | Auto-generated recommendations from the staleness engine. |
| `POST` | `/persons/{person_id}/flag-departure` | Mark an engineer as departing; immediately schedules a priority interview, bypassing the normal 6-week fatigue guard. |

---

## Query

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/query` | The main user-facing endpoint. Takes a natural language question, passes it through Tansiq's retrieval pipeline with the requester's ring + domain context, and returns a grounded answer with citations. |

---

## Ring levels for reference

| Ring | Role |
|------|------|
| 1 | Individual Contributor |
| 2 | Senior Engineer / Tech Lead |
| 3 | Engineering Manager |
| 4 | VP Engineering / CTO |
| 5 | CISO / Legal / Compliance |
