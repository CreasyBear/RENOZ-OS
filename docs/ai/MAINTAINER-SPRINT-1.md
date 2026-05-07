# AI Maintainer Sprint 1

## Slice

AI artifact and chat error surfaces should avoid raw provider or implementation messages.

## Business Value

AI support can be useful inside RENOZ workflows only if it stays trustworthy. Provider, token, model, or stack details should not appear in operator-facing artifact or chat UI when AI responses fail.

## Workflow Spine

```text
AI chat/artifact components
  -> AI hooks and streaming state
  -> AI routes/server functions/provider calls
  -> queryKeys.ai where read state is cached
  -> chat and artifact error feedback
```

## Triage Findings

- `ArtifactRenderer` displayed `error.message` with a generic fallback.
- Both uncontrolled and controlled `ChatPanel` variants displayed `error.message` directly.
- Existing AI approval and budget read hooks already normalize read failures; this slice targets component-level error presentation.

## Implementation

- Added AI-owned error helpers for artifact and chat feedback.
- Suppressed provider/token/model/internal failure text before rendering.
- Routed artifact and chat panel error displays through the helpers.
- Added a focused AI feedback contract test.

## Closeout

Touched domains: AI.

Workflow protected: AI artifact rendering errors and AI chat panel errors.

Business value: failed AI experiences stay operator-safe and do not expose provider or implementation details.

Standards checked: component -> hook/route/provider flow, honest UI states, operator-safe errors, meaningful tests, reviewable diff.

Smells removed: raw AI artifact `error.message` display and raw AI chat `error.message` display.

Deferred: broader AI mutation/result modeling is deferred; this slice only sanitizes component-level feedback surfaces.

Verification: `bun run test:vitest tests/unit/ai/ai-feedback-contract.test.ts`, `bun run typecheck`, `bun run lint`, targeted AI raw-error scan, `git diff --check`.

Goal adaptation: none.

Residual risk: no browser QA yet; this is a feedback copy boundary change with no intentional layout changes.
