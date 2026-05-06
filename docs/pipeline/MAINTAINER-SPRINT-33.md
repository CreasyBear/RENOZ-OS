# Pipeline Maintainer Sprint 33

## Status

Closed in commit-ready state.

## Issue 1: Quote Expiration Mutations Repeated The Same Cache Refresh Group

### Problem

`useUpdateQuoteExpiration` and `useExtendQuoteValidity` both refreshed the opportunity detail, quote expiry alert caches, and opportunity list caches inline. The invalidation breadth was intentional, but keeping the group repeated made quote expiration cache policy harder to audit.

### Workflow Spine

Quote expiration mutation
-> quote server function
-> quote mutation hook success handler
-> opportunity detail, expiring/expired quote alerts, and opportunity list caches.

### Touched Domains

- Pipeline quote mutation hooks.
- Pipeline quote mutation cache contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Quote expiry changes affect active quote warnings, expired quote alerts, opportunity cards, and opportunity list rows. Operators need those surfaces to refresh together when a quote expiration is updated or extended.

### Scope Constraints

- Do not change quote expiration server behavior, mutation inputs/outputs, query key definitions, cache invalidation breadth, UI rendering, routing, or operator-facing feedback.
- Keep this as a local quote mutation cache-policy cleanup.
- Do not run or list serialized gates; this slice does not touch serial lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

### Changes

- Added `invalidateQuoteExpirationCaches(queryClient, opportunityId)`.
- Replaced repeated expiration update and validity extension invalidation groups with the helper.
- Updated the focused quote mutation cache contract to keep the expiration refresh policy centralized.

### Standards Checked

- Domain ownership: quote expiration cache policy is now named inside the quote mutation hook module.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: hook cache policy improved; server functions, schemas, database writes, query keys, route, and UI stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicate, auth boundary, organization scope, transaction, inventory, or finance path touched.
- Query/cache contract: preserved opportunity detail, quote expiry alert, and opportunity list invalidation breadth for both expiration mutations.
- Honest UI states/operator-safe errors: unchanged; mutation feedback stayed formatter-driven.
- Reviewability: bounded diff across one hook, one source contract, and this closeout.

### Smells Removed

- Duplicate quote expiration invalidation group across update and extend mutations.
- Missing named cache contract for quote expiration mutations.

### Deferred

- Quote generation and send invalidation breadth remain preserved rather than re-evaluated.
- `quote-versions.tsx` remains a large server module and needs future risk-selected decomposition.
- Browser QA remains deferred because this source-covered slice changes cache-policy structure, not UI rendering or interaction behavior.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-mutation-cache-contract.test.ts tests/unit/pipeline/use-quote-mutations.test.tsx` - 2 files, 6 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for centralized quote expiration invalidation.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers clear cache contracts, meaningful tests, and reviewable diffs.

### Residual Risk

Low for quote expiration cache policy. Moderate for broader quote mutation cache policy because PDF generation and quote sending still carry broader invalidation behavior that was intentionally preserved, not redesigned.
