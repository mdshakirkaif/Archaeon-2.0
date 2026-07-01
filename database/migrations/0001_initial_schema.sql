-- =============================================================================
-- Archaeon — Master Migration File
-- File: /database/migrations/001_initial_schema.sql
-- Owner: Michelle (Data Architecture and Graph)
-- =============================================================================
-- Run this file once against a fresh PostgreSQL database to create the entire
-- Archaeon schema. Tables are ordered by dependency — tables referenced by
-- foreign keys are always created before the tables that reference them.
--
-- Prerequisites:
--   1. A PostgreSQL database named 'archaeon' must exist
--   2. The pgvector extension must be available (included in pgvector/pgvector:pg16 Docker image)
--
-- To run:
--   psql -h localhost -p 5433 -U postgres -d archaeon -f 001_initial_schema.sql
-- =============================================================================


-- =============================================================================
-- EXTENSIONS
-- =============================================================================
-- pgvector: enables the vector(1536) column type used in knowledge_node_embeddings
-- for semantic similarity search across knowledge nodes.

CREATE EXTENSION IF NOT EXISTS vector;


-- =============================================================================
-- GROUP A — CORE IDENTITY
-- =============================================================================
-- These four tables are the foundation. Every other table in the schema
-- either references organizations or persons directly, or references something
-- that eventually traces back to them. Create these first.


-- organizations
-- The top-level tenant. Every person, repository, system, and piece of
-- knowledge belongs to exactly one organization. This is what allows Archaeon
-- to host multiple separate companies' data in one database safely.
CREATE TABLE organizations (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    slug        TEXT        UNIQUE NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    settings    JSONB       DEFAULT '{}'
);


-- teams
-- A team within an organization. Supports nesting via parent_team_id —
-- a team can belong to another team (e.g. "Backend" inside "Engineering").
CREATE TABLE teams (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID    NOT NULL REFERENCES organizations(id),
    name            TEXT    NOT NULL,
    parent_team_id  UUID    REFERENCES teams(id)
);


-- persons
-- Every engineer, manager, or stakeholder in the system.
-- ring_level (1-5) is the access tier that drives all ABAC visibility rules —
-- every API query filters results based on this value.
CREATE TABLE persons (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID        NOT NULL REFERENCES organizations(id),
    name            TEXT        NOT NULL,
    email           TEXT        UNIQUE NOT NULL,
    role            TEXT,
    ring_level      INTEGER     CHECK (ring_level BETWEEN 1 AND 5),
    team_id         UUID        REFERENCES teams(id),
    joined_at       TIMESTAMPTZ,
    departed_at     TIMESTAMPTZ,
    is_active       BOOLEAN     DEFAULT TRUE
);


-- consent_records
-- One row per person storing their consent preferences.
-- If passive_capture_consented is false, commits are still indexed for
-- system-level knowledge but the person's name is never attributed.
-- If revoked_at is set, the person's name must be anonymised within 24 hours.
CREATE TABLE consent_records (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id                   UUID        NOT NULL REFERENCES persons(id),
    passive_capture_consented   BOOLEAN     DEFAULT TRUE,
    interview_consented         BOOLEAN     DEFAULT TRUE,
    ring_visibility             INTEGER     DEFAULT 3,
    consented_at                TIMESTAMPTZ DEFAULT NOW(),
    revoked_at                  TIMESTAMPTZ
);


-- =============================================================================
-- GROUP B — SOURCE DATA
-- =============================================================================
-- Raw events ingested by Dolphin's connectors before being processed into
-- knowledge. Nothing here is interpreted or summarised — it is the unmodified
-- record of what happened in GitHub, Slack, and Jira.


-- repositories
-- A GitHub repository connected to the system by an organization.
CREATE TABLE repositories (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID        NOT NULL REFERENCES organizations(id),
    github_repo_id  BIGINT      NOT NULL,
    name            TEXT        NOT NULL,
    full_name       TEXT        NOT NULL,
    default_branch  TEXT,
    connected_at    TIMESTAMPTZ DEFAULT NOW(),
    last_synced_at  TIMESTAMPTZ
);


