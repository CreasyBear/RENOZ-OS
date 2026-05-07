# Users Maintainer Sprint 13: Portal Confirm Error Classification

## Status

Closed in commit-ready state.

## Issue 1: Portal Confirm Classified Provider Errors via `error?.message`

### Problem

`src/routes/portal/confirm.ts` did not display raw provider text, but it still reached into `error?.message` to classify Supabase OTP confirmation failures before redirecting to `/auth/error`. Auth error-code classification should own provider-error extraction so routes do not touch raw provider message fields directly.

### Workflow Spine

Portal confirmation route
-> Supabase OTP verification
-> auth error-code classifier
-> `/auth/error` redirect
-> safe `authErrorMessage` copy.

### Touched Domains

- Public portal auth confirmation.
- Auth error-code helper.
- Auth source-contract tests.

### Business Value Protected

Portal confirmation is a public auth handoff for customer-facing access. Failed confirmations should route to safe auth copy while preserving useful known classes such as rate limits without exposing provider internals.

### Scope Constraints

- Do not change route params, token verification, rate limiting, redirect sanitization, `/auth/error` behavior, safe copy, Supabase semantics, query/cache behavior, database writes, or auth lifecycle routing.
- Preserve existing string classification.
- Add `Error` object extraction inside the auth helper rather than route code.

### Changes

- Updated `toAuthErrorCode` to classify `Error` objects by their message.
- Changed `portal/confirm` to pass the provider error object directly to `toAuthErrorCode`.
- Added focused coverage for `Error` object classification and route source wiring.

### Standards Checked

- Domain ownership: provider-error extraction now lives inside `src/lib/auth/error-codes.ts`.
- Route -> server function/provider -> auth helper -> auth error route: preserved; only classifier ownership changed.
- Query/cache policy: unchanged; this public auth route does not own query cache behavior.
- Tenant isolation/data integrity: no server writes, session mutation, organization predicate, database behavior, inventory behavior, finance behavior, or serialized lineage behavior changed.
- UI states/error handling: the route no longer touches raw provider message fields and still redirects with safe auth copy.
- Reviewability: one helper, one route call site, two focused tests, and this closeout.

### Smells Removed

- Route-level `error?.message` access in portal confirmation.
- Missing source contract that portal confirm passes provider errors through the auth classifier.

### Deferred

- API/debug route raw-message responses remain separate backend slices.
- Browser QA was not selected because this is classifier/source-contract behavior with no intended layout or interaction change.

### Gates

- Passed: focused auth error-code, portal-confirm, and auth-error route contracts, `bun run test:vitest tests/unit/auth/error-codes.test.ts tests/unit/auth/portal-confirm-feedback-contract.test.ts tests/unit/auth/auth-error-route.test.ts` - 3 files, 10 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for `toAuthErrorCode(error)` wiring and removed `error?.message` from `portal/confirm`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. This is a direct application of the standing maintainer goal. Serialized gates remain retired for unrelated auth-feedback slices.

### Residual Risk

Low for portal confirmation feedback. Remaining scan entries are API/debug response bodies, not component or hook UI feedback surfaces.
