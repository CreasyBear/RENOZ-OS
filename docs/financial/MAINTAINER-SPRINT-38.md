# Financial Maintainer Sprint 38: OAuth Initiate API Feedback

## Status

Closed in commit-ready state.

## Issue 1: OAuth Initiate Direct API Response Boundary

### Problem

Sprint 37 closed OAuth status/read-state feedback, but the direct OAuth initiate API response still returned raw implementation details. Invalid payloads returned Zod details, rate-limit failures returned the rate-limit exception message, and generic initiation failures returned raw `error.message`.

### Workflow Spine

OAuth initiate workflow
-> OAuth connection manager
-> `/api/oauth/initiate`
-> auth/permission check
-> request schema validation
-> rate-limit check
-> `initiateOAuthFlow`
-> provider redirect URL response or operator-safe JSON error
-> query key/cache policy unchanged.

### Touched Domains

- OAuth integrations.
- Xero/workspace connection initiation.
- OAuth initiate API route.
- OAuth feedback formatter.
- OAuth route and formatter tests.
- Financial maintainer closeout docs.

### Business Value Protected

Connecting Xero and workspace providers is prerequisite setup for accounting, payment reconciliation, communications, and scheduling. Direct API failures should give safe recovery copy without exposing schema internals, client identifiers, redirect configuration details, OAuth state, tokens, database text, or stack/runtime details.

### Scope Constraints

- Do not change OAuth provider flow, permission checks, schema shape, rate-limit policy, PKCE/state generation, redirect URL defaults, token storage, connection creation, query keys, cache invalidation, finance posting, or communications sync behavior.
- Keep safe invalid-request, rate-limit, redirect-misconfiguration, and generic setup-unavailable guidance available.
- Change only direct OAuth initiate API error response normalization and focused tests.
- Browser QA is skipped because this is API response/source-contract behavior with no intended visual layout or route interaction change.

### Changes

- Extended OAuth-owned feedback behavior so initiate invalid requests get initiate-specific copy.
- Updated `/api/oauth/initiate` invalid payload responses to omit Zod details and return safe copy.
- Updated `/api/oauth/initiate` rate-limit responses to return safe copy while preserving `Retry-After`.
- Updated `/api/oauth/initiate` generic failure responses to use the OAuth formatter instead of raw `error.message`.
- Added focused route tests for valid initiation, invalid payloads, rate limits, redirect misconfiguration, and unsafe provider/storage failures.
- Extended OAuth feedback source tests to lock the initiate API behind OAuth-owned copy.

### Standards Checked

- Domain ownership: initiate API failure copy remains owned by `src/lib/oauth/oauth-error-messages.ts`.
- Route -> container/page -> API route -> OAuth flow -> schema/database -> query key/cache policy: preserved. This sprint changes only API error response copy around existing initiate failures.
- Query/cache policy: unchanged. Initiation does not mutate query cache; connection manager behavior remains unchanged.
- Tenant isolation/data integrity: unchanged. No organization scope, permission boundary, OAuth state persistence, provider token behavior, connection write path, finance posting, communications sync, inventory transaction, or serialized lineage behavior changed.
- UI states/error handling: strengthened at the API boundary. UI formatter behavior from Sprint 36 remains intact, and direct API consumers now receive safe copy.
- Reviewability: the diff is limited to OAuth formatter behavior, one API route substitution, focused route tests, source tests, and this closeout note.

### Smells Removed

- Zod validation details returned from the public initiate API route.
- Raw rate-limit exception text returned from initiate API responses.
- Raw generic `error.message` returned from initiate API responses.
- Missing route-response tests for initiate failure contracts.

### Deferred

- Xero remediation console issue messages are owned by financial/Xero sync schemas and remain a separate finance slice.
- OAuth calendar/email sync internals still contain server-side raw error-message storage paths; reviewing stored sync logs should be a separate persistence/read-model slice.
- Browser QA for integrations settings remains future UX verification.

### Gates

- Passed: focused OAuth initiate/route/formatter tests, `./node_modules/.bin/vitest run tests/unit/routes/oauth-initiate-route.test.ts tests/unit/oauth/oauth-feedback-contract.test.ts tests/unit/routes/oauth-callback-route.test.ts tests/unit/routes/oauth-pending-selection-route.test.ts` - 4 files, 14 tests.
- Passed: broader OAuth-focused suite, `./node_modules/.bin/vitest run tests/unit/oauth tests/unit/routes/oauth-initiate-route.test.ts tests/unit/routes/oauth-callback-route.test.ts tests/unit/routes/oauth-pending-selection-route.test.ts tests/unit/auth/auth-callback-feedback-contract.test.ts` - 6 files, 19 tests.
- Passed: targeted source scan for legacy raw initiate response patterns returned no matches.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA because this is API response/source-contract behavior with no intended layout, navigation, or interaction change.
- Skipped: full unit suite and build because this slice did not change shared runtime plumbing, build-time behavior, OAuth persistence behavior, finance posting, communications sync, or database contracts; typecheck, lint, OAuth-focused tests, route-response tests, and source scans covered the risk.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain-owned feedback copy, safe API contracts, reviewable diffs, meaningful tests, and risk-selected evidence. Sprint 7's serialized-gate posture still applies: serialized gates are not routine evidence for unrelated slices.

### Residual Risk

Medium-low. OAuth initiate API responses are safer, but financial Xero remediation issue-message review and stored OAuth sync-log error normalization remain separate integration/finance slices.
