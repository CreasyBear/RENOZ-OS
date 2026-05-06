# Suppliers Maintainer Sprint 11

## Status

Closed in commit-ready state.

## Issue 1: Supplier Route Bulk Failures Could Surface Raw Mutation Errors

### Problem

The supplier route already had a supplier-domain mutation formatter, but the route-level supplier directory still used raw `error.message` for single delete failures. Its bulk delete and bulk status actions also called `executeBulkAction` without `formatError`, so rejected mutation reasons could flow into per-row failure summaries.

### Workflow Spine

Supplier directory route
-> `useSuppliers`
-> `useDeleteSupplier` / `useUpdateSupplier`
-> supplier server mutation
-> supplier list cache invalidation
-> single or bulk operator toast.

### Touched Domains

- Supplier directory route mutation feedback.
- Supplier mutation feedback source contract.
- Supplier maintainer closeout docs.

### Business Value Protected

Suppliers support procurement, price lists, PO creation, receiving, and vendor follow-up. Delete and status-update failures should give operators recoverable supplier-domain copy without leaking database, constraint, or stack details in single or bulk workflows.

### Scope Constraints

- Do not change supplier server functions, supplier schemas, query keys, cache invalidation, selection behavior, confirmation behavior, routing, table layout, or bulk action execution semantics.
- Keep this as route-level feedback wiring using the existing supplier formatter.

### Changes

- Imported `formatSupplierMutationError` into the supplier directory route.
- Routed single supplier delete failures through the supplier formatter.
- Added `formatError` to route-level bulk delete.
- Added `formatError` to route-level bulk status update.
- Extended the supplier mutation feedback contract to cover the route page and prevent the raw error fallback from returning.

### Standards Checked

- Domain ownership: unchanged; supplier mutation feedback remains in `src/hooks/suppliers/_mutation-errors.ts`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved; this patch only changes route feedback copy around existing mutation hooks.
- Tenant isolation/data integrity: unchanged; no server functions, organization predicates, schemas, or database writes changed.
- Query/cache contract: unchanged; `useDeleteSupplier` and `useUpdateSupplier` continue to own invalidation.
- Honest UI states/operator-safe errors: improved for supplier delete and bulk action failure summaries.
- Reviewability: bounded diff across one route, one source contract, and this closeout.

### Smells Removed

- Raw `error.message` fallback in supplier route single delete feedback.
- Bulk supplier delete summaries using raw rejected mutation reasons.
- Bulk supplier status summaries using raw rejected mutation reasons.

### Deferred

- `executeBulkAction` still defaults to raw rejected messages when callers omit `formatError`; hardening the shared helper would be a cross-domain behavior change and should be handled separately.
- Browser QA remains deferred because this slice changes failure-copy wiring only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/suppliers/supplier-mutation-errors.test.ts` (1 file, 3 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for supplier route formatter wiring and removed raw route feedback.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, safe mutation contracts, workflow spines, meaningful tests, and reviewable diffs.

### Residual Risk

Low for supplier route mutation feedback. Moderate across shared bulk actions because other callers may still omit `formatError`.
