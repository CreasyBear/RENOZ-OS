# Customers Maintainer Sprint 15: Contact and Address Cache Scope

## Status

Closed in commit-ready state.

## Issue 1: Contact and Address Updates Refreshed Customer Roots

### Problem

Customer contact and address create hooks already knew the owning customer and refreshed that customer detail. Update and delete hooks did not use mutation result identity, so they fell back to `queryKeys.customers.all` and, for contacts, `queryKeys.contacts.all`.

Contact and address changes affect a customer detail record and customer-scoped contact lists. They should not force broad customer/contact root refreshes that hide the actual workflow contract.

### Workflow Spine

Customer detail contact/address editor
-> customer contact/address mutation hook
-> customer server function
-> tenant-scoped contact/address write
-> returned `customerId` mutation identity
-> affected customer detail and customer contact list refresh.

### Touched Domains

- Customer contact mutation hooks.
- Customer address mutation hooks.
- Customer server contact/address delete functions.
- Customer mutation hook tests.
- Customer sprint evidence.

### Business Value Protected

Customer records are the starting point for orders, support, warranty, and account operations. Editing a contact or address now refreshes the affected customer/account surfaces without relying on broad customer and contact root invalidation.

### Scope Constraints

- Do not change customer contact/address validation, permissions, transaction wrapper, tenant predicates, or delete semantics.
- Do not change customer create/update/delete behavior outside contact/address mutation identity.
- Do not change contact/address UI copy or form behavior.
- Keep this slice limited to mutation result identity and cache refresh ownership.

### Changes

- Contact and address delete server functions now return the deleted row's `customerId`.
- Address create/update/delete hooks route refreshes through `invalidateCustomerAddressMutationQueries`.
- Contact create/update/delete hooks route refreshes through `invalidateCustomerContactMutationQueries`.
- Contact update/delete now refresh affected customer detail, customer-scoped contacts, and contact detail without customer/contact root invalidation.
- Address update/delete now refresh affected customer detail without customer root invalidation.
- Added focused hook coverage for contact and address update/delete cache policy.

### Standards Checked

- Domain ownership: customer hooks own contact/address cache refresh; server functions own mutation result identity.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: mutation result identity now carries deleted-row customer ownership into targeted cache refresh.
- Tenant isolation/data integrity: unchanged; update/delete still scope writes by organization ID.
- Transactional inventory/finance integrity: not applicable.
- Serialized lineage continuity: not applicable.
- Honest UI/error handling: unchanged.
- Query/cache contract: improved and covered by hook tests.
- Reviewability: two small hook helpers, two server return-shape additions, and focused regression coverage.

### Smells Removed

- Contact update/delete invalidated customer and contact roots.
- Address update/delete invalidated the customer root.
- Contact/address delete server functions discarded the owning `customerId` even though the deleted row was returned.

### Deferred

- `useUpdateCustomerBundle` still invalidates customer/contact roots and should be handled as a separate customer bundle/accounting integration slice.
- No browser smoke; this was a hook/server cache contract slice with no intended visible UI change.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/customers/customer-mutation-hooks.test.tsx tests/unit/customers/customer-mutation-errors.test.ts`
- Passed: `./node_modules/.bin/eslint src/hooks/customers/use-customer-addresses.ts src/hooks/customers/use-customer-contacts.ts src/server/functions/customers/customers.ts tests/unit/customers/customer-mutation-hooks.test.tsx --report-unused-disable-directives`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the maintainer goal by replacing broad cross-surface invalidation with explicit customer-domain mutation identity and cache ownership.

### Residual Risk

Low for contact/address update and delete cache freshness. Moderate for broader customer/account cache policy because bundle/accounting mapping still has separate root invalidation behavior outside this slice.
