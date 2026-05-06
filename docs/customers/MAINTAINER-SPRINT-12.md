# Customers Maintainer Sprint 12

## Status

Closed in commit-ready state.

## Issue 1: Honest Customer Bulk Export State

### Problem

The customer list route did not pass an `onExport` workflow into `CustomersListContainer`, but the selected-customer bulk UI still exposed enabled Export buttons. That created a silent no-op in the floating bulk bar and the bulk operations drawer. The domain also still exported an unused `BulkExport` dialog with raw export failure feedback, making the customer bulk surface look more complete than the product actually was.

### Workflow Spine

Customers route
-> `CustomersListContainer`
-> selected-customer bulk action bar
-> `BulkOperations`
-> optional route-owned `onExport`
-> honest unavailable state when no export workflow exists.

### Touched Domains

- Customer list container.
- Customer bulk operations presenter.
- Customer bulk export barrel exports.
- Shared layout bulk actions bar.
- Customer import-surface and bulk-operation tests.
- Customer maintainer closeout docs.

### Business Value Protected

Operators should not be offered a bulk export action that silently does nothing. A missing export workflow is better represented as unavailable with a reason than as an enabled control. Retiring the unused field-selection dialog also removes stale UI that implied unsupported customer export capability.

### Scope Constraints

- Do not implement customer export generation, CSV/XLSX serialization, download handling, server export functions, route export ownership, customer list fetching, filtering, selection, bulk mutation behavior, rollback behavior, or query/cache behavior.
- Preserve the optional route-owned `onExport(ids, format)` contract for a future supported export workflow.
- Keep this as honest UI state and dead-surface removal, not a broad customer export feature build.
- Serialized gates are retired from routine closeout evidence; do not run them for this customer slice because it does not touch serial lineage, inventory identity, warranty/RMA continuity, or repair scripts.

### Changes

- Added an optional `title` field to shared layout bulk actions so disabled actions can explain themselves.
- Derived `canBulkExport` from the presence of the route-owned `onExport` handler.
- Disabled the floating customer Export action when no export workflow is wired and attached the unavailable reason.
- Made `BulkOperations.onExport` optional and added `canExport` / `exportUnavailableReason` props.
- Added a visible `Bulk export unavailable` alert inside the bulk operations drawer.
- Retired the unused `BulkExport` dialog file and removed it from customer bulk/domain barrel exports.
- Added focused coverage for disabled export state and the retired bulk export dialog import surface.

### Standards Checked

- Domain ownership: the active customer bulk export state is owned by `CustomersListContainer` and presented by `BulkOperations`; the orphaned dialog is no longer exported as a supported customer surface.
- Route -> container/page -> hook -> server -> schema/database -> query key/cache policy: clarified. This slice makes explicit that the current route has no export workflow beyond the optional route callback.
- Query/cache policy: unchanged. No customer query keys, invalidation, reads, or mutations changed.
- Tenant isolation/data integrity: unchanged. No server function, auth predicate, organization predicate, database write, or data export implementation changed.
- UI states/error handling: strengthened. Export is no longer an enabled no-op, and unsupported export is explained in the drawer.
- Reviewability: the behavior diff is small, while a large unused dialog surface is removed.

### Smells Removed

- Enabled customer bulk Export button with no route export handler.
- Enabled drawer Export button with no route export handler.
- Orphaned `BulkExport` dialog surface.
- Raw export failure toast inside the unused dialog.
- Public barrel exports implying a supported `BulkExport` component.

### Deferred

- Actual customer export implementation remains a product workflow decision.
- Route-owned export generation and download handling remain unimplemented.
- Field-level export selection, CSV/XLSX formatting, and export authorization were not designed in this slice.
- Browser QA was not run because this is a small disabled-state/dead-surface slice covered by focused component/source tests.

### Gates

- Passed: focused customer bulk/export tests, `./node_modules/.bin/vitest run tests/unit/customers/bulk-operations.test.tsx tests/unit/customers/customer-import-surface.test.ts` - 2 files, 8 tests.
- Passed: broader customer suite, `./node_modules/.bin/vitest run tests/unit/customers` - 14 files, 50 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Passed: targeted source scan for removed raw export failure fallback and retired `bulk-export` import paths.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this slice removes a dead dialog and adds a disabled/unavailable state without changing route layout.
- Skipped: reliability, finance, document, release, and deploy gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, or repair scripts.
- Skipped: serialized gates because they are retired from routine closeout evidence and this slice did not touch serialized lineage, inventory identity, serialized movement, or warranty/RMA serial continuity.

### Goal Adaptation

Declined. The standing maintainer goal already covers honest UI states, domain ownership, reviewable diffs, meaningful tests, and evidence-based closeout.

### Residual Risk

Low for the current customer bulk export UI state. Customer export remains absent by design after this slice; the next export sprint should start from the route-owned workflow and server/data contract rather than reviving the retired dialog.
