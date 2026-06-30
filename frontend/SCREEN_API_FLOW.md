# Screen → API flow

Went through Abhay's wireframes screen by screen and matched each one against what we actually have in the API. Most of it lines up. A few things don't and have flagged them.

If something here looks wrong... Ping me, I'll fix the diagram, not a big deal.

Viewing note: these flow charts will render automatically as actual diagrams on github.com — open the file there, not as a raw text view. If you're reading this in something that doesn't render Mermaid (plain text editor, VS Code without the Mermaid extension), paste the code block into mermaid.live instead.

---

## Consent flow

This is the one to read first.

```mermaid
flowchart TD
    A[Screen 1: what we capture] --> B[Screen 2: who can see it]
    B --> C[Screen 3: your controls]
    C --> D[Screen 4: confirm consent]
    D --> E["POST /consent — doesn't exist"]
    C --> F["GET /persons/id/data-export — doesn't exist"]
    C --> G["POST /persons/id/delete-request — doesn't exist"]
```

There's no endpoint for any of this. just not there. 

---

## Confirmation screen

The claim review step after an interview wraps up.

```mermaid
flowchart TD
    A[Interview completes] --> B["GET /interviews/id/extractions"]
    B --> C[Render claim cards]
    C --> D{What does the engineer do}
    D -->|Edits a claim| E["PUT .../extraction_id"]
    D -->|Deletes a claim| F["DELETE .../extraction_id"]
    D -->|Approves everything| G["POST /interviews/id/approve"]
    E --> C
    F --> C
    G --> H[Claims hit the graph]
```

This one's fine. Nothing writes to the graph until approve is hit, which is how it should work don't let anyone "optimize" that away later.

---

## Interview interface

```mermaid
flowchart TD
    A[Triggered by manager or self] --> B["POST /interviews"]
    B --> C["GET /interviews/id"]
    C --> D[Opening screen — gaps + time estimate]
    D --> E["POST /interviews/id/message"]
    E --> F{Agent replies}
    F -->|Another question| E
    F -->|Done| G[Hands off to confirmation screen]
```

Straightforward. The live knowledge preview on the side panel is just reading the same interview state as it updates, nothing new needed there.

---

## Engineer chat

```mermaid
flowchart TD
    A[Question typed in] --> B["POST /query"]
    B --> C{How confident is the answer}
    C -->|High| D[Answer + citations]
    C -->|Low| E[Low confidence warning]
    C -->|Nothing found| F[Empty state]
    D --> G[Click a citation]
    G --> H["GET /knowledge/nodes/node_id"]
    E --> I["POST /interviews — request one"]
    F --> I
    F --> J["POST /sources/connect"]
```


---

## Manager dashboard

```mermaid
flowchart TD
    A[Page loads] --> B["GET /dashboard/knowledge-health"]
    A --> C["GET /dashboard/bus-factor"]
    A --> D["GET /dashboard/stale-knowledge"]
    A --> E["GET /dashboard/interview-recommendations"]
    B --> F[Knowledge health panel]
    C --> G[Bus factor panel]
    D --> H[Stale knowledge panel]
    E --> I[Interview queue panel]
    I --> J{Manager clicks}
    J -->|Send| K["POST /interviews"]
    J -->|Dismiss| L["nothing to call yet"]
    A --> M["search → GET /engineers/person_id/profile"]
    M --> N["POST .../flag-departure"]
```

Four panels, four GETs, easy. The dismiss button is the only loose end .. so it'll just pop back up next time the page loads. Might be fine for a first pass, might annoy a manager who dismissed the same thing three times this week. Worth a quick decision, not a big lift either way.

---

## Connection flow

```mermaid
flowchart TD
    A[Opens the connection screen] --> B["GET /sources/status"]
    B --> C[Shows connected + not-yet-connected sources]
    C --> D[Clicks Connect on GitHub]
    D --> E["POST /sources/github/connect"]
    E --> F["GET /sources/github/repos"]
    F --> G[Modal — pick repos]
    G --> H["POST .../enable, once per repo checked"]
    C --> I[Clicks Connect on Slack]
    I --> J["POST /sources/slack/connect"]
```

This is two calls back to back, not one — connect first to get the repo list, then enable gets called per checkbox. Should double check with Abhay that's actually how he's wiring the modal's submit button, since it's easy to assume one call does both.



---

## Engineer profile

```mermaid
flowchart TD
    A[Opens own profile] --> B["GET /auth/me"]
    A --> C["GET /engineers/person_id/profile"]
    C --> D[Systems they own]
    C --> E[What they've contributed]
    A --> F["GET /engineers/person_id/knowledge-gaps"]
    F --> G[Next interview date]
    A --> H["privacy toggles — same gap as consent flow"]
```

Same missing-endpoint problem as the consent screens, just showing up again here. Not repeating myself on the details, see above.

---

## What's actually unresolved

- Consent / export / delete — no backend at all
- Chat streaming vs simulated reveal — Abhay's call, needs an answer either way
- Dashboard dismiss — low priority but should be decided, not just left
- Connection flow's two-step OAuth — probably fine, just want Abhay to confirm
