# Pipeline Maintainer Sprint 41

## Status

Closed in commit-ready state.

## Issue 1: Manual Quote Expiration Update Still Lived In Quote Versioning

### Problem

After Sprint 40, default quote expiration, validity extension, conversion validation, alert reads, and stats all lived in `quote-validity.ts`, but `updateQuoteExpiration` still lived in `quote-versions.tsx`. Manual expiry edits are quote-validity behavior, not quote version CRUD, PDF generation, or send behavior.

### Workflow Spine

Manual quote expiration edit
-> quote mutation hook
-> quote validity server module
-> tenant-scoped opportunity update
-> expiry alert/list/opportunity caches unchanged.

### Touched Domains

- Pipeline quote validity server workflows.
- Pipeline quote versioning server module.
- Pipeline quote mutation hooks.
- Pipeline quote mutation tests.
- Pipeline quote server source contracts.
- Pipeline maintainer closeout docs.

### Business Value Protected

Operators adjust quote expiry dates to keep commercial follow-up accurate. Keeping manual expiry edits beside defaulting and extension makes quote validity easier to audit and reduces the chance that quote document/version work accidentally owns commercial expiry rules.

### Scope Constraints

- Do not change manual expiry input shape, default validity days, quote version CRUD, PDF generation, send behavior, UI rendering, route behavior, query keys, or cache invalidation.
- Keep this as a server ownership extraction with a tenant-scope hardening on the touched write.
- Serialized gates remain retired infrastructure for this unrelated pipeline quote slice.

### Changes

- Moved `updateQuoteExpiration` from `quote-versions.tsx` to `quote-validity.ts`.
- Updated `use-quote-mutations.ts` to import manual expiry updates from the quote validity module.
- Updated quote mutation test mocks for the new server ownership boundary.
- Extended the source contract to keep quote validity workflows out of quote versioning.
- Hardened the manual expiry update so the write itself includes the organization predicate.

### Standards Checked

- Domain ownership: quote expiry reads, stats, defaulting, manual updates, extension, and conversion validation now share the quote validity server owner.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: mutation hook and cache invalidation stayed unchanged; server ownership improved.
- Tenant isolation/data integrity: manual expiry write now includes `opportunities.organizationId = ctx.organizationId` in the update predicate.
- Query/cache contract: unchanged; manual expiry updates still invalidate opportunity, expiry alert, and opportunity list caches through the centralized helper.
- Honest UI states/operator-safe errors: unchanged at the UI layer; missing opportunities still use the domain `NotFoundError`.
- Reviewability: bounded diff across server ownership, one hook import, test mocks, focused source contract, and this closeout.

### Smells Removed

- Manual quote expiration update embedded in quote versioning.
- Manual expiry write relying on a pre-read for tenant scoping while the update itself only filtered by opportunity id.
- Mutation hook importing validity writes from the broad quote versioning module.

### Deferred

- `quote-versions.tsx` remains large and still owns quote version CRUD, PDF generation, sending, and comparison.
- Browser QA remains deferred because this source-covered slice changes server ownership and tenant predicate hardening only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-server-validity-contract.test.ts tests/unit/pipeline/quote-mutation-cache-contract.test.ts tests/unit/pipeline/use-quote-mutations.test.tsx tests/unit/empty-get-input-schemas.test.ts` - 4 files, 21 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for quote validity ownership and tenant write predicate.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal and current process already cover domain ownership, tenant isolation, cache contracts, meaningful tests, retired routine serialized gates, and reviewable diffs.

### Residual Risk

Low for manual quote expiration ownership and tenant predicate hardening. Moderate for the remaining broad quote versioning server module because quote PDF/send/comparison extraction remains future work.
