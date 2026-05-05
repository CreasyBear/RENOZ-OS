# Customers Maintainer Sprint 3

## Status

Closed in commit-ready state.

## Issue 1: Customer Detail Delete Failure Copy

### Problem

Sprint 2 centralized customer list mutation feedback, but customer detail delete still read `error.message` directly before showing a toast. That left one high-risk account deletion workflow able to leak database, tenant, transport, or infrastructure wording to operators.

### Workflow Spine

Customer detail route
-> `CustomerDetailContainer`
-> `useCustomerDetail`
-> `useDeleteCustomer`
-> customer delete server function
-> customer cache invalidation
-> customer list navigation
-> operator-safe failure toast.

### Touched Domains

- Customer detail hook.
- Customer mutation feedback source contract test.
- Customer maintainer closeout docs.

### Business Value Protected

Customer delete is a destructive account-maintenance action. If it fails, the operator should receive customer-domain recovery copy or safe validation text, not raw infrastructure details, while the app preserves the existing delete, dialog, and navigation behavior.

### Scope Constraints

- Do not change customer server functions, schemas, database writes, tenant predicates, query keys, cache invalidation, mutation success behavior, dialog state, or navigation.
- Preserve the existing thrown-error behavior after the toast so callers still receive the original `Error` when one exists.
- Keep this as a detail-delete slice; hierarchy, saved filters, action plans, Xero contact actions, communications, directory alternate actions, duplicate dismissal, rollback, and export feedback remain separate.
- Do not run serialized gates for this slice because no serial lineage, inventory identity, warranty/RMA continuity, or repair-script contract changed.

### Changes

- Routed `useCustomerDetail` delete failures through `formatCustomerMutationError`.
- Preserved the delete success path: mutation, success toast, dialog close, and list navigation.
- Extended the customer mutation feedback source contract to pin customer detail delete to the shared formatter and reject the removed raw message fallback.

### Standards Checked

- Domain ownership: customer detail delete now uses the customer mutation feedback helper instead of a local raw-message branch.
- Route -> container/page -> hook -> server -> schema/database -> query key/cache policy: preserved. This sprint only changes client-side failure copy after the existing mutation fails.
- Query/cache policy: no query keys, invalidations, optimistic updates, stale times, or cache writes changed.
- Tenant isolation/data integrity: no server function, auth boundary, organization predicate, database write, inventory transaction, finance persistence, or serialized lineage behavior changed.
- UI states/error handling: unsafe raw delete failure messages are suppressed; known codes and safe validation messages can still surface.
- Reviewability: the diff is limited to one hook import, one catch block, one focused test expansion, and this closeout note.

### Smells Removed

- Customer detail delete raw `error.message` toast.
- Detail delete fallback copy diverging from the customer mutation formatter contract.
- Missing regression coverage for customer detail delete failure feedback.

### Deferred

- `CustomerDirectory` is still a legacy exported alternate surface with raw bulk delete/export feedback and no active route import found in this slice.
- Hierarchy updates, saved filters, action plans, Xero contact management, communications, duplicate dismissal, rollback, and bulk export feedback still need separate ownership decisions.
- Browser QA remains deferred because this was failure-copy behavior with no route, visual layout, or interaction structure change.

### Gates

- Passed: focused customer mutation/read set, `./node_modules/.bin/vitest run tests/unit/customers/customer-mutation-errors.test.ts tests/unit/customers/customer-mutation-hooks.test.tsx tests/unit/customers/customer-read-state.test.tsx` - 3 files, 9 tests.
- Passed: broader customer suite, `./node_modules/.bin/vitest run tests/unit/customers` - 14 files, 40 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Passed: targeted source scan for customer detail formatter wiring and removed raw detail-delete feedback patterns.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is failure-copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, finance persistence, document generation, release packaging, or repair scripts.

### Goal Adaptation

Accepted process adaptation: serialized gates are no longer routine closeout evidence. They should be reopened only for deliberate serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair-script work. The maintainer goal remains otherwise unchanged.

### Residual Risk

Low for customer detail delete feedback. The next customer slice should decide whether `CustomerDirectory` is dead code to retire or a supported alternate surface that must be brought onto the same mutation/read feedback contracts.
