# Pipeline Maintainer Sprint 37

## Status

Closed in commit-ready state.

## Issue 1: Quote Server Dependencies Were Declared Mid-File

### Problem

`quote-versions.tsx` declared PDF, storage, Resend, document, address, organization, and email history imports halfway through the file near the workflows that used them. That made dependency ownership harder to scan and was already called out by the quote PDF/send code trace as unusual ordering.

### Workflow Spine

Quote server module
-> quote version, PDF generation, send, alert, validity, and comparison server functions
-> top-level dependency imports
-> unchanged server behavior.

### Touched Domains

- Pipeline quote server module.
- Pipeline quote server source contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Quote PDF generation and sending are commercial document workflows. Keeping their dependencies visible at the top of the server module makes future refactors easier to audit and less likely to miss storage, email, document, or schema coupling.

### Scope Constraints

- Do not change quote server function behavior, mutation inputs/outputs, database queries, storage behavior, email sending, query keys, cache policy, UI rendering, routing, or operator-facing feedback.
- Keep this as an import-order and dependency-visibility cleanup.
- Do not run or list serialized gates; this slice does not touch serial lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

### Changes

- Moved PDF/storage/document imports to the module import block.
- Moved `Resend`, address/customer/organization, and email history imports to the module import block.
- Consolidated `drizzle/schema` imports.
- Added a source contract that prevents future mid-file import declarations in `quote-versions.tsx`.

### Standards Checked

- Domain ownership: quote server dependencies are visible at module top.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: server source organization improved; hooks, schemas, database behavior, query keys, routes, and UI stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicate, auth boundary, organization scope, transaction, inventory, or finance path touched.
- Query/cache contract: unchanged.
- Honest UI states/operator-safe errors: unchanged.
- Reviewability: bounded diff across one server file, one source contract, and this closeout.

### Smells Removed

- Mid-file PDF/storage/document imports.
- Mid-file email history import.
- Split `drizzle/schema` import ownership inside one server module.

### Deferred

- `quote-versions.tsx` remains large and still owns multiple quote workflows.
- Browser QA remains deferred because this source-covered slice changes import organization only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-server-import-order-contract.test.ts` - 1 file, 1 test.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for mid-file imports.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain cleanliness and reviewable diffs.

### Residual Risk

Low. This is an import organization cleanup with no intended behavior change.
