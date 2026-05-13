# Inventory Maintainer Sprint 182: Alert Tenant Scope Contract Alignment

## Status

Closed in commit-ready state.

## Issue 1: Alert Permission Contract Rejected Scoped Helper Predicate

### Problem

The inventory alert permission contract failed during the health audit because it expected product organization scoping to appear as an inline `ctx.organizationId` predicate. The implementation already routed product detail reads through `alertProductWhereCondition(productId, organizationId)`, which applies product ID, organization ID, and deleted-product filtering. The test was proving an older spelling instead of the current shared predicate.

### Workflow Spine

Inventory alert read
-> `getAlert`
-> tenant-scoped alert row
-> product/location detail reads
-> scoped product helper / scoped location predicate
-> operator alert detail.

Triggered alert evaluation
-> `checkAlertTriggered`
-> organization-scoped inventory rows
-> scoped product joins and detail reads
-> scoped location predicates
-> triggered alert payload.

### Touched Domains

- Inventory alert tenant-scope contract.
- Inventory maintainer closeout docs.

### Business Value Protected

Inventory alerts drive reorder and warehouse attention. Alert detail and triggered-alert payloads must never resolve product or location metadata across tenants, and the test suite needs to prove the real scoping mechanism rather than a stale inline expression.

### Scope Constraints

- Do not change inventory alert runtime behavior; source inspection showed the implementation was already tenant-scoped.
- Keep this slice limited to contract alignment and closeout.
- Do not relax permission counts or mutate/read permission separation.

### Changes

- Updated the inventory alert permission contract to prove `alertProductWhereCondition(productId, organizationId)` owns product scoping.
- Kept explicit assertions for context-scoped and helper-scoped warehouse location predicates.
- Added assertions that both direct alert detail reads and triggered-alert detail reads call the scoped product helper.

### Standards Checked

- Domain ownership: inventory alert scope contract remains in inventory tests.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: checked at the server function/data-access layer only.
- Tenant isolation/data integrity: improved verification; product and location detail reads are proved organization-scoped through the actual helper/call sites.
- Transactional inventory/finance integrity: not touched.
- Serialized lineage continuity: not touched.
- Honest UI/error handling: not touched.
- Query/cache contract: not touched.
- Reviewability: one focused test alignment and one closeout note.

### Smells Removed

- Brittle source contract that required duplicated inline product organization predicates.
- Red health-audit failure for a tenant-scope contract that the source already satisfied.

### Deferred

- Broader full-suite failures from the health audit remain release-readiness stabilization work.
- Inventory alert runtime refactoring remains deferred; this slice only corrects verification.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/alert-permission-contract.test.ts tests/unit/inventory/alert-tenant-scope-contract.test.ts tests/unit/inventory/alert-schema-ownership.test.ts`.
- Passed: `./node_modules/.bin/eslint tests/unit/inventory/alert-permission-contract.test.ts --report-unused-disable-directives`.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This sprint continues tenant-isolation verification cleanup under the standing maintainer goal.

### Residual Risk

Low. No runtime behavior changed; the contract now matches the actual organization-scoping abstraction.
