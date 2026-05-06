# Financial Maintainer Sprint 36: OAuth Connection Feedback

## Status

Closed in commit-ready state.

## Issue 1: OAuth/Xero Connection Feedback Boundary

### Problem

Sprint 10 closed public auth callback feedback, but the integration callback surface still mixed auth-owned error language into OAuth/Xero setup and leaked raw tenant-selection failures. Xero tenant selection returned caught exception messages from the API, and the OAuth manager rendered those messages in toasts. The sidebar also used auth error copy for integration callback failures, which made failed accounting or workspace setup feel like a login problem instead of an integration recovery path.

### Workflow Spine

OAuth/Xero connection workflow
-> OAuth callback API route
-> OAuth flow result
-> integrations/settings redirect params
-> sidebar callback toast and OAuth cache invalidation
-> OAuth connection manager
-> Xero pending tenant selection API
-> tenant selection completion API
-> operator-safe integration feedback copy
-> query key/cache policy unchanged.

### Touched Domains

- OAuth integrations.
- Xero accounting connection setup.
- Communications/workspace OAuth connection setup.
- Sidebar callback toast handling.
- OAuth API route feedback.
- OAuth route and formatter tests.
- Financial maintainer closeout docs.

### Business Value Protected

Xero is part of RENOZ finance integrity: invoices, journals, and payment reconciliation should fail closed until the right tenant is connected. Operators need clear reconnect/tenant-selection guidance without seeing OAuth state, authorization codes, tokens, provider payloads, database details, or stack/runtime text.

### Scope Constraints

- Do not change OAuth provider flow, PKCE/state validation, token exchange, token storage, tenant selection semantics, connection creation, disconnect behavior, sync behavior, sidebar navigation cleanup, query keys, cache invalidation, database writes, finance posting, or communications sync behavior.
- Keep safe invalid/expired session, access-denied, rate-limit, tenant-selection, misconfiguration, disconnect, and sync guidance available.
- Change only OAuth integration feedback normalization and domain ownership.
- Browser QA is skipped because this is formatter/source-contract/API response behavior with no intended visual layout or route interaction change.

### Changes

- Added OAuth-owned `formatOAuthConnectionError`, `isUnsafeOAuthConnectionMessage`, and `toOAuthConnectionErrorCode`.
- Updated the OAuth callback route to encode OAuth-owned failure codes instead of auth-owned codes.
- Updated the sidebar OAuth callback toast to use OAuth-owned recovery copy.
- Updated pending Xero tenant selection GET/POST API failures to return formatted operator-safe messages.
- Updated the OAuth connection manager to format tenant-selection, initiate, disconnect, and sync toasts through the OAuth formatter.
- Added focused tests for OAuth formatter behavior, callback redirect behavior, and Xero tenant-selection API failure responses.

### Standards Checked

- Domain ownership: integration feedback copy is now owned by `src/lib/oauth/oauth-error-messages.ts`.
- Route -> container/page -> hook/server API -> OAuth flow -> schema/database -> query key/cache policy: preserved. This sprint changes only callback/API/component feedback boundaries around existing OAuth failures.
- Query/cache policy: unchanged. Sidebar still invalidates OAuth connections and health on success; tenant-selection success still invalidates OAuth connections.
- Tenant isolation/data integrity: unchanged. No organization scope, OAuth state ownership check, Xero tenant assignment rule, token persistence, connection write path, finance sync, communications sync, inventory transaction, or serialized lineage behavior changed.
- UI states/error handling: strengthened. Integration callback and tenant-selection failures now suppress implementation-shaped provider/token/database/runtime text while preserving useful reconnect and tenant-selection guidance.
- Reviewability: the diff is limited to one OAuth formatter, route/component substitutions, route tests, formatter tests, and this closeout note.

### Smells Removed

- Auth-owned callback error language used for integration setup failures.
- Raw caught Xero tenant-selection errors returned from the pending-selection API.
- Raw Xero tenant-selection/API errors rendered in OAuth manager toasts.
- Generic `Unknown error` fallback copy in OAuth manager mutation toasts.
- Missing source and route-response contracts for OAuth callback and tenant-selection feedback safety.

### Deferred

- OAuth initiate route still returns JSON error text for direct API consumers, but the manager displays safe formatter copy; direct API response normalization should be a separate API contract slice.
- OAuth health/detail panels may still render provider health strings from stored sync state; that belongs to the OAuth status dashboard/read-state slice.
- Browser QA for integrations settings remains future UX verification.

### Gates

- Passed: focused OAuth route/formatter tests, `./node_modules/.bin/vitest run tests/unit/oauth/oauth-feedback-contract.test.ts tests/unit/routes/oauth-callback-route.test.ts tests/unit/routes/oauth-pending-selection-route.test.ts` - 3 files, 8 tests.
- Passed: broader OAuth-focused suite, `./node_modules/.bin/vitest run tests/unit/oauth tests/unit/routes/oauth-callback-route.test.ts tests/unit/routes/oauth-pending-selection-route.test.ts tests/unit/auth/auth-callback-feedback-contract.test.ts` - 5 files, 13 tests.
- Passed: targeted source scan for legacy raw OAuth callback and tenant-selection feedback patterns returned no matches.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA because this is formatter/API response/source-contract behavior with no intended layout, navigation, or interaction change.
- Skipped: full unit suite and build because this slice did not change shared runtime plumbing, build-time behavior, OAuth persistence behavior, finance posting, communications sync, or database contracts; typecheck, lint, focused route/API evidence, OAuth-focused tests, and source scans covered the risk.

### Goal Adaptation

Declined. This follows the standing maintainer goal: domain-owned feedback copy, reviewable boundaries, meaningful tests, and risk-selected evidence. Sprint 7's serialized-gate posture still applies: serialized gates are not routine evidence for unrelated slices.

### Residual Risk

Medium-low. OAuth connection and Xero tenant-selection feedback is safer, but OAuth initiate API responses and OAuth status dashboard/read-state provider strings still need separate integration-domain slices.