-- commits
-- A single Git commit. author_person_id is nullable because not every commit
-- author email will match a known person in the system.
CREATE TABLE commits (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id             UUID        NOT NULL REFERENCES repositories(id),
    sha                 TEXT        NOT NULL,
    author_person_id    UUID        REFERENCES persons(id),
    authored_at         TIMESTAMPTZ,
    message             TEXT,
    files_changed       JSONB,
    additions           INTEGER,
    deletions           INTEGER,
    is_merge_commit     BOOLEAN     DEFAULT FALSE
);


-- pull_requests
-- A GitHub pull request. significance_score is computed by Kaif's pipeline —
-- higher scores indicate this PR is more likely to contain a notable decision.
-- reviewer_ids is a Postgres array of person UUIDs.
CREATE TABLE pull_requests (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id             UUID        NOT NULL REFERENCES repositories(id),
    github_pr_id        BIGINT      NOT NULL,
    number              INTEGER     NOT NULL,
    title               TEXT,
    body                TEXT,
    author_person_id    UUID        REFERENCES persons(id),
    created_at          TIMESTAMPTZ,
    merged_at           TIMESTAMPTZ,
    state               TEXT,
    significance_score  FLOAT,
    reviewer_ids        UUID[]
);


-- pr_review_comments
-- A single comment on a pull request. in_reply_to_id is a self-reference
-- that allows comment threads to be reconstructed.
CREATE TABLE pr_review_comments (
    id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    pr_id               UUID    NOT NULL REFERENCES pull_requests(id),
    author_person_id    UUID    REFERENCES persons(id),
    body                TEXT,
    created_at          TIMESTAMPTZ,
    in_reply_to_id      UUID    REFERENCES pr_review_comments(id)
);


-- slack_messages
-- A Slack message or thread root. The full thread (all replies) is stored
-- as a JSONB array in thread_messages so it can be retrieved in one query.
CREATE TABLE slack_messages (
    id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID    NOT NULL REFERENCES organizations(id),
    channel_id          TEXT    NOT NULL,
    thread_ts           TEXT,
    author_person_id    UUID    REFERENCES persons(id),
    body                TEXT,
    created_at          TIMESTAMPTZ,
    reply_count         INTEGER DEFAULT 0,
    thread_messages     JSONB
);


-- jira_issues
-- A Jira ticket. comments stores the full comment history as a JSONB array.
CREATE TABLE jira_issues (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID    NOT NULL REFERENCES organizations(id),
    issue_key       TEXT    NOT NULL,
    title           TEXT,
    description     TEXT,
    type            TEXT,
    status          TEXT,
    resolution      TEXT,
    created_at      TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ,
    comment_count   INTEGER DEFAULT 0,
    comments        JSONB
);


-- =============================================================================
-- GROUP C — KNOWLEDGE
-- =============================================================================
-- The core intelligence layer. knowledge_nodes is the most important table
-- in the entire system — every decision, risk, dependency, constraint, or
-- lesson learned is stored here. Nothing is ever deleted: when a fact changes,
-- a new row is created and the old one is marked superseded.


-- systems
-- A logical system or service (e.g. "Auth Service", "Payment Pipeline").
-- Not files — systems. knowledge_coverage_score tracks how well-documented
-- this system currently is.
CREATE TABLE systems (
    id                          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                      UUID    NOT NULL REFERENCES organizations(id),
    name                        TEXT    NOT NULL,
    description                 TEXT,
    domain                      TEXT,
    criticality_score           FLOAT,
    knowledge_coverage_score    FLOAT
);


-- system_components
-- Maps files and directories to a system, discovered via co-change patterns.
-- file_paths is a Postgres array of file path strings.
CREATE TABLE system_components (
    id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    system_id               UUID    NOT NULL REFERENCES systems(id),
    file_paths              TEXT[],
    co_change_correlation   FLOAT
);


