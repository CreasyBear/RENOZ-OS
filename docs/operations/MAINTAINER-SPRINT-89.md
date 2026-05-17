# Operations Maintainer Sprint 89: OAuth Server Function Feedback Boundary

## Status

Closed in commit-ready state.

## Issue 1: OAuth Compatibility Wrappers Returned Raw Exception Text

### Problem

The domain audit still flagged OAuth initiate and callback paths as returning raw error text. The current `/api/oauth/initiate` route was already formatter-owned, but the older server-function wrappers still returned caught exception messages directly: callback failures embedded `Internal server error: ${errorMessage}`, and initiate failures returned `Failed to initiate OAuth flow: ${errorMessage}`. Those wrappers can be used by integration surfaces and should not expose provider, redirect, token, database, or stack details.

### Workflow Spine

OAuth setup or callback caller
-> OAuth compatibility server function
-> OAuth flow library
-> server-side error log on unexpected failure
-> OAuth-owned safe formatter response.

### Touched Domains

- Operations/integrations OAuth setup wrappers.
- OAuth feedback formatter contracts.
- OAuth route and server-function tests.
- Repo owner domain-housekeeping audit.

### Business Value Protected

OAuth integrations support Xero, email, calendar, communications, finance, and operational visibility. Operators and integration UI surfaces need useful setup/callback failure copy without leaking provider credentials, redirect details, OAuth state, tokens, database text, or stack/runtime details.

### Scope Constraints

- Do not change OAuth route behavior, OAuth flow library semantics, token exchange, state validation, PKCE handling, Xero tenant selection, connection persistence, token encryption, query keys, cache invalidation, or UI behavior.
- Keep explicit validation returns unchanged unless they came from unexpected caught exceptions.
- Do not broaden into contact/calendar sync worker errors or distributed public endpoint rate limiting.

### Changes

- Routed `handleOAuthCallback` catch responses through `formatOAuthConnectionError(error, 'callback')` and added server-side logging.
- Routed `initiateOAuth` catch responses through `formatOAuthConnectionError(error, 'initiate')` and added server-side logging.
- Added runtime tests proving raw token/provider exception text stays out of returned callback/initiate results.
- Extended the OAuth feedback source contract to prevent the old raw exception string patterns from returning.
- Updated the domain-housekeeping audit so the current backlog reflects the fixed OAuth feedback boundary.

### Standards Checked

- Domain ownership: OAuth error copy remains owned by `src/lib/oauth/oauth-error-messages.ts`.
- Route/server function -> OAuth flow -> formatter -> caller-visible payload: preserved and clarified.
- Query/cache policy: no TanStack Query keys, stale times, invalidations, or cache behavior changed.
- Tenant isolation/data integrity: no organization predicate, OAuth connection write, token persistence, Xero tenant selection, inventory, finance, or serialized-lineage behavior changed.
- UI states/error handling: direct API route behavior was already safe; compatibility wrappers now return safe catch-path copy.
- Reviewability: the diff is limited to two wrappers, focused runtime/source tests, audit text, and this closeout.

### Smells Removed

- Raw caught callback exception text in `errorDescription`.
- Raw caught initiate exception text in `error`.
- Stale audit text describing the already-safe initiate route as unsafe.

### Deferred

- OAuth contact/calendar sync worker error payloads remain separate integration-worker slices.
- Distributed public endpoint rate limiting remains open.
- Browser QA remains deferred because this sprint changes server-function catch payloads only.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/oauth/oauth-server-function-feedback-contract.test.ts tests/unit/oauth/oauth-feedback-contract.test.ts tests/unit/routes/oauth-initiate-route.test.ts tests/unit/routes/oauth-callback-route.test.ts` - 4 files, 12 tests.
- Passed: `./node_modules/.bin/eslint src/server/functions/oauth/handle-oauth-callback.ts src/server/functions/oauth/initiate-oauth.ts tests/unit/oauth/oauth-server-function-feedback-contract.test.ts tests/unit/oauth/oauth-feedback-contract.test.ts --report-unused-disable-directives`.
- Passed: targeted fixed-string scans for `Internal server error: ${errorMessage}`, `Failed to initiate OAuth flow: ${errorMessage}`, and `details: parsed.error`; remaining hits are negative test assertions or this closeout note, not runtime returns.
- Passed: targeted formatter ownership scan showing OAuth initiate and callback catch paths use `formatOAuthConnectionError(error, 'initiate')` or `formatOAuthConnectionError(error, 'callback')`.
- Passed: `node scripts/check-route-casts.mjs`.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.
- Skipped: browser QA, full unit suite, production build, deploy, finance, document, pending-dialog, read-path, and serialized gates because this slice changes server-function catch payloads only and does not touch UI layout, persistence behavior, read query contracts, document generation, finance posting, or serialized lineage.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, trust boundaries, meaningful tests, reviewable diffs, and audit hygiene.

### Residual Risk

Low for OAuth setup/callback compatibility wrapper catch paths. Medium across broader OAuth sync workers because some background sync functions still intentionally return stored provider/worker messages and need separate workflow-specific review before formatting changes.
