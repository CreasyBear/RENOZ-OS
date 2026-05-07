# Orders Maintainer Sprint 45: Order Edit Submit Feedback

## Status

Closed in commit-ready state.

## Issue 1: Order Edit Dialog Read Mutation Error Message Directly

### Problem

`OrderDetailContainer` passed `containerActions.updateOrderMutation.error?.message` directly into `OrderEditDialog`. `useUpdateOrder` already normalizes failures, but reading the mutation error message inline keeps the dialog contract implicit and makes future changes easier to regress into raw backend copy.

### Workflow Spine

Order detail route
-> `OrderDetailContainer`
-> `useOrderDetailContainerActions`
-> `useUpdateOrder`
-> `updateOrder`
-> normalized order mutation error
-> order edit submit helper
-> `OrderEditDialog` inline submit error.

### Touched Domains

- Orders detail edit dialog feedback.
- Orders mutation client error contract.
- Focused orders feedback tests.

### Business Value Protected

Order editing is part of fulfillment intake and customer order maintenance. Operators need safe inline recovery guidance for failed edits without exposing database constraints or backend implementation details.

### Scope Constraints

- Do not change order edit form fields, submit payloads, optimistic update behavior, mutation hook behavior, server functions, schemas, query keys, cache invalidations, dialog state, or presenter layout.
- Preserve safe validation and conflict guidance already provided by the order mutation normalizer.
- Replace only the direct mutation error message read at the dialog boundary.

### Changes

- Added `getOrderEditSubmitErrorMessage` beside the order mutation feedback helpers.
- Routed `OrderEditDialog.submitError` through the helper.
- Added focused tests for safe validation, unsafe suppression, conflict guidance, null handling, and source wiring.

### Standards Checked

- Domain ownership: order edit submit copy now has an orders-owned helper.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved; only dialog error formatting changed.
- Query/cache policy: no query keys, invalidations, optimistic patch behavior, stale times, or cache contracts changed.
- Tenant isolation/data integrity: no server write, organization predicate, order mutation schema, inventory side effect, finance side effect, or serialized lineage behavior changed.
- UI states/error handling: inline submit error now uses an explicit order mutation formatter contract.
- Reviewability: one helper, one container call site, one focused test file, and this closeout.

### Smells Removed

- Direct `updateOrderMutation.error?.message` read in `OrderDetailContainer`.
- Missing source contract for the order edit submit-error boundary.

### Deferred

- Other order detail dialogs and mutation surfaces were not changed unless already covered by existing order feedback contracts.
- Browser QA was not selected because this is formatter/source-contract behavior with no intended layout or interaction change.

### Gates

- Passed: focused order edit feedback contract and core order client contract, `bun run test:vitest tests/unit/orders/order-detail-edit-feedback-contract.test.ts tests/unit/orders/order-client-contracts.test.ts` - 2 files, 9 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for direct `updateOrderMutation.error?.message` usage in `OrderDetailContainer`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. This is a direct application of the standing maintainer goal. Serialized gates remain retired for unrelated feedback-only slices.

### Residual Risk

Low for the order edit inline submit error. Broader order detail UI complexity remains outside this slice.
