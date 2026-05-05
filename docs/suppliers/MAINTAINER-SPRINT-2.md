# Suppliers Maintainer Sprint 2

## Status

Closed in commit-ready state.

## Issue 1: Supplier Mutation Feedback Safety

### Problem

Supplier create, edit, list delete, bulk delete, bulk status update, and detail delete handlers displayed raw caught `error.message` values in toasts. Supplier server functions already return useful validation errors for duplicate email and missing suppliers, but UI mutation feedback should not depend on every thrown error being safe to display.

### Workflow Spine

Supplier create/edit/list/detail UI
-> `useCreateSupplier`, `useUpdateSupplier`, `useDeleteSupplier`
-> supplier server functions
-> supplier list/detail query invalidation
-> safe mutation toast feedback.

### Touched Domains

- Supplier mutation feedback formatter.
- Supplier create container.
- Supplier edit container.
- Supplier list container.
- Supplier detail container.
- Supplier mutation feedback tests.

### Business Value Protected

Supplier records drive procurement, pricing, purchase orders, and receiving. Failed supplier mutations should give operators safe, actionable messages without exposing database constraints, server wording, or infrastructure details.

### Scope Constraints

- Do not change supplier create/update/delete server behavior, schemas, permissions, tenant predicates, query keys, invalidations, navigation, confirmation dialogs, selection behavior, or success toasts.
- Preserve safe supplier validation messages, including duplicate email guidance.
- Hide unsafe database/constraint/infrastructure-like messages behind supplier-owned fallback copy.
- Keep read-state display cleanup separate from mutation feedback cleanup.

### Changes

- Added `formatSupplierMutationError` in `src/hooks/suppliers/_mutation-errors.ts`.
- Exported the formatter from the supplier hooks barrel.
- Routed create/edit toast descriptions through the formatter.
- Routed list delete, list bulk delete, list bulk status update, and detail delete toast errors through the formatter.
- Added focused coverage for known codes, validation field messages, safe duplicate-email copy, unsafe database-message suppression, and source-contract wiring.

### Standards Checked

- Domain ownership: supplier mutation feedback now lives under supplier hooks and is consumed by supplier containers.
- Route -> container/page -> hook -> server flow: preserved.
- Query/cache policy: supplier list/detail invalidations and mutation hooks were not changed.
- Tenant isolation/data integrity: no server function, auth boundary, organization predicate, write path, inventory side effect, finance side effect, or serialized lineage changed.
- UI states/error handling: supplier mutation failure toasts no longer render arbitrary thrown messages.
- Reviewability: the diff is limited to one formatter, five toast call sites, one barrel export, focused tests, and this closeout note.

### Smells Removed

- Raw create supplier mutation toast description.
- Raw update supplier mutation toast description.
- Raw supplier list single-delete toast error.
- Raw supplier list bulk-delete toast error.
- Raw supplier list bulk status update toast error.
- Raw supplier detail delete toast error.
- Missing regression coverage for unsafe supplier mutation message suppression.

### Deferred

- Supplier read-state presenters still render some direct read `error.message` values, including supplier list and edit load failures. Those should be handled as a separate supplier read-state slice.
- Browser QA was not selected because this was feedback-copy behavior in existing mutation failure paths with focused contract coverage.

### Gates

- Passed: focused supplier mutation/read normalization set, `./node_modules/.bin/vitest run tests/unit/suppliers/supplier-mutation-errors.test.ts tests/unit/suppliers/query-normalization-wave3b.test.tsx tests/unit/suppliers/query-normalization-wave7c.test.tsx` - 3 files, 12 tests.
- Passed: broader supplier/procurement/purchase-order/approval suite, `./node_modules/.bin/vitest run tests/unit/suppliers tests/unit/procurement tests/unit/purchase-orders tests/unit/approvals` - 71 files, 208 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for supplier mutation formatter usage, removed raw mutation `error.message` toast paths, unsafe database-error suppression coverage, and deferred read-state raw message paths.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is mutation feedback copy with no intended route, layout, or interaction change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

### Goal Adaptation

Declined. The standing maintainer goal already covers safe mutation contracts, operator-safe errors, cache contract checks, meaningful tests, and risk-selected evidence. Serialized gates remain conditional evidence only for serialized/inventory identity work.

### Residual Risk

Low for supplier mutation feedback. Supplier read-state display boundaries remain the next supplier cleanup candidate.
