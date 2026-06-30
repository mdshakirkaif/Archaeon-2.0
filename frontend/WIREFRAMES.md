# Archaeon-2.0 — Frontend Wireframes

**Owner:** Abhay (Frontend)
**Last Updated:** 2026-06-28
**Status:** Draft — pending team review

---

## Overview

7 interfaces, ~14 distinct screens. Each person sees a personalized view based on their ring level (1-5) and owned systems.

| # | Interface | Primary User | Screens | Build Priority |
|---|-----------|-------------|---------|----------------|
| 1 | Consent Flow | All engineers | 4 | FIRST — blocks everything |
| 2 | Confirmation Screen | Engineers (post-interview) | 1 | Before interview data enters graph |
| 3 | Interview Interface | Engineers | 3 | Core extraction UX |
| 4 | Engineer Chat | Engineers (daily use) | 1 + side panel | Most-used interface |
| 5 | Manager Dashboard | Managers (Ring 3+) | 1 (scrollable) | Operational view |
| 6 | Connection Flow | Managers/admins | 1 + modal | Setup onboarding |
| 7 | Engineer Profile | Engineers (self) | 1 | Attribution visibility |

---

## 1. CONSENT FLOW

Must be live before ANY data capture. Four sequential screens. No back navigation.

### Screen 1 — What Archaeon Captures

```
┌──────────────────────────────────────────────────────────────┐
│  Archaeon                                                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │       Welcome to Archaeon                            │    │
│  │                                                      │    │
│  │  Before we begin, here's exactly what Archaeon       │    │
│  │  captures and why.                                   │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ✓ What we capture:                                          │
│    • Your commits and pull request contributions             │
│    • Interview sessions about your work                      │
│    • Knowledge you explicitly approve                        │
│                                                              │
│  ✗ What we NEVER capture:                                    │
│    • Your private messages                                   │
│    • Personal accounts                                       │
│    • Anything outside connected repos/channels               │
│                                                              │
│                                        [ Continue → ]        │
└──────────────────────────────────────────────────────────────┘
```

### Screen 2 — Who Can See It

```
┌──────────────────────────────────────────────────────────────┐
│  Archaeon                                                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │       Who Can See Your Data                          │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │   Ring 1   │ │   Ring 2   │ │   Ring 3   │              │
│  │   Your     │ │   Team     │ │  Manager   │              │
│  │   Team     │ │   Leads    │ │   View     │              │
│  ├────────────┤ ├────────────┤ ├────────────┤              │
│  │ Knowledge  │ │ Knowledge  │ │ Knowledge  │              │
│  │ from your  │ │ health for │ │ health for │              │
│  │ systems    │ │ your team  │ │ all teams  │              │
│  │            │ │            │ │            │              │
│  │ Your name  │ │ Your name  │ │ System     │              │
│  │ in attrib. │ │ in attrib. │ │ health     │              │
│  │            │ │            │ │ only       │              │
│  └────────────┘ └────────────┘ └────────────┘              │
│                                                              │
│  Your interview transcript is only visible to you. Always.   │
│                                                              │
│                                        [ Continue → ]        │
└──────────────────────────────────────────────────────────────┘
```

### Screen 3 — Your Controls

```
┌──────────────────────────────────────────────────────────────┐
│  Archaeon                                                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │       Your Privacy Controls                          │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  Allow passive capture of GitHub contributions               │
│  ┌─────────────────────────────────────────┐                │
│  │ ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ON  │                │
│  └─────────────────────────────────────────┘                │
│                                                              │
│  Allow interview invitations                                 │
│  ┌─────────────────────────────────────────┐                │
│  │ ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ON  │                │
│  └─────────────────────────────────────────┘                │
│                                                              │
│  Show my name in knowledge attribution                       │
│  ┌─────────────────────────────────────────┐                │
│  │ ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ON  │                │
│  └─────────────────────────────────────────┘                │
│                                                              │
│  ──────────────────────────────────────────────────────────  │
│  📋  View all data stored about you                          │
│  🗑   Request deletion of your data                          │
│                                                              │
│                                        [ Continue → ]        │
└──────────────────────────────────────────────────────────────┘
```

### Screen 4 — Confirm

