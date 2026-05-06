# Pipeline Maintainer Sprint 39

## Status

Closed in commit-ready state.

## Issue 1: Quote Validity Writes And Conversion Validation Lived In Quote Versioning

### Problem

Sprint 38 moved quote validity alert reads and stats to `quote-validity.ts`, but `extendQuoteValidity` and `validateQuoteForConversion` still lived in `quote-versions.tsx`. Those functions own quote expiry business rules, not quote version CRUD or PDF/send workflows.

### Workflow Spine

Quote validity workflows
-> quote validity server module
-> tenant-scoped opportunity lookup
-> future-date guard, activity audit, or conversion validation
-> quote mutation/read hooks and unchanged caches.

### Touched Domains

- Pipeline quote validity server workflows.
- Pipeline quote versioning server module.
- Pipeline quote mutation hooks.
- Pipeline quote mutation tests.
- Pipeline quote server source contracts.
- Pipeline maintainer closeout docs.

### Business Value Protected

Operators extend quote validity and convert opportunities based on quote expiry state. Keeping these rules beside quote expiry alerts/stats makes the validity boundary easier to audit and keeps commercial quote expiry behavior coherent.

### Scope Constraints

- Do not change extension validation, transaction behavior, activity audit copy, conversion validation outputs, hook public API, cache invalidation breadth, query keys, UI rendering, routing, or operator-facing feedback.
- Leave `setDefaultQuoteExpiration` in place for a future slice because it also touches the shared default validity constant used by PDF generation.
- Do not run or list serialized gates; this slice does not touch serial lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

### Changes

- Moved `extendQuoteValidity` to `quote-validity.ts`.
- Moved `validateQuoteForConversion` to `quote-validity.ts`.
- Updated `use-quote-mutations.ts` to import `extendQuoteValidity` from the quote validity module.
- Updated mutation test mocks and quote validity ownership contract coverage.

### Standards Checked

- Domain ownership: quote validity reads, stats, extension, and conversion validation now share a focused server owner.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: hook behavior and cache policy stayed unchanged; server ownership improved.
- Tenant isolation/data integrity: preserved organization-scoped opportunity lookups, future-date validation, transaction-wrapped extension update, and activity audit insert.
- Query/cache contract: unchanged; `useExtendQuoteValidity` still uses the centralized quote expiration cache invalidation helper.
- Honest UI states/operator-safe errors: unchanged.
- Reviewability: bounded diff across server ownership, one hook import, focused tests, and this closeout.

### Smells Removed

- Quote validity extension embedded in quote versioning.
- Quote conversion validity validation embedded in quote versioning.
- Missing source contract for the validity write/validation ownership boundary.

### Deferred

- `setDefaultQuoteExpiration` remains in `quote-versions.tsx` for a future focused slice.
- `quote-versions.tsx` remains large and still owns versioning, PDF generation, sending, and comparison.
- Browser QA remains deferred because this source-covered slice changes server ownership only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-server-validity-contract.test.ts tests/unit/pipeline/quote-mutation-cache-contract.test.ts tests/unit/pipeline/use-quote-mutations.test.tsx` - 3 files, 8 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for quote validity ownership and hook import paths.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, tenant isolation, cache contracts, meaningful tests, and reviewable diffs.

### Residual Risk

Low for validity extension and conversion validation ownership. Moderate for the remaining broad quote versioning module because additional workflow extraction should continue through future focused slices.
