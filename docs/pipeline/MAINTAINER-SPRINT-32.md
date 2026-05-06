# Pipeline Maintainer Sprint 32

## Status

Closed in commit-ready state.

## Issue 1: Delete Quote Server Function Lived In The Large Pipeline Server Module

### Problem

Sprint 31 moved `useDeleteQuote` into the quote mutation hooks, but the server function still lived in `pipeline.ts`. That left quote delete split across a quote-owned client hook and a broad opportunity lifecycle server module.

### Workflow Spine

Quote detail action
-> `useDeleteQuote`
-> quote-owned `deleteQuote` server function
-> tenant-scoped quote lookup
-> accepted-quote guard
-> soft delete transaction and search outbox delete event
-> quote deletion activity log
-> quote list/detail and Pipeline metrics cache refresh.

### Touched Domains

- Pipeline quote server functions.
- Pipeline opportunity lifecycle server module.
- Pipeline quote mutation hooks.
- Pipeline quote mutation tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Quote deletion is a commercial workflow: operators must not delete accepted quotes, deleted quotes must leave search and activity evidence, and cache refresh must keep quote and Pipeline views current. Owning the server function beside other quote server functions makes that workflow easier to audit.

### Scope Constraints

- Do not change delete quote semantics, permission, tenant filter, accepted-quote guard, soft-delete fields, search outbox action, activity log payload, mutation input/output, cache invalidation breadth, UI rendering, routing, or operator-facing error handling.
- Keep the public `useDeleteQuote` export from `@/hooks/pipeline`.
- Do not run or list serialized gates; this slice does not touch serial lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

### Changes

- Moved `deleteQuote` from `pipeline.ts` to `quote-versions.tsx`.
- Moved quote delete helper ownership, quote excluded activity fields, quote table access, search outbox enqueue, and activity logging imports into the quote server module.
- Removed quote-table delete ownership from the broad Pipeline server module.
- Updated `use-quote-mutations.ts` to import `deleteQuote` from the quote server module.
- Updated focused quote mutation tests to protect client and server ownership boundaries.

### Standards Checked

- Domain ownership: quote delete client and server ownership now sit with quote mutation/server modules.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: quote detail still uses the same public hook; hook now calls a quote-owned server function; schema, database operation, query keys, and cache invalidation behavior stayed equivalent.
- Tenant isolation/data integrity: preserved organization-scoped quote lookup with `buildQuoteByIdWhere(id, ctx.organizationId)`, accepted quote guard, soft delete transaction, and search outbox delete enqueue.
- Query/cache contract: preserved quote list, quote detail, and Pipeline metrics invalidation after delete.
- Honest UI states/operator-safe errors: unchanged; existing formatter-driven quote delete feedback stayed in place.
- Reviewability: bounded diff across server ownership, one hook import, focused tests, and this closeout.

### Smells Removed

- Quote delete server function living in the broad opportunity lifecycle server module.
- Quote delete helper and activity excluded fields living away from quote server ownership.
- Client quote mutation hook importing a server function from the wrong Pipeline module.

### Deferred

- `quote-versions.tsx` remains large and owns quote versioning, PDF generation, send, alerts, validity, and delete; deeper server-file decomposition is a separate architecture slice.
- Broader quote mutation invalidation breadth remains preserved rather than re-evaluated.
- Browser QA remains deferred because this source-covered slice changes server/hook ownership, not UI rendering or interaction behavior.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-mutation-cache-contract.test.ts tests/unit/pipeline/use-quote-mutations.test.tsx` - 2 files, 6 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for delete quote server ownership, tenant filter, accepted-quote guard, search outbox, and hook import path.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, tenant isolation, cache contracts, meaningful tests, and reviewable diffs.

### Residual Risk

Low for delete quote ownership and behavior preservation. Moderate for the quote server module overall because it is still a large mixed quote workflow file and should be decomposed only through future risk-selected quote slices.
