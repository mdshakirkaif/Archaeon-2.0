from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional


# ──────────────────────────────────────────────
# Enums — Fixed sets specified exactly in the brief
# ──────────────────────────────────────────────

class EventSource(str, Enum):
    GITHUB     = "github"
    SLACK      = "slack"
    JIRA       = "jira"
    LINEAR     = "linear"
    NOTION     = "notion"
    CONFLUENCE = "confluence"


class EventType(str, Enum):
    # GitHub explicit webhooks 
    COMMIT_PUSHED        = "commit_pushed"
    PR_OPENED            = "pr_opened"
    PR_CLOSED            = "pr_closed"
    PR_MERGED            = "pr_merged"
    PR_REOPENED          = "pr_reopened"
    PR_COMMENT_ADDED     = "pr_comment_added"
    PR_REVIEW_SUBMITTED  = "pr_review_submitted"
    REPOSITORY_CREATED   = "repository_created"
    REPOSITORY_DELETED   = "repository_deleted"
    
    # Slack 
    MESSAGE_POSTED           = "message_posted"
    MESSAGE_THREAD_COMPLETED = "message_thread_completed"
    
    # Jira / Linear 
    ISSUE_CREATED        = "issue_created"
    ISSUE_UPDATED        = "issue_updated"
    ISSUE_COMMENTED      = "issue_commented"
    
    # Notion / Confluence 
    PAGE_UPDATED         = "page_updated"


# ──────────────────────────────────────────────
# Sub-objects
# ──────────────────────────────────────────────

@dataclass
class Actor:
    """Who performed the action. Nullable for automated / system events."""
    source_user_id: str
    display_name: str
    email: Optional[str] = None  # Not always available 


@dataclass
class EntityRef:
    """
    The primary entity this event relates to.
    Dynamic map matching: repo_id (GitHub), channel_id (Slack), issue_key (Jira).
    """
    id: str  # The actual underlying ID/Key string (e.g., "repo-123" or "PROJ-456")
    type: str  # "repo_id", "channel_id", "issue_key", "page_id"


# ──────────────────────────────────────────────
# The canonical event itself
# ──────────────────────────────────────────────

@dataclass
class CanonicalEvent:
    """
    Every connector normalizes its source payload into this structure 
    before pushing to the event bus queue[cite: 147].
    """
    event_id: str             # Source-specific unique identifier for deduplication [cite: 141, 149]
    source: EventSource       # External system enum 
    event_type: EventType     # Normalized event type enum 
    occurred_at: datetime     # ISO timestamp source system origin 
    content: dict[str, Any]   # Payload structure tailored by event type 
    entity_ref: EntityRef     # Primary entity reference pointer 
    actor: Optional[Actor] = None  # User context block (Null for system events) 
    metadata: dict[str, Any] = field(default_factory=dict)     # Source extras 
    raw_payload: dict[str, Any] = field(default_factory=dict)  # Verbatim payload debugging 

    def to_dict(self) -> dict[str, Any]:
        """
        Serialize to a plain dict suitable for storing as JSONB in Postgres.
        Converts datetime instances directly to clean ISO-8601 strings.
        """
        def _ser(obj: Any) -> Any:
            if isinstance(obj, datetime):
                return obj.isoformat()
            if isinstance(obj, Enum):
                return obj.value
            if hasattr(obj, "__dataclass_fields__"):
                return {k: _ser(v) for k, v in obj.__dict__.items()}
            if isinstance(obj, dict):
                return {k: _ser(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [_ser(i) for i in obj]
            return obj

        return _ser(self.__dict__)