```
┌──────────────────────────────────────────────────────────────┐
│  Archaeon                                                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │       Ready to Start                                 │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  You can change these settings at any time in your profile.  │
│                                                              │
│  Your contributions improve organizational knowledge         │
│  for everyone.                                               │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │         I understand and I consent                   │    │
│  │                                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. CONFIRMATION SCREEN

Most important screen for trust. Engineer reviews extracted knowledge before it enters the graph. Only way data enters the graph.

### Main Screen — Claim Cards

```
┌──────────────────────────────────────────────────────────────┐
│  Archaeon — Review Knowledge Claims                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Decision Node                                       │    │
│  │                                                      │    │
│  │  The payment service retries 3 times because the     │    │
│  │  team decided bounded retries prevent cascading      │    │
│  │  timeouts while still handling transient failures.   │    │
│  │                                                      │    │
│  │  Rationale: After the Sept 12 incident, analysis     │    │
│  │  showed that 5 retries caused 400ms+ cascading       │    │
│  │  delays across the payment chain.                    │    │
│  │                                                      │    │
│  │  Source: Interview (Sept 15, 2025) — [Engineer]      │    │
│  │  Confidence: ●●●●○  0.82                            │    │
│  │                                                      │    │
│  │  ┌──────────┐  ┌──────────┐                         │    │
│  │  │ ✏  Edit  │  │ 🗑 Remove│                         │    │
│  │  └──────────┘  └──────────┘                         │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Dependency Node                                     │    │
│  │                                                      │    │
│  │  payment-service depends on Stripe API for all       │    │
│  │  payment processing. No fallback provider exists.    │    │
│  │                                                      │    │
│  │  Source: PR #187 — "Add Stripe integration"         │    │
│  │  Confidence: ●●●●●  0.91                            │    │
│  │                                                      │    │
│  │  ┌──────────┐  ┌──────────┐                         │    │
│  │  │ ✏  Edit  │  │ 🗑 Remove│                         │    │
│  │  └──────────┘  └──────────┘                         │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Risk Node                                           │    │
│  │                                                      │    │
│  │  If Stripe experiences a sustained outage, the       │    │
│  │  payment service has no circuit breaker and will     │    │
│  │  queue jobs indefinitely.                            │    │
│  │                                                      │    │
│  │  Source: PR #203 — discussion thread                 │    │
│  │  Confidence: ●●●○○  0.65                            │    │
│  │                                                      │    │
│  │  ┌──────────┐  ┌──────────┐                         │    │
│  │  │ ✏  Edit  │  │ 🗑 Remove│                         │    │
│  │  └──────────┘  └──────────┘                         │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ──────────────────────────────────────────────────────────  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │          Approve & Save (3 claims)                   │    │
│  │                                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  Only claims you approve will enter the knowledge graph.     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Inline Edit State

```
┌──────────────────────────────────────────────────────────────┐
│  Decision Node                                               │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ The payment service retries 3 times because the     │    │
│  │ team decided bounded retries prevent cascading      │    │
│  │ timeouts while still handling transient failures.   │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  Source: Interview (Sept 15, 2025) — [Engineer]              │
│  Confidence: ●●●●○  0.85  (+0.03 human validated)          │
│                                                              │
│  ┌──────────┐  ┌──────────┐                                 │
│  │ ✓ Save   │  │ ✗ Cancel │                                 │
│  └──────────┘  └──────────┘                                 │
└──────────────────────────────────────────────────────────────┘
```

### Remove Confirmation Popup

```
┌──────────────────────────────────┐
│  Remove this claim?              │
│                                  │
│  This claim will not be saved.   │
│  Are you sure?                   │
│                                  │
│  [ Yes, remove it ]  [ Keep it ] │
└──────────────────────────────────┘
```

---

## 3. INTERVIEW INTERFACE

Focused, respectful conversation. One question at a time. Engineer sees knowledge being built in real time.

### Screen 1 — Opening