-- ownership_records
-- Computed ownership of a system by a person, derived from commit history.
-- ownership_pct is a float between 0 and 1 representing share of ownership.
CREATE TABLE ownership_records (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id       UUID        NOT NULL REFERENCES persons(id),
    system_id       UUID        NOT NULL REFERENCES systems(id),
    ownership_pct   FLOAT,
    computed_at     TIMESTAMPTZ DEFAULT NOW(),
    decay_weight    FLOAT
);


-- knowledge_nodes
-- The single most important table in Archaeon. Every piece of captured
-- knowledge lives here. node_type must be one of five values.
-- superseded_by_id is a self-reference: when a fact is updated, a new row
-- is inserted and the old row's superseded_by_id points to the new one.
-- This preserves full version history — nothing is ever deleted or overwritten.
CREATE TABLE knowledge_nodes (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                  UUID        NOT NULL REFERENCES organizations(id),
    system_id               UUID        REFERENCES systems(id),
    node_type               TEXT        CHECK (node_type IN (
                                            'DECISION',
                                            'RISK',
                                            'DEPENDENCY',
                                            'CONSTRAINT',
                                            'LESSON'
                                        )),
    claim_text              TEXT        NOT NULL,
    rationale               TEXT,
    confidence_score        FLOAT,
    version_number          INTEGER     DEFAULT 1,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    superseded_at           TIMESTAMPTZ,
    superseded_by_id        UUID        REFERENCES knowledge_nodes(id),
    approved_by_person_id   UUID        REFERENCES persons(id),
    approved_at             TIMESTAMPTZ,
    source_type             TEXT,
    source_id               UUID,
    visibility_level        INTEGER,
    domain                  TEXT
);


-- knowledge_node_embeddings
-- Stores the pgvector embedding for each knowledge node.
-- embedding is a 1536-dimension vector — the dimension must match whatever
-- embedding model Kaif uses (confirmed as vector(1536) per the project brief).
-- Kept as a separate table to avoid slowing down relational queries on
-- knowledge_nodes with large vector data.
CREATE TABLE knowledge_node_embeddings (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id         UUID        NOT NULL REFERENCES knowledge_nodes(id),
    embedding       vector(1536),
    model_version   TEXT
);

-- Index for fast cosine similarity search across all embeddings.
-- ivfflat organises vectors into clusters for approximate nearest-neighbour
-- search — much faster than exact search at scale.
CREATE INDEX ON knowledge_node_embeddings USING ivfflat (embedding vector_cosine_ops);


-- alternatives_considered
-- Other approaches that were considered and rejected when making a decision.
-- Always a child of a knowledge_node with node_type = 'DECISION'.
CREATE TABLE alternatives_considered (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id         UUID    NOT NULL REFERENCES knowledge_nodes(id),
    description     TEXT,
    reason_rejected TEXT
);


-- risks_on_decisions
-- Risks specifically identified as being tied to a particular decision node.
CREATE TABLE risks_on_decisions (
    id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id             UUID    NOT NULL REFERENCES knowledge_nodes(id),
    risk_description    TEXT
);


-- =============================================================================
-- GROUP D — INTERVIEWS
-- =============================================================================
-- Tables that track the interview agent's conversations with engineers,
-- from scheduling through to the knowledge claims it extracts and the
-- engineer's approval of those claims.


-- interviews
-- One knowledge-capture interview session. trigger_type describes why the
-- interview was scheduled; status tracks where it is in the lifecycle.
CREATE TABLE interviews (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID        NOT NULL REFERENCES organizations(id),
    person_id           UUID        NOT NULL REFERENCES persons(id),
    trigger_type        TEXT        CHECK (trigger_type IN (
                                        'OFFBOARDING',
                                        'GAP',
                                        'MILESTONE',
                                        'INCIDENT',
                                        'QUARTERLY',
                                        'MANAGER'
                                    )),
    status              TEXT        CHECK (status IN (
                                        'scheduled',
                                        'in_progress',
                                        'completed',
                                        'cancelled'
                                    )) DEFAULT 'scheduled',
    scheduled_at        TIMESTAMPTZ,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    target_count        INTEGER,
    targets_addressed   INTEGER     DEFAULT 0
);


