# Customers Maintainer Sprint 4

## Status

Closed in commit-ready state.

## Issue 1: Retire Legacy Customer Directory Surface

### Problem

Sprint 3 identified `CustomerDirectory` as a legacy exported alternate customer list surface. Investigation showed it was not imported by live routes or tests; it only remained in the customer barrel, a stale standards example, and an orphaned `CustomerTable` dependency. Keeping it made the customer domain harder to reason about and preserved raw mutation feedback paths that operators should never reach.

### Workflow Spine

Customer list route
-> `customers-page`
-> `CustomersListContainer`
-> `CustomersListPresenter`
-> `CustomersTablePresenter` / `CustomersMobileCards`
-> customer hooks
-> customer server functions
-> centralized query/cache and mutation feedback contracts.

### Touched Domains

- Customer component import surface.
- Customer mobile card type import.
- Customer import-surface regression tests.
- Repo standards route/page example.
- Customer maintainer closeout docs.

### Business Value Protected

The customer directory is where RENOZ operators manage dealers, partners, end users, and commercial accounts. Removing unsupported alternate surfaces reduces the chance of future work landing in dead code, stale docs, or raw-error UI paths instead of the production list workflow.

### Scope Constraints

- Do not change the live customer route, customer list container behavior, presenter behavior, filters, selection, pagination, sorting, mutations, query keys, cache invalidation, server functions, schemas, tenant predicates, or database writes.
- Retire only the orphaned `CustomerDirectory`/`CustomerTable` surfaces and their exports.
- Keep `CustomerTableData` owned by `customer-columns`.
- Update standards docs only where they named the retired surface.
- Do not run serialized gates because this slice does not touch serial lineage, inventory identity, warranty/RMA continuity, or repair scripts.

### Changes

- Deleted `src/components/domain/customers/customer-directory.tsx`.
- Deleted `src/components/domain/customers/customer-table.tsx`.
- Removed `CustomerDirectory` and `CustomerTable` from the customer barrel.
- Moved `CustomerCard`'s `CustomerTableData` type import to `customer-columns`.
- Updated `docs/reference/repo-standards.md` to show the current `CustomersListContainer` route/page pattern.
- Added import-surface guards so the retired files, exports, and import paths stay gone.

### Standards Checked

- Domain ownership: the customer list now has one supported production surface, `CustomersListContainer`, instead of an exported legacy alternate.
- Route -> container/page -> hook -> server -> schema/database -> query key/cache policy: preserved. This sprint removes dead UI surfaces and docs; live route behavior is unchanged.
- Query/cache policy: no query keys, cache invalidations, optimistic updates, stale times, or mutation contracts changed.
- Tenant isolation/data integrity: no server function, auth boundary, organization predicate, database write, inventory transaction, finance persistence, or serialized lineage behavior changed.
- UI states/error handling: raw legacy customer directory mutation feedback was removed with the unsupported surface instead of being kept alive.
- Reviewability: the diff is large by deletion count but narrow by ownership: two orphaned files removed, one type import corrected, one barrel cleaned, one standards example updated, and one focused guard expanded.

### Smells Removed

- Exported but unused `CustomerDirectory` alternate list surface.
- Orphaned `CustomerTable` component dependency.
- `CustomerCard` depending on a legacy table module only for a type.
- Repo standards example pointing new work at the retired customer list surface.
- Raw mutation feedback paths in dead customer directory code.

### Deferred

- Historical sprint docs still mention `CustomerDirectory` as past context and were intentionally left intact.
- Other customer feedback debt remains in hierarchy updates, saved filters, action plans, Xero contact management, communications, duplicate dismissal, rollback, and bulk export.
- Browser QA remains deferred because live route behavior and layout were not changed.

### Gates

- Passed: focused import-surface guard, `./node_modules/.bin/vitest run tests/unit/customers/customer-import-surface.test.ts` - 1 file, 4 tests.
- Passed: broader customer suite, `./node_modules/.bin/vitest run tests/unit/customers` - 14 files, 42 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Passed: source scan showed no retired `CustomerDirectory`, `customer-directory`, or `customer-table` source/docs references outside the regression guard and historical sprint notes.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because no live route or visual behavior changed.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, finance persistence, document generation, release packaging, or repair scripts.

### Goal Adaptation

Declined. Sprint 3 already adapted the serialized gate posture; this sprint applies the existing maintainer goal by removing dead surfaces instead of polishing unsupported code.

### Residual Risk

Low for customer list surface ownership. The next customer slice should return to supported workflows: hierarchy actions, saved filters, action plans, Xero contact actions, communications, duplicate dismissal, rollback, or export feedback.
