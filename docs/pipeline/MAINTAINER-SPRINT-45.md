# Pipeline Maintainer Sprint 45

## Status

Closed in commit-ready state.

## Issue 1: Quote Version Reads Lived With Quote Version Writes

### Problem

After Sprint 44, `quote-versions.tsx` was reduced to quote version CRUD/restore, but it still mixed read-only detail/history server functions with create/restore write behavior. Quote history reads have their own hook/cache contract and can be owned separately.

### Workflow Spine

Quote version history/detail reads
-> quote read hook
-> quote version read server module
-> tenant-scoped quote/opportunity reads
-> quote version and quote history query keys unchanged.

### Touched Domains

- Pipeline quote version read server workflows.
- Pipeline quote version write/restore server module.
- Pipeline quote read hooks.
- Pipeline quote server source contracts.
- Pipeline maintainer closeout docs.

### Business Value Protected

Operators use quote version history and detail reads to review commercial revisions before restoring, generating PDFs, or sending quotes. Keeping reads separate from write/restore logic makes quote history easier to reason about and safer to maintain.

### Scope Constraints

- Do not change read inputs, result shapes, sort order, read fallback messages, query keys, stale times, UI behavior, create behavior, restore behavior, PDF generation, or send behavior.
- Keep this as a read-only server ownership extraction with tenant-scope hardening on the quote history query.
- Serialized gates remain retired infrastructure for this unrelated pipeline quote read slice.

### Changes

- Added `quote-version-reads.ts` as the server owner for `getQuoteVersion` and `listQuoteVersions`.
- Updated `use-quotes.ts` to import version reads from the focused read module.
- Removed read schema/input-normalization dependencies from `quote-versions.tsx`.
- Added a source contract for read ownership, tenant predicates, sort order, and unchanged hook query keys.
- Hardened `listQuoteVersions` so the quote version history query includes `quoteVersions.organizationId = ctx.organizationId`, not only the pre-read opportunity tenant check.

### Standards Checked

- Domain ownership: quote version reads now have a focused server owner separate from create/restore writes.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: hook behavior, read normalization, query keys, and stale times stayed unchanged; server ownership improved.
- Tenant isolation/data integrity: preserved organization-scoped quote detail and opportunity reads; quote history list now also filters quote versions by organization id.
- Query/cache contract: unchanged; version detail/history still use centralized `queryKeys.pipeline.quoteVersion` and `queryKeys.pipeline.quoteVersions`.
- Honest UI states/operator-safe errors: unchanged; read normalization stays in `use-quotes.ts`.
- Reviewability: bounded diff across one new read server module, one hook import, one source contract, and this closeout.

### Smells Removed

- Quote history/detail reads embedded in quote version write/restore ownership.
- Quote version write module importing read filter/params schemas only for reads.
- Quote history list relying on opportunity pre-read for tenant scope while the version query only filtered by opportunity id.

### Deferred

- `quote-versions.tsx` still owns create and restore writes; those can be separated later if the workflow needs further write-boundary hardening.
- Browser QA remains deferred because this source-covered slice changes server ownership and tenant predicate hardening only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-server-version-read-contract.test.ts tests/unit/pipeline/quote-server-comparison-contract.test.ts tests/unit/pipeline/quote-server-import-order-contract.test.ts tests/unit/empty-get-input-schemas.test.ts` - 4 files, 15 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for quote version read ownership and tenant predicates.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal and current process already cover domain ownership, tenant isolation, read/cache contracts, meaningful tests, retired routine serialized gates, and reviewable diffs.

### Residual Risk

Low for quote version read ownership and tenant predicate hardening. Moderate for quote write ownership because create and restore remain together in `quote-versions.tsx`.
