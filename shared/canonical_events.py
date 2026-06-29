from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional


# ---------------------------------------------------------------------------
# Enums — fixed value sets agreed with Kamya on day one
# ---------------------------------------------------------------------------

class EventSource(str, Enum):
    GITHUB     = "github"
    SLACK      = "slack"
    JIRA       = "jira"
    LINEAR     = "linear"
    NOTION     = "notion"
    CONFLUENCE = "confluence"


class EventType(str, Enum):
    # GitHub
    COMMIT_PUSHED            = "commit_pushed"
    PR_OPENED                = "pr_opened"
    PR_MERGED                = "pr_merged"
    PR_CLOSED                = "pr_closed"
    PR_REOPENED              = "pr_reopened"
    PR_COMMENT_ADDED         = "pr_comment_added"
    PR_REVIEW_SUBMITTED      = "pr_review_submitted"
    REPOSITORY_CREATED       = "repository_created"
    REPOSITORY_DELETED       = "repository_deleted"
    # Slack
    MESSAGE_POSTED           = "message_posted"
    MESSAGE_THREAD_COMPLETED = "message_thread_completed"
    # Jira / Linear
    ISSUE_CREATED            = "issue_created"
    ISSUE_UPDATED            = "issue_updated"
    ISSUE_COMMENTED          = "issue_commented"
    # Notion / Confluence
    PAGE_UPDATED             = "page_updated"


class QueueStatus(str, Enum):
    QUEUED     = "queued"
    PROCESSING = "processing"
    COMPLETED  = "completed"
    FAILED     = "failed"


# ---------------------------------------------------------------------------
# Sub-objects inside the canonical event
# ---------------------------------------------------------------------------

@dataclass
class Actor:
    """
    Who performed the action.
    Nullable for automated / system events (e.g. a bot merge).
    """
    source_user_id: str           # The user ID as it exists in the source system
    display_name:   str           # Human-readable name
    email: Optional[str] = None   # Email if the source exposes it; else None


@dataclass
class EntityRef:
    """
    The primary entity this event relates to.
    Only the relevant field is populated; the rest are None.
    """
    repo_id:    Optional[str] = None   # GitHub: repository node_id
    channel_id: Optional[str] = None   # Slack: channel ID
    issue_key:  Optional[str] = None   # Jira: issue key e.g. "ENG-123"
    page_id:    Optional[str] = None   # Notion / Confluence page ID
    linear_id:  Optional[str] = None   # Linear issue ID


@dataclass
class CanonicalEvent:
    """
    The single normalized event structure pushed to event_queue.

    Every connector MUST produce this exact structure.
    The processing pipeline never sees source-specific formats.

    Fields
    ------
    event_id      : Source-system unique ID used for deduplication.
                    GitHub  -> commit SHA or PR node_id
                    Slack   -> message ts (e.g. "1694000000.123456")
                    Jira    -> issue_key + "-" + comment_id
                    Linear  -> issue id or comment id
                    Notion  -> page_id + "-" + last_edited_time
    source        : Which external system produced this event.
    event_type    : What kind of thing happened (fixed enum above).
    occurred_at   : When the event happened IN THE SOURCE SYSTEM.
                    Not when we received it.
    actor         : Who did this. Nullable for system/bot events.
    entity_ref    : The primary object this event is about.
    content       : The actual textual / structured content we want extracted.
                    Shape varies by event_type — see connector modules for
                    the exact keys each connector populates.
    metadata      : Source-specific extras useful for extraction context
                    (PR number, repo name, issue type, reply count...).
    raw_payload   : The original source payload stored verbatim.
                    Used for debugging and reprocessing without data loss.
    """
    event_id:    str
    source:      EventSource
    event_type:  EventType
    occurred_at: datetime
    entity_ref:  EntityRef
    content:     dict[str, Any]
    metadata:    dict[str, Any]
    raw_payload: dict[str, Any]
    actor:       Optional[Actor] = None

    def to_dict(self) -> dict[str, Any]:
        """Serialize to a plain dict suitable for storing as JSONB in Postgres."""
        return {
            "event_id":    self.event_id,
            "source":      self.source.value,
            "event_type":  self.event_type.value,
            "occurred_at": self.occurred_at.isoformat(),
            "actor": {
                "source_user_id": self.actor.source_user_id,
                "display_name":   self.actor.display_name,
                "email":          self.actor.email,
            } if self.actor else None,
            "entity_ref": {
                "repo_id":    self.entity_ref.repo_id,
                "channel_id": self.entity_ref.channel_id,
                "issue_key":  self.entity_ref.issue_key,
                "page_id":    self.entity_ref.page_id,
                "linear_id":  self.entity_ref.linear_id,
            },
            "content":     self.content,
            "metadata":    self.metadata,
            "raw_payload": self.raw_payload,
        }