-- interview_targets
-- A specific knowledge gap this interview is trying to fill.
-- Each interview typically has several targets.
CREATE TABLE interview_targets (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id    UUID    NOT NULL REFERENCES interviews(id),
    system_id       UUID    REFERENCES systems(id),
    gap_description TEXT,
    priority        INTEGER,
    status          TEXT    CHECK (status IN ('open', 'addressed', 'skipped'))
                            DEFAULT 'open'
);


-- interview_messages
-- One message in the interview transcript.
-- role is either 'agent' (the AI) or 'engineer' (the human being interviewed).
CREATE TABLE interview_messages (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id            UUID        NOT NULL REFERENCES interviews(id),
    role                    TEXT        CHECK (role IN ('agent', 'engineer')),
    content                 TEXT,
    sent_at                 TIMESTAMPTZ DEFAULT NOW(),
    referenced_artifacts    JSONB
);


-- interview_extractions
-- A knowledge claim extracted from an interview, pending engineer approval.
-- node_id points to the resulting knowledge_node once the engineer approves.
-- This is the bridge between the interview layer and the knowledge layer.
CREATE TABLE interview_extractions (
    id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id            UUID    NOT NULL REFERENCES interviews(id),
    node_id                 UUID    REFERENCES knowledge_nodes(id),
    extraction_confidence   FLOAT,
    approved_by_person_id   UUID    REFERENCES persons(id)
);


-- =============================================================================
-- GROUP E — OPERATIONS
-- =============================================================================


-- event_queue
-- Central Postgres-backed job queue (the event bus).
-- Dolphin writes canonical events here. Kamya's worker reads and processes them.
-- Improved by Dolphin's migration contribution: added CHECK constraints on
-- source, event_type, and status; NOT NULL enforcement; three performance indexes.
CREATE TABLE IF NOT EXISTS event_queue (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id     TEXT        NOT NULL,
    source       TEXT        NOT NULL
                             CHECK (source IN (
                                 'github', 'slack', 'jira',
                                 'linear', 'notion', 'confluence'
                             )),
    event_type   TEXT        NOT NULL
                             CHECK (event_type IN (
                                 'commit_pushed',
                                 'pr_opened', 'pr_merged', 'pr_closed', 'pr_reopened',
                                 'pr_comment_added', 'pr_review_submitted',
                                 'repository_created', 'repository_deleted',
                                 'message_posted', 'message_thread_completed',
                                 'issue_created', 'issue_updated', 'issue_commented',
                                 'page_updated'
                             )),
    payload      JSONB       NOT NULL,
    status       TEXT        NOT NULL DEFAULT 'queued'
                             CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    picked_up_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    retry_count  INT         NOT NULL DEFAULT 0
                             CHECK (retry_count >= 0),
    last_error   TEXT
);

-- Deduplication: enforces that (source, event_id) is unique across all statuses.
CREATE UNIQUE INDEX IF NOT EXISTS uq_event_queue_source_event_id
    ON event_queue (source, event_id);

-- Worker poll index: Kamya's worker queries WHERE status = 'queued' ORDER BY created_at ASC.
CREATE INDEX IF NOT EXISTS idx_event_queue_queued_created
    ON event_queue (created_at ASC)
    WHERE status = 'queued';

-- Watchdog index: detects stuck jobs WHERE status = 'processing' AND picked_up_at < now - 10min.
CREATE INDEX IF NOT EXISTS idx_event_queue_processing_picked_up
    ON event_queue (picked_up_at)
    WHERE status = 'processing';

COMMENT ON TABLE event_queue IS
    'Central event bus. Dolphin writes canonical events here. '
    'Kamya''s processing worker reads and processes them. '
    'Deduplication enforced at both application and database layer. '
    'Watchdog resets stuck processing jobs after 10 minutes.';


