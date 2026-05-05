# Suppliers Maintainer Sprint 3

## Status

Closed in commit-ready state.

## Issue 1: Supplier Read-State Feedback Safety

### Problem

Supplier read hooks already normalize list and detail failures through the shared read-path policy, but the supplier list presenter and edit container still displayed direct `error.message` values. That meant a raw database, constraint, transport, or infrastructure error could leak into operator-facing supplier screens if a failure bypassed the normalized hook contract.

### Workflow Spine

Supplier routes
-> supplier list/edit containers
-> `useSuppliers` / `useSupplier`
-> supplier server functions
-> `queryKeys.suppliers`
-> supplier list/detail UI read states.

### Touched Domains

- Supplier read-state feedback helper.
- Supplier list presenter.
- Supplier edit container.
- Supplier read-state contract tests.

### Business Value Protected

Supplier records drive procurement, pricing, purchase orders, and receiving. When supplier reads fail, operators need stable recovery copy, not database internals or infrastructure wording. This keeps supplier maintenance safer and less frustrating while preserving the normalized read-path contract already established in the hooks.

### Scope Constraints

- Do not change supplier server functions, schemas, tenant predicates, query keys, stale times, cache invalidation, list selection, sorting, pagination, navigation, form reset behavior, or supplier mutation behavior.
- Preserve normalized read-query messages from `ReadQueryError`.
- Hide arbitrary non-read errors behind supplier-owned fallback copy.
- Keep supplier detail view not-found copy unchanged because it already avoids raw error display.

### Changes

- Added `supplier-read-error-messages.ts` with list/detail read-state fallback copy.
- Routed supplier list hard-error descriptions through `getSupplierListReadErrorMessage`.
- Routed supplier edit load failures through `getSupplierDetailReadErrorMessage`.
- Added focused coverage for normalized read-query copy, raw database-error suppression, missing edit-detail copy, presenter rendering, and source-contract wiring.

### Standards Checked

- Domain ownership: supplier read feedback now lives under the supplier domain beside the affected UI surfaces.
- Route -> container/page -> hook -> server -> schema/database -> query key/cache policy: preserved. This sprint only changed the UI read-state consumption boundary.
- Query/cache policy: no query keys, stale times, invalidations, or cache writes changed.
- Tenant isolation/data integrity: no server function, auth boundary, organization predicate, write path, inventory transaction, finance artifact, or serialized lineage behavior changed.
- UI states/error handling: list and edit hard-read failures no longer render arbitrary thrown messages.
- Reviewability: the diff is limited to one small helper, two UI call sites, one focused test file, and this closeout note.

### Smells Removed

- Raw supplier list read `error.message` display.
- Raw supplier edit load `error.message` display.
- Missing supplier read-state regression coverage.

### Deferred

- Supplier detail view remains a large surface with degraded panels and should be kept under domain-sliced review, but this sprint did not find a raw hard-error leak in the detail container.
- Browser QA was not selected because this is read-state copy behavior with focused component/source-contract coverage and no layout or route behavior change.

### Gates

- Passed: focused supplier read/mutation normalization set, `./node_modules/.bin/vitest run tests/unit/suppliers/supplier-read-state.test.tsx tests/unit/suppliers/supplier-mutation-errors.test.ts tests/unit/suppliers/query-normalization-wave3b.test.tsx tests/unit/suppliers/query-normalization-wave7c.test.tsx` - 4 files, 15 tests.
- Passed: broader supplier/procurement/purchase-order/approval suite, `./node_modules/.bin/vitest run tests/unit/suppliers tests/unit/procurement tests/unit/purchase-orders tests/unit/approvals` - 72 files, 211 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Passed: targeted source scan for supplier read-state raw error display, helper wiring, and deferred notes.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because the slice changes fallback copy routing only.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, finance integrity, document generation, release packaging, or repair scripts.

### Goal Adaptation

Accepted the operational goal adjustment from this session: serialized gates are no longer routine sprint evidence. The maintainer process already records that `bun run reliability:serialized-gates` should only reopen when a slice deliberately changes serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or a related repair script. This sprint applies that rule.

### Residual Risk

Low for supplier list/edit read-state leakage. The supplier domain is now cleaner across price import row results, mutation feedback, and list/edit read-state feedback; next supplier work should shift to workflow friction or module shape rather than continuing generic error-copy cleanup.
