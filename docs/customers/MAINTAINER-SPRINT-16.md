# Customers Maintainer Sprint 16: Customer Bundle Cache Scope

## Status

Closed in commit-ready state.

## Issue 1: Customer Bundle Updates Refreshed Customer and Contact Roots

### Problem

`useUpdateCustomerBundle` updates the customer record plus nested contacts and addresses from the customer edit submission workflow. It already had the customer ID and the submitted contact IDs, but still invalidated `queryKeys.customers.all` and `queryKeys.contacts.all`.

That made a single customer account edit look like a whole customer/contact domain refresh and hid the specific read surfaces the bundle workflow needs.

### Workflow Spine

Customer edit submission
-> `useCustomerEditSubmission`
-> `useUpdateCustomerBundle`
-> `updateCustomerBundle`
-> tenant-scoped customer/contact/address transaction
-> customer detail and customer list refresh
-> customer-scoped contact list, contact lists, and known contact detail refresh.

### Touched Domains

- Customer bundle mutation hook.
- Customer mutation hook tests.
- Customer sprint evidence.

### Business Value Protected

Editing a customer account with nested contact/address data now refreshes the affected customer account and contact surfaces without relying on root invalidation. This keeps customer maintenance cleaner for order intake, support, warranty, and account operations.

### Scope Constraints

- Do not change `updateCustomerBundle` server behavior, schemas, validation, tenant predicates, transactions, search outbox writes, or activity logging.
- Do not change customer edit UI fields, submit behavior, error handling, or optimistic behavior.
- Do not change contact/address standalone hooks; Sprint 15 already handled those.
- Keep this slice limited to customer bundle mutation cache ownership.

### Changes

- Added `invalidateCustomerBundleQueries` in the customer hooks module.
- Replaced customer/contact root invalidation with explicit customer detail, finite/infinite customer lists, customer-scoped contacts, contact lists, and known contact detail refresh.
- Added focused hook coverage proving bundle updates avoid customer/contact root invalidation.

### Standards Checked

- Domain ownership: customer bundle hook owns bundle edit cache refresh.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: existing server transaction remains unchanged; hook cache refresh is now named by affected read surface.
- Tenant isolation/data integrity: unchanged; server transaction remains organization-scoped.
- Transactional inventory/finance integrity: not applicable.
- Serialized lineage continuity: not applicable.
- Honest UI/error handling: unchanged.
- Query/cache contract: improved and covered by hook tests.
- Reviewability: one helper and one focused regression test.

### Smells Removed

- Customer bundle updates invalidated the customer root.
- Customer bundle updates invalidated the contact root.
- Contact detail refresh for known submitted contacts was implicit under the contact root instead of explicit.

### Deferred

- Deleted contact detail IDs are not returned by `updateCustomerBundle`; customer-scoped contact list refresh handles visible list correctness, but deleted contact detail cache cleanup would require expanding the server mutation identity contract.
- No browser smoke; this was a hook cache contract slice with no intended UI behavior or layout change.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/customers/customer-mutation-hooks.test.tsx tests/unit/customers/customer-mutation-errors.test.ts tests/unit/customers/customer-list-query-contract.test.tsx`
- Passed: `./node_modules/.bin/eslint src/hooks/customers/use-customers.ts tests/unit/customers/customer-mutation-hooks.test.tsx --report-unused-disable-directives`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the maintainer goal by turning another broad customer-domain refresh into explicit mutation/cache ownership.

### Residual Risk

Low for customer bundle list/detail freshness. Moderate for deleted contact detail cache cleanup because the server result does not yet expose deleted contact IDs.
