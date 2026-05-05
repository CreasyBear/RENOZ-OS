# Customers Maintainer Sprint 1

## Status

Closed in commit-ready state.

## Issue 1: Customer List Read-State Error Boundary

### Problem

The customer list hook already normalizes list read failures through the shared read-path policy, but `CustomersListPresenter` rendered `error.message` directly. That meant a raw database, tenant, transport, or infrastructure error could leak into the primary customer directory if a non-normalized error reached the presenter.

### Workflow Spine

Customer list route
-> `CustomersListContainer`
-> `useCustomers`
-> customer server list function
-> normalized read-path query contract
-> `CustomersListPresenter`
-> operator-safe customer list error state.

### Touched Domains

- Customer list presenter.
- Customer read-state message helper.
- Customer read-state tests.
- Customer maintainer documentation.

### Business Value Protected

The customer directory is the operator surface for dealers, partners, end users, and commercial accounts. If the list fails, operators should get stable recovery copy instead of raw database or tenant-policy text.

### Scope Constraints

- Do not change customer server functions, schemas, database queries, tenant predicates, query keys, cache invalidation, pagination, sorting, filters, selection, bulk actions, mutation feedback, customer detail, Xero, segments, duplicate detection, or import/export workflows.
- Preserve normalized read-query messages from the existing hook policy.
- Only harden the customer list display boundary.

### Changes

- Added `customer-read-error-messages.ts` with `CUSTOMER_LIST_FALLBACK_MESSAGE` and `getCustomerListReadErrorMessage`.
- Routed `CustomersListPresenter` error-state description through the helper.
- Added focused coverage for normalized read-query copy, raw error suppression, rendered customer list error state, and source wiring.

### Standards Checked

- Domain ownership: customer list read-state copy lives beside the customer list presenter.
- Route -> container/page -> hook -> server -> schema/database -> query key/cache policy: preserved. This sprint only changes display-boundary copy after the existing list query fails.
- Query/cache policy: no query keys, stale times, invalidations, optimistic updates, or cache writes changed.
- Tenant isolation/data integrity: no server function, auth boundary, organization predicate, database write, inventory transaction, finance persistence, or serialized lineage behavior changed.
- UI states/error handling: non-normalized raw errors no longer render in the customer list error state.
- Reviewability: the diff is limited to one helper, one presenter line, focused tests, and this closeout note.

### Smells Removed

- Direct `error.message` rendering in `CustomersListPresenter`.
- Generic `"An unexpected error occurred"` fallback that was not customer-domain owned.
- Missing regression coverage for customer list raw read-error suppression.

### Deferred

- Customer mutation feedback still has several raw `error.message` paths in list bulk actions, hierarchy, saved filters, action plans, Xero contact management, and communications. These should be handled as separate workflow slices.
- Customer detail and auxiliary customer containers still need their own read-state review before claiming customer-domain read states are broadly clean.
- Browser QA was deferred because this is error-copy behavior covered by render/source tests and no route/layout behavior changed.

### Gates

- Passed: focused customer read/list set, `./node_modules/.bin/vitest run tests/unit/customers/customer-read-state.test.tsx tests/unit/customers/customer-list-query-contract.test.tsx tests/unit/customers/query-normalization-wave2.test.tsx` - 3 files, 13 tests.
- Passed: broader customer suite, `./node_modules/.bin/vitest run tests/unit/customers` - 13 files, 37 tests.
- Passed: `git diff --check`.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for customer list helper wiring and removed direct list `error.message` rendering.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is error-copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, finance persistence, document generation, release packaging, or repair scripts.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, domain-owned workflow contracts, meaningful tests, and risk-selected evidence.

### Residual Risk

Low for the customer list read-state boundary. The next customer slice should target one concrete mutation workflow or one detail read-state boundary rather than broad customer-domain cleanup.
