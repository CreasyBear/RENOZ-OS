# Operations Maintainer Sprint 86: OAuth Pending Selection Query Key Ownership

## Status

Closed in commit-ready state.

## Issue 1: Pending Tenant Selection Used A Literal OAuth Query Key

### Problem

`OAuthConnectionManager` used centralized query keys for OAuth connections, health, and dashboard state, but the Xero pending-tenant-selection read still used a literal `['oauth', 'pending-selection', stateId]` key inside the component.

That left one OAuth setup cache contract outside `queryKeys.oauth`, making the integration setup workflow less reviewable than the rest of the OAuth surface.

### Workflow Spine

OAuth callback with Xero tenant selection
-> `OAuthConnectionManager`
-> pending selection query param detection
-> `/api/oauth/pending-selection`
-> pending Xero tenant selection response
-> centralized OAuth query keys
-> tenant selection card.

### Touched Domains

- Operations/integrations OAuth query key infrastructure.
- Xero pending tenant selection component read.
- OAuth query-key contract tests.
- Operations maintainer closeout docs.

### Business Value Protected

Xero setup is part of financial operations readiness. When a Xero account has multiple tenant organizations, RENOZ needs the tenant-selection step to be reliable and easy to reason about without one-off cache keys hidden inside a component.

### Scope Constraints

- Do not change OAuth state validation, token exchange, pending-selection API behavior, tenant selection submission, connection creation, token encryption, webhook tenant resolution, financial sync execution, visible UI, or route behavior.
- Keep this as a cache ownership cleanup slice.

### Changes

- Added `queryKeys.oauth.pendingSelections()`.
- Added `queryKeys.oauth.pendingSelection(stateId)`.
- Updated `OAuthConnectionManager` to use the centralized pending-selection key.
- Added `oauth-query-key-contract.test.ts` to prove pending selections sit under their OAuth root and stay distinct from connection keys.

### Standards Checked

- Domain ownership: OAuth pending-selection cache ownership now lives in `queryKeys.oauth`.
- Route -> container/page -> hook -> server function/API route -> schema/database -> query key/cache policy: checked callback query params through `OAuthConnectionManager`, pending-selection API route, pending-selection schema, and OAuth query key roots.
- Tenant isolation/data integrity: unchanged; no OAuth flow, API route, token, tenant, organization, or connection persistence logic touched.
- Query/cache contract: improved by removing the final production literal OAuth query key.
- Transactional inventory and finance integrity: unchanged; no inventory or financial posting behavior touched.
- Serialized lineage continuity: unchanged; no serial identity or inventory serialization path touched.
- Honest UI states/operator-safe errors: unchanged; existing OAuth formatter remains in the component and API route.
- Reviewability: bounded diff across centralized query keys, one component query key, one focused contract test, and this closeout.

### Smells Removed

- Literal `['oauth', 'pending-selection', stateId]` query key in a component.
- Inconsistent key ownership between OAuth connection/health/dashboard reads and pending-selection reads.
- Hidden Xero tenant-selection cache contract.

### Deferred

- Broader OAuth tenant-selection UX remains separate from this cache ownership slice.
- Browser QA remains deferred because this slice changes cache key ownership without visible layout changes.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/oauth/oauth-query-key-contract.test.ts`.
- Passed: `rg -n "queryKey:\\s*\\['oauth'|pending-selection|pendingSelection\\(|pendingSelections\\(" src tests/unit/oauth -g '*.ts' -g '*.tsx'`.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, `bun run build`, `bun run test:unit`, `bun run lint:reliability`, finance, document, release, and deploy gates because this slice did not change visible UI, build-time behavior, guarded route/read contracts, financial posting, document generation, release packaging, or deployment paths.

### Goal Adaptation

Declined. The standing maintainer goal already covers centralized query keys, clear domain ownership, small reviewable diffs, and evidence-based closeout.

### Residual Risk

Low for OAuth pending-selection cache ownership. Broader OAuth setup UX and Xero tenant-selection behavior were intentionally untouched.
