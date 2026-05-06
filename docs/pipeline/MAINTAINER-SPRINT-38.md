# Pipeline Maintainer Sprint 38

## Status

Closed in commit-ready state.

## Issue 1: Quote Validity Alert Reads Lived In Quote Versioning

### Problem

`quote-versions.tsx` still owned read-only quote validity alerts and dashboard stats: expiring quotes, expired quotes, and quote validity stats. Those queries are not quote version CRUD, PDF generation, or send behavior. Keeping them in the broad quote versioning file made the server module harder to reason about.

### Workflow Spine

Pipeline quote alert hooks
-> quote validity server module
-> tenant-scoped opportunity expiry queries
-> expiring/expired quote alert and validity stats caches.

### Touched Domains

- Pipeline quote validity server reads.
- Pipeline quote versioning server module.
- Pipeline quote read hooks.
- Empty GET input schema tests.
- Pipeline quote server source contracts.
- Pipeline maintainer closeout docs.

### Business Value Protected

Operators rely on quote expiry alerts and validity stats to know which opportunities need action. These reads now have a focused server owner with the same tenant-scoped opportunity filters and won/lost exclusions.

### Scope Constraints

- Do not change query semantics, warning/default limits, tenant filters, won/lost exclusions, result shapes, hook query keys, read fallback messages, UI rendering, routing, or cache policy.
- Keep this as a server ownership extraction for read-only quote validity surfaces.
- Do not run or list serialized gates; this slice does not touch serial lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

### Changes

- Added `src/server/functions/pipeline/quote-validity.ts`.
- Moved `getExpiringQuotes`, `getExpiredQuotes`, `getQuoteValidityStatsSchema`, and `getQuoteValidityStats` into the quote validity server module.
- Updated `use-quotes.ts` to import alert/stat reads from `quote-validity`.
- Updated the empty GET input schema test to load `getQuoteValidityStatsSchema` from the new module.
- Extended the quote server validity source contract to protect the new ownership boundary.

### Standards Checked

- Domain ownership: quote validity alerts and stats now have a focused server module.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: hooks still expose the same query behavior and keys; server ownership improved; UI and cache policy stayed unchanged.
- Tenant isolation/data integrity: preserved organization-scoped opportunity filters and won/lost exclusions; no writes, inventory, or finance paths touched.
- Query/cache contract: unchanged.
- Honest UI states/operator-safe errors: unchanged; read normalization stayed in `use-quotes.ts`.
- Reviewability: bounded diff across one new server file, one broad-file cleanup, hook imports, focused tests, and this closeout.

### Smells Removed

- Read-only quote validity alert queries embedded in quote versioning/PDF/send server module.
- Empty GET schema ownership pointing at the broad quote versioning module.
- Missing source contract for quote validity server read ownership.

### Deferred

- `quote-versions.tsx` remains large and still owns versioning, PDF generation, sending, comparison, conversion validation, and validity extension.
- Browser QA remains deferred because this source-covered slice changes server ownership only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-server-validity-contract.test.ts tests/unit/empty-get-input-schemas.test.ts` - 2 files, 14 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for quote validity server ownership and hook import paths.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, tenant isolation, cache contracts, meaningful tests, and reviewable diffs.

### Residual Risk

Low for quote validity read ownership. Moderate for the remaining broad quote versioning server module because additional workflow extraction should be done through future focused slices.