```
┌──────────────────────────────────────────────────────────────┐
│  Archaeon — Knowledge Interview                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │  📋  Knowledge Interview: Payment Service            │    │
│  │                                                      │    │
│  │  Systems covered:                                    │    │
│  │  • payment-service (primary)                         │    │
│  │  • stripe-webhook-handler (secondary)                │    │
│  │                                                      │    │
│  │  Knowledge gaps identified: 8                        │    │
│  │  Estimated time: 15-20 minutes                       │    │
│  │                                                      │    │
│  │  ──────────────────────────────────────────────────  │    │
│  │                                                      │    │
│  │  You will review everything before it is saved.      │    │
│  │  You can skip any question. Nothing is saved until   │    │
│  │  you approve it.                                     │    │
│  │                                                      │    │
│  │                    [ Continue → ]                    │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Screen 2 — Question (Split View)

```
┌────────────────────────────────────────────────────────────────────────┐
│  Interview 3 of 8                              [ Skip this question ]  │
├──────────────────────────────────┬─────────────────────────────────────┤
│                                  │                                     │
│  This is about the               │  📊  Live Knowledge Preview         │
│  payment-service, specifically   │  ─────────────────────────────     │
│  the work you did in            │                                     │
│  September 2025.                │  ┌───────────────────────────┐     │
│                                  │  │ ✅ Decision Node          │     │
│  Why did the team choose 3      │  │ "Use 3 retries for        │     │
│  retries for the Stripe webhook │  │  Stripe webhook"          │     │
│  instead of 5 or 1?             │  │ Confidence: 0.82          │     │
│                                  │  └───────────────────────────┘     │
│  ┌────────────────────────────┐ │                                     │
│  │                            │ │  ┌───────────────────────────┐     │
│  │                            │ │  │ ⏳ Pending Review         │     │
│  │  The original design had 5 │ │  │ "Payment service uses     │     │
│  │  retries but we saw        │ │  │  bounded exponential      │     │
│  │  cascading timeouts in     │ │  │  backoff"                 │     │
│  │  production. After the     │ │  │ Confidence: 0.68          │     │
│  │  incident on Sept 12th,   │ │  └───────────────────────────┘     │
│  │  we analyzed the failure   │ │                                     │
│  │  patterns and...           │ │  ┌───────────────────────────┐     │
│  │                            │ │  │ ✅ Dependency Node        │     │
│  │                            │ │  │ "payment-service          │     │
│  │  (expands as you type)     │ │  │  depends on Stripe"      │     │
│  │                            │ │  │ Confidence: 0.91          │     │
│  └────────────────────────────┘ │  └───────────────────────────┘     │
│                                  │                                     │
│                                   │  3 nodes captured so far           │
│       [ Continue → ]             │                                     │
│                                   │                                     │
├──────────────────────────────────┴─────────────────────────────────────┤
│  ████████████████░░░░░░░░  3 of 8 gaps addressed                      │
└────────────────────────────────────────────────────────────────────────┘
```

### Screen 3 — Completion

```
┌──────────────────────────────────────────────────────────────┐
│  Archaeon — Interview Complete                               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │  ✓  Interview Complete                               │    │
│  │                                                      │    │
│  │  Here's what was captured:                           │    │
│  │                                                      │    │
│  │  • 5 knowledge claims extracted                      │    │
│  │  • 3 systems covered                                 │    │
│  │  • 8 minutes total                                   │    │
│  │                                                      │    │
│  │  Next: You'll review each claim and approve what     │    │
│  │  enters the knowledge graph. Nothing is saved yet.   │    │
│  │                                                      │    │
│  │              [ Review & Approve → ]                  │    │
│  │                                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. ENGINEER CHAT

Most-used interface. Feels like messaging a knowledgeable colleague.

