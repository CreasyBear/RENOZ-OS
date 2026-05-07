# AI Maintainer Sprint 2: API Error Response Boundaries

## Status

Closed in commit-ready state.

## Issue 1: AI API Routes Returned Raw Internal Error Text

### Problem

The AI artifact SSE route sent `error.message` inside stream failure events, and the dev-only RLS debug route returned database exception text in its JSON error response. Both routes logged too little or exposed too much. AI API responses should use stable client-facing copy while preserving internal detail in server logs.

### Workflow Spine

AI API route
-> auth/debug context
-> database/provider-backed AI work
-> server log
-> stable JSON/SSE client payload.

### Touched Domains

- AI artifact streaming API.
- AI RLS diagnostic API.
- AI API error-response helper.
- AI route feedback tests.

### Business Value Protected

AI features can support operator workflows only if failures are understandable and safe. Provider, database, token, and stack details should stay out of streamed events and API responses while remaining available to server-side logs for debugging.

### Scope Constraints

- Do not change artifact fetch semantics, tenant predicates, RLS diagnostic calculations, SSE event shape, response status codes, auth behavior, AI task schema access, or query/cache behavior.
- Keep dev-only RLS diagnostics disabled in production.
- Leave the Resend webhook response as a separate integration-domain slice.

### Changes

- Added `src/lib/ai/api-error-responses.ts` for route-safe AI API failure payloads.
- Routed artifact stream errors through `getAIArtifactStreamErrorPayload` and added server-side logging.
- Routed RLS debug failures through `getAIDebugRlsErrorPayload` and added server-side logging.
- Added focused route coverage for sanitized artifact stream failures and sanitized debug failures.
- Extended the AI feedback source contract to keep AI API failures behind route-safe helpers.

### Standards Checked

- Domain ownership: AI API response copy now lives in AI lib, not inline route exception handling.
- Route -> provider/database -> helper -> client payload: preserved and clarified.
- Query/cache policy: unchanged; these endpoints do not mutate or own TanStack cache.
- Tenant isolation/data integrity: artifact reads continue to filter by `organizationId`; RLS debug calculation behavior unchanged; no writes added.
- UI states/error handling: streamed and JSON API failures now return stable operator-safe messages.
- Reviewability: one helper, two route call sites, focused route tests, one source contract, and this closeout.

### Smells Removed

- Raw `error.message` in AI artifact SSE failure payloads.
- Raw database/internal error text in AI RLS debug JSON payloads.
- Missing stream-level logging for artifact stream failures.

### Deferred

- `src/routes/api/webhooks/resend.ts` still returns raw integration exception text and should be handled as a Resend/webhook slice.
- Broader AI server-function/tool result text may still include internal errors; this sprint targeted public AI route responses only.
- Browser QA was not selected because this slice changes route payload copy and logging only, with no intended layout or interaction change.

### Gates

- Passed: `bun run test:vitest tests/unit/routes/ai-artifacts-route.test.ts tests/unit/routes/ai-debug-rls-clash-route.test.ts tests/unit/ai/ai-feedback-contract.test.ts` - 3 files, 8 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted route/component/hook raw-message scan; remaining hit is the Resend webhook route.

### Goal Adaptation

Accepted the runtime update that serialized gates are retired from the maintainer workflow. This slice did not need any serialized gate evidence.

### Residual Risk

Low for AI route responses. The remaining known raw route response is in the Resend webhook integration domain, and deeper AI tool/server-function messages need separate product/context review before changing agent-facing text.