-- llm_call_logs
-- Every LLM API call is logged here. Kaif's extraction pipeline writes to
-- this table. Includes the full input prompt, output, token counts, and latency.
CREATE TABLE llm_call_logs (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID        NOT NULL REFERENCES organizations(id),
    call_type           TEXT,
    model               TEXT,
    input_tokens        INTEGER,
    output_tokens       INTEGER,
    latency_ms          INTEGER,
    called_at           TIMESTAMPTZ DEFAULT NOW(),
    input_prompt        TEXT,
    output              TEXT,
    retrieved_context   JSONB,
    session_id          UUID
);


-- staleness_events
-- Written by the staleness engine when it decays confidence scores for a system.
-- Kamya's interview scheduler reads this table to decide which interviews
-- to recommend next.
CREATE TABLE staleness_events (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    system_id               UUID        NOT NULL REFERENCES systems(id),
    triggered_at            TIMESTAMPTZ DEFAULT NOW(),
    change_severity         FLOAT,
    nodes_decayed           INTEGER,
    decay_factor_applied    FLOAT
);


-- audit_log
-- APPEND-ONLY. Every access and every write is permanently recorded here.
-- This is a legal and compliance requirement.
-- No row in this table should ever be updated or deleted once written.
-- This must be enforced at the application layer (Kamya's backend API).
CREATE TABLE audit_log (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID        NOT NULL REFERENCES organizations(id),
    actor_person_id     UUID        REFERENCES persons(id),
    action              TEXT,
    resource_type       TEXT,
    resource_id         UUID,
    details             JSONB,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================================
-- ADDITIONAL TABLES — Graph edge support
-- =============================================================================
-- These two tables are not explicitly listed in the brief's Postgres table list,
-- but were added to back the DEPENDS_ON and Incident graph edges in Apache AGE.
-- Confirmed with team: system_dependencies and incidents remain as permanent
-- Postgres tables per teammate review feedback.


-- system_dependencies
-- Records that System A depends on System B.
-- Backs the DEPENDS_ON edge in the Apache AGE graph layer.
CREATE TABLE system_dependencies (
    id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    system_id               UUID    NOT NULL REFERENCES systems(id),
    depends_on_system_id    UUID    NOT NULL REFERENCES systems(id),
    dependency_type         TEXT,
    strength                FLOAT
);


-- incidents
-- A discrete incident or outage.
-- Backs the Incident vertex and CAUSED / RESOLVED_BY / TRIGGERED edges
-- in the Apache AGE graph layer.
CREATE TABLE incidents (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                  UUID        NOT NULL REFERENCES organizations(id),
    system_id               UUID        REFERENCES systems(id),
    name                    TEXT        NOT NULL,
    occurred_at             TIMESTAMPTZ,
    severity                TEXT,
    resolved_by_person_id   UUID        REFERENCES persons(id)
);


-- connector_checkpoints
-- Dolphin's bookmark system. Every time a connector finishes processing
-- GitHub, Slack, or Jira data, it saves its position here. If the system
-- crashes and restarts, it reads this table and resumes exactly where it
-- left off instead of reprocessing everything from the beginning.
-- Owned by Dolphin. Defined here per her migration contribution.
CREATE TABLE IF NOT EXISTS connector_checkpoints (
    connector_key       TEXT        PRIMARY KEY,
    checkpoint_value    TEXT        NOT NULL,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE connector_checkpoints IS
    'Stores the last successfully processed cursor per connector. '
    'Allows all connectors to resume from where they left off after '
    'crashes, restarts, or rate-limit pauses. Owned by Dolphin.';


-- =============================================================================
-- END OF MIGRATION
-- Total tables: 28
-- Groups: Core Identity (4), Source Data (6), Knowledge (7),
--         Interviews (4), Operations (4), Graph support (2),
--         Dolphin connector (1)
-- Extensions: vector (pgvector)
-- =============================================================================