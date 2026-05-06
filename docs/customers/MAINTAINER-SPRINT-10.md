# Customers Maintainer Sprint 10

## Status

Closed in commit-ready state.

## Issue 1: Bulk Rollback Cache Contract and Failure Copy

### Problem

Customer bulk rollback is a supported recovery workflow after bulk operations. The rollback hook still used an ad hoc recent-operations query key, only invalidated list/history caches after rollback, and surfaced raw rollback mutation failures to operators. For health-score rollbacks, that could leave customer detail and health surfaces stale while exposing unsafe backend messages during a recovery action.

### Workflow Spine

Customers list route
-> `CustomersListContainer`
-> `RollbackUI`
-> `useRecentBulkOperations`
-> `useRollbackBulkOperation`
-> `rollbackBulkOperation`
-> tenant-scoped `auditLogs` lookup
-> transactional `customers` health-score restore
-> rollback audit write
-> restored customer ID return
-> list/detail/health/recent-operation cache invalidation
-> operator-safe rollback failure toast.

### Touched Domains

- Customer rollback hook.
- Customer health hook.
- Customer query key factory.
- Customer rollback server function.
- Customer mutation/cache contract tests.
- Customer maintainer closeout docs.

### Business Value Protected

Bulk rollback is the escape hatch when an operator changes multiple customer health scores incorrectly. After a rollback, customer lists, open customer detail pages, health widgets, and customer analytics need to stop showing the reverted state. If rollback fails, operators need safe recovery copy rather than raw infrastructure or validation internals.

### Scope Constraints

- Do not change `RollbackUI`, confirmation behavior, rollback availability rules, recent-operation server filters, audit-log selection, supported rollback operation types, health-score restore semantics, success copy, or customer list bulk operation behavior.
- Keep rollback support limited to the currently implemented `customer.bulk_update_health_scores` server branch.
- Preserve the existing organization predicate and transaction boundary around the rollback write.
- Serialized gates are retired from routine closeout evidence; do not run them for this customer slice because it does not touch serial lineage, inventory identity, warranty/RMA continuity, or repair scripts.

### Changes

- Added centralized `queryKeys.customers.bulkOperations` keys with a recent-list prefix for invalidating all recent-operation variants.
- Added a customer health-history prefix key so invalidation reaches month-parameterized health history queries.
- Switched `useRecentBulkOperations` from an ad hoc array key to the centralized bulk-operation key.
- Returned `restoredCustomerIds` from `rollbackBulkOperation` after transactionally restoring matching current-tenant customers.
- Used the returned IDs to invalidate restored customer detail, health metrics, and health history caches.
- Switched customer health metric writes to the same health-history prefix invalidation contract.
- Invalidated customer list, recent bulk-operation, customer health, and customer analytics caches after rollback.
- Routed rollback failure toasts through `formatCustomerMutationError`.
- Added source coverage for rollback failure-copy safety, centralized query key usage, health-aware invalidation, and restored customer ID return.

### Standards Checked

- Domain ownership: rollback cache and failure handling stay in the customer rollback hook; rollback persistence stays in the customer rollback server function; query identity lives in the centralized query key factory.
- Route -> container/page -> hook -> server -> schema/database -> query key/cache policy: strengthened. The rollback path now has an explicit query key/cache policy instead of inline recent-operation key construction.
- Query/cache policy: strengthened. Rollback now invalidates recent operations through a prefix key and refreshes restored detail/health surfaces instead of only customer lists.
- Tenant isolation/data integrity: preserved. Rollback still loads the audit log through `auditLogs.organizationId = ctx.organizationId`, updates customers through `customers.organizationId = ctx.organizationId`, and counts only rows actually returned by the tenant-scoped update.
- Transactional integrity: preserved. Customer restore writes and rollback audit insertion remain inside one transaction.
- UI states/error handling: unsafe raw rollback messages are suppressed; safe validation/server error shapes still flow through the customer mutation formatter.
- Reviewability: the diff is limited to one query-key addition, one hook cache/error contract, one server return payload, focused tests, and this closeout note.

### Smells Removed

- Ad hoc rollback recent-operation query key.
- Rollback cache invalidation that skipped detail and health surfaces.
- Health-history invalidation that used an `undefined` months slot instead of a reusable prefix key.
- Rollback success count based on attempted old-value entries rather than tenant-scoped updated rows.
- Raw rollback mutation `error.message` toast.
- Missing source coverage for rollback cache and error contracts.

### Deferred

- Rollback still only supports health-score bulk operations.
- Bulk status/tag/delete rollback support remains a product and server-design decision.
- `RollbackUI` visual and confirmation UX were not changed.
- Customer export and communications failure feedback still have separate operator-feedback debt.
- Bulk health-score update itself still invalidates detail/list caches only; broader health analytics invalidation for the forward mutation should be reviewed in a separate slice.

### Gates

- Passed: focused customer mutation/cache contract test, `./node_modules/.bin/vitest run tests/unit/customers/customer-mutation-errors.test.ts` - 1 file, 8 tests.
- Passed: broader customer suite, `./node_modules/.bin/vitest run tests/unit/customers` - 14 files, 47 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Passed: targeted source scan for rollback formatter wiring, centralized rollback query keys, restored customer ID cache contract, and removed raw rollback fallback.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is hook/server cache behavior and failure-copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, and deploy gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, or repair scripts.
- Skipped: serialized gates because they are retired from routine closeout evidence and this slice did not touch serialized lineage, inventory identity, serialized movement, or warranty/RMA serial continuity.

### Goal Adaptation

Declined. The standing maintainer goal already covers centralized query keys, safe mutation/cache contracts, tenant isolation, transaction integrity, operator-safe errors, meaningful tests, and evidence-based closeout.

### Residual Risk

Low for customer bulk health-score rollback cache freshness and failure copy. Remaining rollback risk is product scope: only health-score rollback is implemented, while bulk status/tag/delete rollback requires a separate design and server contract.
