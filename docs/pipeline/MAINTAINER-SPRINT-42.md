# Pipeline Maintainer Sprint 42

## Status

Closed in commit-ready state.

## Issue 1: Quote Comparison Lived In Quote Versioning

### Problem

`quote-versions.tsx` still owned `compareQuoteVersions`, a read-only quote history comparison workflow. Comparison is not quote version creation, restoration, PDF generation, or sending, and keeping it in the broad module made the quote server boundary harder to reason about.

### Workflow Spine

Quote version comparison view
-> quote read hook
-> quote comparison server module
-> tenant-scoped quote version reads
-> comparison query key/cache policy unchanged.

### Touched Domains

- Pipeline quote comparison server reads.
- Pipeline quote versioning server module.
- Pipeline quote read hooks.
- Pipeline quote server source contracts.
- Pipeline maintainer closeout docs.

### Business Value Protected

Operators compare quote versions to understand price and scope changes before restoring, sending, or discussing revisions. Isolating comparison keeps quote history review auditable without reading PDF/send logic.

### Scope Constraints

- Do not change comparison inputs, result shape, difference math, tenant predicates, query key, cache behavior, hook read normalization, UI behavior, quote version CRUD, PDF generation, or send behavior.
- Keep this as a read-only server ownership extraction.
- Serialized gates remain retired infrastructure for this unrelated pipeline quote slice.

### Changes

- Added `quote-comparison.ts` as the server owner for `compareQuoteVersions`.
- Removed quote comparison logic and the now-unused `zod` import from `quote-versions.tsx`.
- Updated `use-quotes.ts` to import comparison reads from the focused server module.
- Added a source contract covering comparison ownership, tenant predicates, same-opportunity validation, and unchanged query key usage.

### Standards Checked

- Domain ownership: quote comparison now has a focused server owner instead of living in quote version/PDF/send.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: hook behavior, read normalization, query key, and stale time stayed unchanged; server ownership improved.
- Tenant isolation/data integrity: preserved organization-scoped reads for both compared quote versions and same-opportunity validation.
- Query/cache contract: unchanged; comparison still uses `queryKeys.pipeline.quoteComparison(version1Id, version2Id)`.
- Honest UI states/operator-safe errors: unchanged; read normalization stays in `use-quotes.ts`.
- Reviewability: bounded diff across one new server file, one import split, one source contract, and this closeout.

### Smells Removed

- Read-only comparison embedded in quote versioning/PDF/send.
- Quote versioning retaining a `zod` import only for comparison input parsing.
- Missing source contract for the quote comparison ownership boundary.

### Deferred

- `quote-versions.tsx` remains large and still owns quote version CRUD, PDF generation, and sending.
- Browser QA remains deferred because this source-covered slice changes server ownership only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-server-comparison-contract.test.ts tests/unit/pipeline/quote-server-import-order-contract.test.ts tests/unit/empty-get-input-schemas.test.ts` - 3 files, 14 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for quote comparison ownership.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal and current process already cover domain ownership, tenant isolation, query/cache contracts, meaningful tests, retired routine serialized gates, and reviewable diffs.

### Residual Risk

Low for quote comparison ownership. Moderate for the remaining broad quote versioning server module because quote PDF/send and CRUD extraction boundaries still need future sprints.
