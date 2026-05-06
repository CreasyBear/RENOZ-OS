# Pipeline Maintainer Sprint 34

## Status

Closed in commit-ready state.

## Issue 1: Quote Delete Still Lived Inside The Large Quote Versioning Server File

### Problem

Sprint 32 moved `deleteQuote` into quote server ownership, but it still lived inside `quote-versions.tsx`, a large file that also owns quote versioning, PDF generation, sending, alerts, validity, and comparisons. Quote delete is a distinct workflow with its own tenant lookup, accepted-quote guard, outbox event, and activity log.

### Workflow Spine

Quote detail action
-> `useDeleteQuote`
-> dedicated `quote-delete.ts` server function
-> tenant-scoped quote lookup
-> accepted-quote guard
-> soft delete transaction and search outbox delete event
-> quote deletion activity log
-> quote list/detail and Pipeline metrics cache refresh.

### Touched Domains

- Pipeline quote delete server function.
- Pipeline quote versioning server module.
- Pipeline quote mutation hooks.
- Pipeline quote mutation tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Quote deletion is a commercial control point. Isolating it makes the guard against deleting accepted quotes, the tenant filter, and the search/activity evidence easier to audit without reading the broader quote versioning/PDF/send module.

### Scope Constraints

- Do not change delete quote semantics, permission, tenant filter, accepted-quote guard, soft-delete fields, search outbox action, activity log payload, mutation input/output, cache invalidation breadth, UI rendering, routing, or operator-facing error handling.
- Keep the public `useDeleteQuote` export from `@/hooks/pipeline`.
- Do not run or list serialized gates; this slice does not touch serial lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

### Changes

- Added `src/server/functions/pipeline/quote-delete.ts` for quote soft-delete behavior.
- Removed quote delete implementation, helper, excluded activity fields, quote table import, outbox import, and delete activity imports from `quote-versions.tsx`.
- Updated `use-quote-mutations.ts` to import `deleteQuote` from the dedicated quote delete module.
- Updated focused tests to protect delete quote ownership outside both broad `pipeline.ts` and quote versioning.

### Standards Checked

- Domain ownership: quote delete now has a focused server module.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: quote detail still uses the same public hook; hook now calls a dedicated server function; schema, database operation, query keys, and cache invalidation behavior stayed equivalent.
- Tenant isolation/data integrity: preserved organization-scoped quote lookup, accepted quote guard, soft delete transaction, and search outbox delete enqueue.
- Query/cache contract: preserved quote list, quote detail, and Pipeline metrics invalidation after delete.
- Honest UI states/operator-safe errors: unchanged; existing formatter-driven quote delete feedback stayed in place.
- Reviewability: bounded diff across one new server file, one hook import, one large-file cleanup, focused tests, and this closeout.

### Smells Removed

- Delete quote workflow embedded in large quote versioning/PDF/send server module.
- Quote delete-specific imports and constants in `quote-versions.tsx`.
- Client quote mutation hook importing delete from a broad quote versioning server file.

### Deferred

- `quote-versions.tsx` still owns several quote workflows and remains a candidate for future focused extraction.
- Quote generation and send invalidation breadth remain preserved rather than re-evaluated.
- Browser QA remains deferred because this source-covered slice changes server/hook ownership, not UI rendering or interaction behavior.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-mutation-cache-contract.test.ts tests/unit/pipeline/use-quote-mutations.test.tsx` - 2 files, 6 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for delete quote ownership, tenant filter, accepted-quote guard, search outbox, and hook import path.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, tenant isolation, cache contracts, meaningful tests, and reviewable diffs.

### Residual Risk

Low for delete quote ownership and behavior preservation. Moderate for the quote server module overall because other quote workflows still live together and should be decomposed only through future risk-selected slices.
