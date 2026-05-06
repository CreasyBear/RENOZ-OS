# Customers Maintainer Sprint 6

## Status

Closed in commit-ready state.

## Issue 1: Hierarchy Parent Update Failure Copy

### Problem

Customer hierarchy actions are live on the customer overview tab through `CustomerHierarchyContainer`. The set-parent/remove-parent mutation used `useUpdateCustomer`, but its failure toast still surfaced raw `error.message`. That left a supported account-relationship workflow able to expose database, tenant, transport, or infrastructure wording after the optimistic customer update rolled back.

### Workflow Spine

Customer detail route
-> overview tab
-> `CustomerHierarchyContainer`
-> `CustomerHierarchyTree`
-> `useUpdateCustomer`
-> customer update server function
-> customer detail/list optimistic rollback and invalidation
-> operator-safe hierarchy failure toast.

### Touched Domains

- Customer hierarchy container.
- Customer mutation feedback tests.
- Customer maintainer closeout docs.

### Business Value Protected

Hierarchy relationships help RENOZ operators reason about parent accounts, dealers, branches, partners, and related commercial customers. If a hierarchy change fails, the operator should get clear recovery copy without exposing internal persistence details.

### Scope Constraints

- Do not change customer hierarchy UI behavior, circular-reference guards, confirmation behavior, success copy, navigation, server functions, schemas, tenant predicates, query keys, optimistic update rollback, invalidation, or database writes.
- Preserve the existing `useUpdateCustomer` mutation/cache contract.
- Only harden the hierarchy mutation failure toast.
- Do not run serialized gates because this slice does not touch serial lineage, inventory identity, warranty/RMA continuity, or repair scripts.

### Changes

- Imported `formatCustomerMutationError` into `CustomerHierarchyContainer`.
- Routed set-parent and remove-parent mutation failures through customer-domain fallback copy.
- Extended customer mutation feedback source coverage to pin hierarchy failures to the formatter and reject the removed raw `error.message` branch.

### Standards Checked

- Domain ownership: hierarchy mutation feedback now uses the customer mutation feedback helper instead of a local raw-message branch.
- Route -> container/page -> hook -> server -> schema/database -> query key/cache policy: preserved. This sprint changes only client-side failure copy after the existing customer update mutation fails.
- Query/cache policy: `useUpdateCustomer` optimistic rollback, list/detail invalidation, and query keys are unchanged.
- Tenant isolation/data integrity: no server function, auth boundary, organization predicate, database write, inventory transaction, finance persistence, or serialized lineage behavior changed.
- UI states/error handling: unsafe raw hierarchy mutation messages are suppressed; customer-domain fallback copy is used for set/remove parent failures.
- Reviewability: the diff is limited to one container import/catch block, one focused test expansion, and this closeout note.

### Smells Removed

- Raw hierarchy update `error.message` toast.
- Local `Failed to ${action}` fallback diverging from customer mutation feedback policy.
- Missing regression coverage for customer hierarchy mutation feedback.

### Deferred

- Action plans, Xero contact actions, communications, duplicate dismissal, rollback, and export feedback still have separate operator-feedback debt.
- The hierarchy tree still only exposes remove-parent from the action menu; richer hierarchy editing UX remains out of scope.
- Browser QA remains deferred because no route layout or interaction structure changed.

### Gates

- Passed: focused customer mutation feedback test, `./node_modules/.bin/vitest run tests/unit/customers/customer-mutation-errors.test.ts` - 1 file, 4 tests.
- Passed: broader customer suite, `./node_modules/.bin/vitest run tests/unit/customers` - 14 files, 43 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Passed: targeted source scan for hierarchy formatter wiring, set/remove parent fallback copy, and removed raw hierarchy `error.message` feedback.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is failure-copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, finance persistence, document generation, release packaging, or repair scripts.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, mutation/cache contracts, meaningful tests, and risk-selected evidence.

### Residual Risk

Low for customer hierarchy mutation feedback. The next customer slice should target another supported workflow with raw feedback, likely action plans, Xero contact actions, duplicate dismissal, rollback, communications, or export feedback.
