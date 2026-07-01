"""
github_client.py
----------------
GitHub connector for Archaeon. Dolphin's responsibility.

Captures ALL meaningful GitHub activity — not just commits.
Every event that could contain an architectural decision, technical
discussion, or knowledge signal is captured and normalized.

Webhook events handled:
  push                        -> commits pushed to any branch
  pull_request                -> opened, closed, merged, reopened
  pull_request_review         -> review submitted (approved / changes requested)
  pull_request_review_comment -> inline code comment on a specific diff line
  issue_comment               -> general comment on a PR conversation
  create                      -> branch or tag created
  delete                      -> branch or tag deleted
  repository                  -> repo created or deleted

Called by Kamya's FastAPI webhook endpoint. Kamya calls:
  1. verify_github_signature()         — check request is genuinely from GitHub
  2. handle_github_webhook_payload()   — normalize + enqueue

Imports match your actual repo structure:
  from shared.canonical_events import ...   (note: plural)
  from integrations.event_bus import enqueue
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional

import httpx

from shared.canonical_events import (
    Actor,
    CanonicalEvent,
    EntityRef,
    EventSource,
    EventType,
)
from integrations.event_bus import enqueue

logger = logging.getLogger(__name__)

GITHUB_TOKEN          = os.environ.get("GITHUB_TOKEN", "")
GITHUB_WEBHOOK_SECRET = os.environ.get("GITHUB_WEBHOOK_SECRET", "")
GITHUB_API_BASE       = "https://api.github.com"
GITHUB_API_VERSION    = "2022-11-28"


# ---------------------------------------------------------------------------
# HTTP headers
# ---------------------------------------------------------------------------

def _github_headers() -> dict[str, str]:
    return {
        "Authorization":        f"Bearer {GITHUB_TOKEN}",
        "Accept":               "application/vnd.github+json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
    }


# ---------------------------------------------------------------------------
# Webhook signature verification
# Called by Kamya's endpoint before anything else
# ---------------------------------------------------------------------------

def verify_github_signature(body: bytes, signature_header: Optional[str]) -> bool:
    """
    Verify that the webhook POST genuinely came from GitHub.

    GitHub signs every webhook body with HMAC-SHA256 using the secret
    set when the webhook was registered. Signature arrives in header
    X-Hub-Signature-256 as "sha256=<hex_digest>".

    Returns True if valid. Returns False if invalid — Kamya's endpoint
    should return 401 in that case and not process the payload.

    If GITHUB_WEBHOOK_SECRET is not set (local dev only), skips check
    with a warning. Never skip in production.
    """
    if not GITHUB_WEBHOOK_SECRET:
        logger.warning("GITHUB_WEBHOOK_SECRET not set — skipping signature check (dev only)")
        return True

    if not signature_header or not signature_header.startswith("sha256="):
        return False

    expected = "sha256=" + hmac.new(
        GITHUB_WEBHOOK_SECRET.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected, signature_header)


# ---------------------------------------------------------------------------
# Shared datetime parser
# ---------------------------------------------------------------------------

def _parse_dt(value: str) -> datetime:
    """
    Parse an ISO 8601 string from GitHub into a UTC datetime.
    GitHub uses "Z" suffix — Python's fromisoformat needs "+00:00".
    Falls back to now() if the string is missing or malformed.
    """
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Canonical event builders — one per GitHub event type
# ---------------------------------------------------------------------------

def build_commit_event(
    commit: dict[str, Any],
    repo:   dict[str, Any],
) -> CanonicalEvent:
    """
    Normalize a full GitHub commit detail object into a CanonicalEvent.

    Requires the DETAIL endpoint response (/repos/{owner}/{repo}/commits/{sha})
    not the lightweight list response — because only the detail endpoint
    includes per-file patch diffs and stats.

    event_id   = commit SHA (unique, used for deduplication)
    occurred_at = authored_date from the commit (source time, not receive time)
    content    = message + diff summary + per-file patch data
    """
    commit_data = commit.get("commit", {})
    author_info = commit.get("author") or {}    # GitHub user object (None if unlinked)
    files       = commit.get("files") or []

    return CanonicalEvent(
        event_id    = commit["sha"],
        source      = EventSource.GITHUB,
        event_type  = EventType.COMMIT_PUSHED,
        occurred_at = _parse_dt(commit_data.get("author", {}).get("date", "")),
        actor = Actor(
            source_user_id = str(author_info.get("id", "")),
            display_name   = (
                author_info.get("login")
                or commit_data.get("author", {}).get("name", "")
            ),
            email = commit_data.get("author", {}).get("email"),
        ) if (author_info or commit_data.get("author")) else None,
        entity_ref = EntityRef(repo_id=str(repo.get("id", ""))),
        content = {
            "message": commit_data.get("message", ""),
            "diff_summary": (
                f"+{commit.get('stats', {}).get('additions', 0)} "
                f"-{commit.get('stats', {}).get('deletions', 0)} lines "
                f"across {len(files)} file(s)"
            ),
            "files_changed": [
                {
                    "filename":  f.get("filename"),
                    "status":    f.get("status"),       # added/modified/removed/renamed
                    "additions": f.get("additions", 0),
                    "deletions": f.get("deletions", 0),
                    "patch":     f.get("patch"),         # full diff text for this file
                }
                for f in files
            ],
        },
        metadata = {
            "repo_name":   repo.get("full_name", ""),
            "sha":         commit["sha"],
            "parent_shas": [p["sha"] for p in commit.get("parents", [])],
            # 2+ parents = merge commit (merging two branches)
            "is_merge_commit": len(commit.get("parents", [])) > 1,
        },
        raw_payload = commit,
    )


def build_pr_event(
    pr:              dict[str, Any],
    repo:            dict[str, Any],
    event_type:      EventType,
    review_comments: list[dict] = None,
    issue_comments:  list[dict] = None,
    files_changed:   list[dict] = None,
) -> CanonicalEvent:
    """
    Normalize a GitHub pull request into a CanonicalEvent.

    Merges review comments (inline diff comments) and issue comments
    (general PR conversation) into one chronological list so Kaif's
    extractor sees the full discussion in order.

    event_id = PR node_id (GitHub's stable global ID — survives PR edits)
    """
    review_comments = review_comments or []
    issue_comments  = issue_comments  or []
    files_changed   = files_changed   or []
    author          = pr.get("user") or {}

    all_comments = sorted(
        [
            {
                "type":        "review_comment",
                "author":      c.get("user", {}).get("login", ""),
                "body":        c.get("body", ""),
                "created_at":  c.get("created_at", ""),
                "in_reply_to": c.get("in_reply_to_id"),
                "path":        c.get("path"),       # which file this comment is on
                "diff_hunk":   c.get("diff_hunk"),  # the code being discussed
            }
            for c in review_comments
        ] + [
            {
                "type":        "issue_comment",
                "author":      c.get("user", {}).get("login", ""),
                "body":        c.get("body", ""),
                "created_at":  c.get("created_at", ""),
                "in_reply_to": None,
                "path":        None,
                "diff_hunk":   None,
            }
            for c in issue_comments
        ],
        key=lambda c: c.get("created_at") or "",
    )

    return CanonicalEvent(
        event_id    = pr["node_id"],
        source      = EventSource.GITHUB,
        event_type  = event_type,
        occurred_at = _parse_dt(
            pr.get("merged_at") or pr.get("updated_at") or pr.get("created_at", "")
        ),
        actor = Actor(
            source_user_id = str(author.get("id", "")),
            display_name   = author.get("login", ""),
            email          = None,
        ) if author else None,
        entity_ref = EntityRef(repo_id=str(repo.get("id", ""))),
        content = {
            "title":   pr.get("title", ""),
            "body":    pr.get("body") or "",
            "comments": all_comments,
            "files_changed": [
                {
                    "filename":  f.get("filename"),
                    "status":    f.get("status"),
                    "additions": f.get("additions", 0),
                    "deletions": f.get("deletions", 0),
                    "patch":     f.get("patch"),
                }
                for f in files_changed
            ],
        },
        metadata = {
            "repo_name":           repo.get("full_name", ""),
            "pr_number":           pr.get("number"),
            "state":               pr.get("state"),
            "merged":              pr.get("merged", False),
            "merged_at":           pr.get("merged_at"),
            "requested_reviewers": [r.get("login") for r in pr.get("requested_reviewers", [])],
            "comment_count":       len(all_comments),
        },
        raw_payload = pr,
    )


def build_review_event(
    review: dict[str, Any],
    pr:     dict[str, Any],
    repo:   dict[str, Any],
) -> CanonicalEvent:
    """
    Normalize a PR review submission into a CanonicalEvent.

    A review is when someone hits "Submit review" on GitHub — they can
    APPROVE, REQUEST_CHANGES, or just COMMENT. This is different from
    individual review comments (which are per-line).

    event_id = unique string combining PR node_id + review id
               so it deduplicates correctly even if the webhook fires twice

    Why this matters: an APPROVE or CHANGES_REQUESTED review is a
    clear signal of a technical decision being validated or challenged.
    """
    reviewer = review.get("user") or {}

    return CanonicalEvent(
        event_id    = f"{pr.get('node_id', '')}:review:{review.get('id', '')}",
        source      = EventSource.GITHUB,
        event_type  = EventType.PR_REVIEW_SUBMITTED,
        occurred_at = _parse_dt(review.get("submitted_at", "")),
        actor = Actor(
            source_user_id = str(reviewer.get("id", "")),
            display_name   = reviewer.get("login", ""),
            email          = None,
        ) if reviewer else None,
        entity_ref = EntityRef(repo_id=str(repo.get("id", ""))),
        content = {
            "title": f"Review on PR #{pr.get('number')}: {pr.get('title', '')}",
            "body":  review.get("body") or "",    # the overall review summary comment
            # APPROVED / CHANGES_REQUESTED / COMMENTED
            "review_state": review.get("state", ""),
        },
        metadata = {
            "repo_name":   repo.get("full_name", ""),
            "pr_number":   pr.get("number"),
            "pr_title":    pr.get("title", ""),
            "review_id":   review.get("id"),
            "review_state": review.get("state", ""),
        },
        raw_payload = review,
    )


def build_review_comment_event(
    comment: dict[str, Any],
    pr:      dict[str, Any],
    repo:    dict[str, Any],
) -> CanonicalEvent:
    """
    Normalize an inline PR review comment into a CanonicalEvent.

    These are comments left on a specific line of a specific file in
    the diff — the most granular form of code review feedback.
    Often contain: "why did you do it this way?", "this should be X",
    "performance concern here" — all high-value knowledge signals.

    event_id = unique string combining PR node_id + comment id
    """
    commenter = comment.get("user") or {}

    return CanonicalEvent(
        event_id    = f"{pr.get('node_id', '')}:review_comment:{comment.get('id', '')}",
        source      = EventSource.GITHUB,
        event_type  = EventType.PR_COMMENT_ADDED,
        occurred_at = _parse_dt(comment.get("created_at", "")),
        actor = Actor(
            source_user_id = str(commenter.get("id", "")),
            display_name   = commenter.get("login", ""),
            email          = None,
        ) if commenter else None,
        entity_ref = EntityRef(repo_id=str(repo.get("id", ""))),
        content = {
            "title":     f"Code review comment on PR #{pr.get('number')}",
            "body":      comment.get("body", ""),
            "path":      comment.get("path", ""),       # file being commented on
            "diff_hunk": comment.get("diff_hunk", ""),  # the specific code being discussed
        },
        metadata = {
            "repo_name":     repo.get("full_name", ""),
            "pr_number":     pr.get("number"),
            "comment_id":    comment.get("id"),
            "in_reply_to":   comment.get("in_reply_to_id"),  # if this is a reply in a thread
            "is_reply":      comment.get("in_reply_to_id") is not None,
        },
        raw_payload = comment,
    )


def build_issue_comment_event(
    comment: dict[str, Any],
    issue:   dict[str, Any],
    repo:    dict[str, Any],
) -> CanonicalEvent:
    """
    Normalize a general PR conversation comment into a CanonicalEvent.

    GitHub fires issue_comment events for both Issues and PRs.
    We only capture the PR ones (issues with a pull_request field).
    These are the general "conversation" comments, not tied to a diff line.

    event_id = "issue_comment:{comment_id}" — unique per comment
    """
    commenter = comment.get("user") or {}

    return CanonicalEvent(
        event_id    = f"issue_comment:{comment.get('id', '')}",
        source      = EventSource.GITHUB,
        event_type  = EventType.PR_COMMENT_ADDED,
        occurred_at = _parse_dt(comment.get("created_at", "")),
        actor = Actor(
            source_user_id = str(commenter.get("id", "")),
            display_name   = commenter.get("login", ""),
            email          = None,
        ) if commenter else None,
        entity_ref = EntityRef(repo_id=str(repo.get("id", ""))),
        content = {
            "title": f"Comment on PR #{issue.get('number')}",
            "body":  comment.get("body", ""),
        },
        metadata = {
            "repo_name":  repo.get("full_name", ""),
            "pr_number":  issue.get("number"),
            "comment_id": comment.get("id"),
        },
        raw_payload = comment,
    )


def build_branch_event(
    payload:    dict[str, Any],
    repo:       dict[str, Any],
    is_created: bool,
) -> CanonicalEvent:
    """
    Normalize a branch creation or deletion into a CanonicalEvent.

    Branch names carry intent — "feature/auth-refactor",
    "hotfix/payment-crash", "experiment/new-db-schema" all tell a story.
    Knowing when branches are created and deleted helps map the timeline
    of decisions.

    GitHub fires 'create' for both branches and tags.
    GitHub fires 'delete' for both branches and tags.
    We capture both.

    event_id = "branch:{repo_id}:{ref_name}:{created|deleted}"
    """
    ref      = payload.get("ref", "")        # branch or tag name
    ref_type = payload.get("ref_type", "")   # "branch" or "tag"
    sender   = payload.get("sender") or {}
    action   = "created" if is_created else "deleted"

    return CanonicalEvent(
        event_id    = f"branch:{repo.get('id', '')}:{ref}:{action}",
        source      = EventSource.GITHUB,
        event_type  = EventType.REPOSITORY_CREATED if is_created else EventType.REPOSITORY_DELETED,
        occurred_at = datetime.now(timezone.utc),   # GitHub doesn't include timestamp in create/delete
        actor = Actor(
            source_user_id = str(sender.get("id", "")),
            display_name   = sender.get("login", ""),
            email          = None,
        ) if sender else None,
        entity_ref = EntityRef(repo_id=str(repo.get("id", ""))),
        content = {
            "title": f"{ref_type.capitalize()} '{ref}' {action}",
            "body":  "",
        },
        metadata = {
            "repo_name": repo.get("full_name", ""),
            "ref":       ref,
            "ref_type":  ref_type,   # "branch" or "tag"
            "action":    action,
        },
        raw_payload = payload,
    )


# ---------------------------------------------------------------------------
# Main webhook router
# Kamya calls this from her FastAPI endpoint after signature verification
# ---------------------------------------------------------------------------

async def handle_github_webhook_payload(
    db:         Any,              # asyncpg connection from Kamya's pool
    event_name: str,              # X-GitHub-Event header value
    payload:    dict[str, Any],
) -> None:
    """
    Route an incoming GitHub webhook payload to the correct handler
    and push the normalized CanonicalEvent into the event queue.

    Covers ALL meaningful GitHub activity:
      push                       -> commits
      pull_request               -> PR opened/closed/merged/reopened
      pull_request_review        -> review submitted (approve/reject)
      pull_request_review_comment-> inline code comment on diff
      issue_comment              -> general PR conversation comment
      create                     -> branch or tag created
      delete                     -> branch or tag deleted
      repository                 -> repo created or deleted

    Kamya's endpoint calls this AFTER calling verify_github_signature().
    This function must return quickly — GitHub expects 200 within seconds.

    Parameters
    ----------
    db          : asyncpg connection from Kamya's connection pool
    event_name  : the X-GitHub-Event header value
    payload     : parsed JSON body of the webhook POST
    """
    repo = payload.get("repository", {})

    # ------------------------------------------------------------------ #
    # PUSH — one or more commits were pushed to a branch                  #
    # ------------------------------------------------------------------ #
    if event_name == "push":
        commits = payload.get("commits", [])
        for commit_summary in commits:
            # Push webhook gives lightweight commit objects (no per-file diffs).
            # We enqueue what we have; the polling job enriches with full diffs.
            event = CanonicalEvent(
                event_id    = commit_summary["id"],   # SHA
                source      = EventSource.GITHUB,
                event_type  = EventType.COMMIT_PUSHED,
                occurred_at = _parse_dt(commit_summary.get("timestamp", "")),
                actor = Actor(
                    source_user_id = commit_summary.get("author", {}).get("username", ""),
                    display_name   = commit_summary.get("author", {}).get("name", ""),
                    email          = commit_summary.get("author", {}).get("email"),
                ),
                entity_ref  = EntityRef(repo_id=str(repo.get("id", ""))),
                content = {
                    "message":       commit_summary.get("message", ""),
                    "diff_summary":  "",   # polling job fills this in with real diffs
                    "files_changed": [
                        {"filename": f, "status": "modified", "patch": None}
                        for f in (
                            (commit_summary.get("modified") or [])
                            + (commit_summary.get("added")    or [])
                            + (commit_summary.get("removed")  or [])
                        )
                    ],
                },
                metadata    = {
                    "repo_name":      repo.get("full_name", ""),
                    "sha":            commit_summary["id"],
                    "branch":         payload.get("ref", "").replace("refs/heads/", ""),
                    "is_merge_commit": False,   # unknown from webhook payload
                },
                raw_payload = commit_summary,
            )
            await enqueue(db, event)

    # ------------------------------------------------------------------ #
    # PULL REQUEST — opened, closed, merged, reopened                     #
    # Note: GitHub sends "closed" for both closed-without-merge and       #
    # merged. We check pr["merged"] to distinguish.                       #
    # ------------------------------------------------------------------ #
    elif event_name == "pull_request":
        action = payload.get("action", "")
        pr     = payload.get("pull_request", {})

        action_map = {
            "opened":      EventType.PR_OPENED,
            "closed":      EventType.PR_MERGED if pr.get("merged") else EventType.PR_CLOSED,
            "reopened":    EventType.PR_REOPENED,
            "synchronize": EventType.PR_OPENED,   # new commits pushed to the PR branch
        }
        event_type = action_map.get(action)
        if event_type:
            event = build_pr_event(pr, repo, event_type)
            await enqueue(db, event)
        else:
            logger.debug("Unhandled pull_request action: %s", action)

    # ------------------------------------------------------------------ #
    # PULL REQUEST REVIEW — someone submitted an overall review            #
    # (Approved / Changes Requested / Commented)                          #
    # ------------------------------------------------------------------ #
    elif event_name == "pull_request_review":
        action = payload.get("action", "")
        if action == "submitted":   # only capture when the review is actually submitted
            review = payload.get("review", {})
            pr     = payload.get("pull_request", {})
            event  = build_review_event(review, pr, repo)
            await enqueue(db, event)

    # ------------------------------------------------------------------ #
    # PULL REQUEST REVIEW COMMENT — inline comment on a specific diff line #
    # Often the most technically detailed feedback in the whole repo      #
    # ------------------------------------------------------------------ #
    elif event_name == "pull_request_review_comment":
        action  = payload.get("action", "")
        if action == "created":   # only capture new comments, not edits/deletes
            comment = payload.get("comment", {})
            pr      = payload.get("pull_request", {})
            event   = build_review_comment_event(comment, pr, repo)
            await enqueue(db, event)

    # ------------------------------------------------------------------ #
    # ISSUE COMMENT — general comment on a PR conversation                #
    # GitHub fires this for both Issues and PRs — we only want PR ones   #
    # ------------------------------------------------------------------ #
    elif event_name == "issue_comment":
        action = payload.get("action", "")
        issue  = payload.get("issue", {})
        if action == "created" and "pull_request" in issue:
            # Only capture if this is a PR comment, not a plain issue comment
            comment = payload.get("comment", {})
            event   = build_issue_comment_event(comment, issue, repo)
            await enqueue(db, event)

    # ------------------------------------------------------------------ #
    # CREATE — branch or tag was created                                  #
    # ------------------------------------------------------------------ #
    elif event_name == "create":
        ref_type = payload.get("ref_type", "")
        if ref_type in ("branch", "tag"):
            event = build_branch_event(payload, repo, is_created=True)
            await enqueue(db, event)

    # ------------------------------------------------------------------ #
    # DELETE — branch or tag was deleted                                  #
    # ------------------------------------------------------------------ #
    elif event_name == "delete":
        ref_type = payload.get("ref_type", "")
        if ref_type in ("branch", "tag"):
            event = build_branch_event(payload, repo, is_created=False)
            await enqueue(db, event)

    # ------------------------------------------------------------------ #
    # REPOSITORY — repo created or deleted                                #
    # ------------------------------------------------------------------ #
    elif event_name == "repository":
        action = payload.get("action", "")
        if action in ("created", "deleted"):
            event = CanonicalEvent(
                event_id    = f"repo:{repo.get('id', '')}:{action}",
                source      = EventSource.GITHUB,
                event_type  = EventType.REPOSITORY_CREATED if action == "created" else EventType.REPOSITORY_DELETED,
                occurred_at = datetime.now(timezone.utc),
                actor       = None,
                entity_ref  = EntityRef(repo_id=str(repo.get("id", ""))),
                content     = {
                    "title": repo.get("full_name", ""),
                    "body":  repo.get("description") or "",
                },
                metadata    = {
                    "repo_name": repo.get("full_name", ""),
                    "private":   repo.get("private", False),
                    "action":    action,
                },
                raw_payload = payload,
            )
            await enqueue(db, event)

    else:
        # Any GitHub event type we don't handle yet
        logger.debug("Unhandled GitHub event: %s", event_name)