### Main Chat Screen

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Archaeon                                          [ Engineer Name ▾ ]   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Previous Q&A visible above (scrollable)                                │
│                                                                          │
│  ──────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │  🟢 HIGH CONFIDENCE                                            │     │
│  │  This answer is well-sourced from 3 knowledge claims.          │     │
│  │                                                                │     │
│  │  The payment service retries 3 times because the original      │     │
│  │  design [Decision: PR #142] decided that transient failures    │     │
│  │  in the Stripe webhook handler [System: payment-service]       │     │
│  │  required exactly 3 attempts before failing permanently        │     │
│  │  [Risk: PR #187]. The team considered 5 retries but settled   │     │
│  │  on 3 to avoid cascading timeouts [Interview: Engineer, Q3 2025].│     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  ┌────────────┐ ┌──────────────────┐ ┌────────────────────┐            │
│  │ Decision   │ │ System:          │ │ Interview:         │            │
│  │ PR #142    │ │ payment-service  │ │ Engineer, Q3 2025  │            │
│  └────────────┘ └──────────────────┘ └────────────────────┘            │
│                                                                          │
│  ──────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │                                                                │     │
│  │  Ask anything about your codebase...                           │     │
│  │                                                                │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                              Ctrl+Enter  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Citation Side Panel (slides in from right)

```
┌──────────────────────────────────────┐
│  Decision Node #142                  │
│  ─────────────────────               │
│  Claim: Use 3 retries for Stripe     │
│  webhook to handle transient...      │
│                                      │
│  Rationale: Transient failures need  │
│  bounded retries to avoid cascade... │
│                                      │
│  Confidence: ●●●●○  0.82            │
│                                      │
│  Source: PR #142                     │
│  "Add retry logic to webhook"       │
│  Captured: 2025-09-15                │
│  Attributed to: [Engineer Name], Team                      │
│                                      │
│  [ View PR on GitHub → ]             │
└──────────────────────────────────────┘
```

### Low Confidence State

```
┌──────────────────────────────────────────────────────────────┐
│  ⚠  LOW CONFIDENCE                                          │
│                                                              │
│  This answer is based on limited information.                │
│                                                              │
│  The system found 1 partial match but no high-confidence     │
│  knowledge about this topic.                                 │
│                                                              │
│  💡 Schedule an interview with [Engineer Name] to capture    │
│     this knowledge.              [ Request Interview → ]     │
└──────────────────────────────────────────────────────────────┘
```

### No Knowledge Found State

```
┌──────────────────────────────────────────────────────────────┐
│  📭  No Knowledge Found                                      │
│                                                              │
│  We searched:                                                │
│  • 12 knowledge nodes                                        │
│  • 3 connected systems                                       │
│  • 8 interview transcripts                                   │
│                                                              │
│  Nothing matched your question about "deploy pipeline"       │
│                                                              │
│  What would help:                                            │
│  • An interview with the team that owns the deploy pipeline  │
│  • Connecting your CI/CD repo to Archaeon                    │
│                                                              │
│  [ Schedule Interview → ]          [ Connect Repo → ]        │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. MANAGER DASHBOARD

Ring 3+ only. Visual, scannable in 30 seconds.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Archaeon — Manager Dashboard                           [ Domain: Backend ]   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─── KNOWLEDGE HEALTH ───────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────┐  │ │
│  │  │ payment-svc   │ │ auth-service  │ │ user-mgmt     │ │ notif-svc │  │ │
│  │  │ ████████░░ 78%│ │ ██████████ 95%│ │ █████░░░░ 52% │ │ ██░░░░░ 23%│  │ │
│  │  │ 👤 2 owners   │ │ 👤 3 owners   │ │ 👤 1 owner ⚠  │ │ 👤 1 owner ⚠│  │ │
│  │  │ Updated 2d ago│ │ Updated 1w ago│ │ Updated 30d   │ │ Updated 45d│  │ │
│  │  └───────────────┘ └───────────────┘ └───────────────┘ └───────────┘  │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─── BUS FACTOR RISK ──────────────┐  ┌─── STALE KNOWLEDGE ─────────────┐ │
│  │                                  │  │                                  │ │
│  │  🔴  Engineer A                   │  │  ⚠  user-mgmt                    │ │
│  │     Sole expert: payment-svc     │  │     4 stale nodes (30d)          │ │
│  │     Tenure: 2.1 years            │  │     Trigger: 12 commits last wk  │ │
│  │     [ Interview Now → ]          │  │     [ Recommend Interview → ]    │ │
│  │                                  │  │                                  │ │
│  │  🔴  Engineer B                   │  │  ⚠  notification-svc             │ │
│  │     Sole expert: notification    │  │     6 stale nodes (45d)          │ │
│  │     Tenure: 8 months             │  │     Trigger: API refactor last wk│ │
│  │     [ Interview Now → ]          │  │     [ Recommend Interview → ]    │ │
│  │                                  │  │                                  │ │
│  └──────────────────────────────────┘  └──────────────────────────────────┘ │
│                                                                              │
│  ┌─── INTERVIEW QUEUE ─────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  Engineer        Trigger            Systems          Actions           │ │
│  │  ──────────────────────────────────────────────────────────────────    │ │
│  │  Engineer A       Gap score > 0.6    auth-service     [Send] [Dismiss] │ │
│  │  Engineer B       Quarterly          user-mgmt        [Send] [Dismiss] │ │
│  │  Engineer C       Departure flagged  payment-svc      [Priority]       │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─── DEPARTURE FLOW ──────────────────────────────────────────────────────┐ │
│  │  Search engineer: [________________]  [ Mark as Departing → ]          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. CONNECTION FLOW

Manager/admin sets up data sources via OAuth.

### Main Screen

```
┌──────────────────────────────────────────────────────────────┐
│  Archaeon — Connect Data Sources                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  🔗  Connect Your Tools                              │    │
│  │                                                      │    │
│  │  Connect the tools your team uses so Archaeon can    │    │
│  │  capture organizational knowledge.                   │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   GitHub    │ │   Slack     │ │   Jira      │           │
│  │   ○ ○ ○     │ │   ◊ ◊ ◊     │ │   □ □ □     │           │
│  │             │ │             │ │             │           │
│  │ Connected ✓ │ │ Connected ✓ │ │ Not yet     │           │
│  │ 3 repos     │ │ 12 channels │ │             │           │
│  │             │ │             │ │ [ Connect → ]│           │
│  │ [ Manage ]  │ │ [ Manage ]  │ │             │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                              │
│  ┌─────────────┐ ┌─────────────┐                            │
│  │   Linear    │ │   Notion    │                            │
│  │   △ △ △     │ │   ☆ ☆ ☆     │                            │
│  │ Not yet     │ │ Not yet     │                            │
│  │ [ Connect → ]│ │ [ Connect → ]│                            │
│  └─────────────┘ └─────────────┘                            │
│                                                              │
│  ──────────────────────────────────────────────────────────  │
│                                                              │
│  Sync Status:                                                │
│  GitHub — Last synced: 2 hours ago  │ 47 events processed   │
│  Slack  — Last synced: 15 min ago   │ 203 messages captured │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### OAuth Modal (GitHub example)

```
┌──────────────────────────────────┐
│  Connect GitHub              [X] │
│                                  │
│  Archaeon wants to access:      │
│  ✓ Repository contents           │
│  ✓ Pull requests                 │
│  ✓ Commit history                │
│                                  │
│  Which repositories?             │
│  ○ All repositories              │
│  ● Selected repositories         │
│    ☑ payment-service             │
│    ☑ auth-service                │
│    ☐ archaeon-docs               │
│                                  │
│  [ Cancel ]    [ Connect → ]     │
└──────────────────────────────────┘
```

---

## 7. ENGINEER PROFILE

Engineer sees their own attributed knowledge and privacy settings.

```
┌──────────────────────────────────────────────────────────────┐
│  Archaeon — My Profile                                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  👤  [Engineer Name] — [Team]                           │    │
│  │                                                      │    │
│  │  Ring Level: 2 (Team Lead)                           │    │
│  │  Tenure: 2.1 years                                   │    │
│  │  Joined: March 2024                                  │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─── MY SYSTEMS ──────────────────────────────────────────┐ │
│  │                                                        │ │
│  │  System              Ownership    Knowledge    Actions │ │
│  │  ────────────────────────────────────────────────────  │ │
│  │  payment-service     85%          78%          [View]  │ │
│  │  stripe-webhook      40%          62%          [View]  │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─── MY ATTRIBUTED KNOWLEDGE ─────────────────────────────┐ │
│  │                                                        │ │
│  │  5 decisions attributed to you                         │ │
│  │  3 risks you identified                                │ │
│  │  2 dependencies you documented                         │ │
│  │                                                        │ │
│  │  Last interview: Sept 15, 2025                         │ │
│  │  Next interview recommended: Dec 15, 2025              │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─── PRIVACY SETTINGS ────────────────────────────────────┐ │
│  │                                                        │ │
│  │  Passive capture of GitHub contributions   [ ● ON ]    │ │
│  │  Interview invitations                     [ ● ON ]    │ │
│  │  Show name in knowledge attribution        [ ● ON ]    │ │
│  │                                                        │ │
│  │  📋  View all data stored about me                     │ │
│  │  🗑   Request deletion of my data                      │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Role-Based Views

### Engineer (Ring 1-2) sees:
- Consent Flow
- Confirmation Screen (own interviews only)
- Interview (own gaps only)
- Engineer Chat
- Engineer Profile (own profile only)

### Manager (Ring 3+) sees:
- Everything the engineer sees, PLUS:
- Manager Dashboard
- Connection Flow
- Can view other engineers' profiles in their domain
- Can trigger interviews for their team

---

## Build Order

```
1. Consent Flow              ← MUST be first, blocks everything
2. Confirmation Screen       ← MUST be before interview data enters graph
3. Interview Interface       ← Core extraction UX
4. Engineer Chat             ← Most-used daily interface
5. Manager Dashboard         ← Operational view for Ring 3+
6. Connection Flow           ← Onboarding setup
7. Engineer Profile          ← Attribution visibility
```

---

## Open Questions (To Discuss with Team)

1. **Navigation** — How do engineers switch between Chat, Interview, Profile, Consent? Sidebar? Top nav? Separate pages?
2. **Streaming format** — Need Kamya's OpenAPI spec to know how chat responses stream back (SSE, chunks, etc.)
3. **Mobile responsive** — Chat and interview must work on mobile. Dashboard is desktop-only. Any other mobile considerations?
4. **Color scheme** — Confidence indicators: green (0.7+), amber (0.4-0.7), red (<0.4). Any brand colors to use?
5. **Auth flow** — Login page wireframe needed? Or does Kamya handle auth redirect before the app loads?

---

*This document is a living wireframe. Update as team reviews and provides feedback.*
