# Pipeline Maintainer Sprint 40

## Status

Closed in commit-ready state.

## Issue 1: Default Quote Expiration Still Lived In Quote Versioning

### Problem

Sprint 39 moved quote validity extension and conversion validation into `quote-validity.ts`, but `setDefaultQuoteExpiration` still lived in `quote-versions.tsx`. That kept a quote-expiry write inside the quote version/PDF/send module and left the default validity rule tied to a broad server file.

### Workflow Spine

Set default quote expiration
-> quote validity server module
-> shared quote validity default
-> tenant-scoped opportunity update
-> generated PDF fallback validity stays on the same default.

### Touched Domains

- Pipeline quote validity server workflows.
- Pipeline quote versioning server module.
- Pipeline generated quote PDF fallback validity.
- Pipeline quote server source contracts.
- Pipeline maintainer closeout docs.

### Business Value Protected

Operators need quote expiry behavior to stay coherent across pipeline actioning and customer-facing quote documents. Keeping the default expiration write and PDF validity fallback on the same shared rule prevents commercial quote validity drift.

### Scope Constraints

- Do not change default validity days, opportunity update semantics, tenant predicates, generated PDF data shape, quote version CRUD, PDF generation behavior, send behavior, hooks, query keys, cache invalidation, routing, or UI feedback.
- Keep this as a server ownership extraction and shared-rule cleanup.
- Do not run or list serialized gates; the serialized gate pack is closed and this slice does not touch serial lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

### Changes

- Added a shared `DEFAULT_QUOTE_VALIDITY_DAYS` server constant for quote validity workflows.
- Moved `setDefaultQuoteExpiration` from `quote-versions.tsx` to `quote-validity.ts`.
- Kept generated quote PDF fallback validity on the same shared default.
- Updated the quote server validity source contract to protect the ownership boundary and shared default.

### Standards Checked

- Domain ownership: quote expiry reads, stats, defaulting, extension, and conversion validation now share the quote validity server owner.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: hooks, routes, query keys, and cache behavior stayed unchanged; server ownership improved.
- Tenant isolation/data integrity: preserved organization-scoped opportunity update and authenticated updater attribution.
- Query/cache contract: unchanged.
- Honest UI states/operator-safe errors: unchanged.
- Reviewability: bounded diff across one server owner, one broad-file cleanup, one tiny shared constant, focused tests, and this closeout.

### Smells Removed

- Default quote expiration write embedded in quote versioning.
- Default quote validity business rule defined inside the broad quote version/PDF/send module.
- Missing source contract that default expiration belongs with quote validity ownership.

### Deferred

- `quote-versions.tsx` remains large and still owns versioning, PDF generation, sending, and comparison.
- Browser QA remains deferred because this source-covered slice changes server ownership only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-server-validity-contract.test.ts tests/unit/empty-get-input-schemas.test.ts tests/unit/pipeline/quote-server-import-order-contract.test.ts` - 3 files, 15 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for quote validity default ownership.
- Passed: `git diff --check`.

### Goal Adaptation

Accepted in execution. The standing process already says the serialized gate pack is closed work; this sprint applies that posture by excluding retired serialized gates from closeout evidence for an unrelated pipeline quote slice.

### Residual Risk

Low for default quote expiration ownership. Moderate for the remaining broad quote versioning server module because additional workflow extraction should continue through future focused slices.
