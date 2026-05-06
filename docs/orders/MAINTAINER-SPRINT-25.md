# Orders Maintainer Sprint 25

## Status

Closed in commit-ready state.

## Issue 1: Draft Order Item Failure Feedback

### Problem

Draft order item add, update, and remove actions still read raw caught mutation messages before showing toasts or conflict banners. These actions sit inside active order editing, where operators are adjusting quantities, prices, discounts, and notes. Failure copy needs to preserve useful local validation and conflict recovery guidance without leaking database, stack, or backend implementation details.

### Workflow Spine

Order detail items tab
-> draft line item add/update/remove action
-> order line item mutation hook
-> order mutation server function
-> order cache invalidation
-> operator-safe toast or conflict banner.

### Touched Domains

- Orders draft item editing.
- Orders mutation client error normalization.
- Orders draft item feedback tests.

### Business Value Protected

Draft item editing is a daily operator path for correcting order composition before fulfillment. Safe, specific feedback keeps the operator on the order, protects recovery from version conflicts, and prevents low-level database or service failures from becoming user-facing noise.

### Scope Constraints

- Do not change item add, update, delete payloads, mutation sequencing, expected order version behavior, form defaults, table layout, pagination, or product selection.
- Do not change server functions, tenant predicates, database writes, inventory behavior, finance persistence, or query/cache invalidation.
- Preserve existing local draft validation copy because it is operator-authored and directly actionable.

### Changes

- Added `getDraftOrderItemActionErrorMessage` for add, update, and remove failures.
- Added `isDraftOrderItemConflictMessage` so the conflict banner is driven by normalized operator-safe copy.
- Routed draft add/update/remove catch blocks through the formatter instead of reading raw `error.message`.
- Restricted local validation pass-through to the exact validation message shapes emitted by the tab.
- Added focused contract coverage for unsafe backend suppression, safe local validation, safe conflict guidance, and source wiring.

### Standards Checked

- Domain ownership: draft item failure copy is now owned by an Orders tab-level formatter.
- Route -> container/page -> tab -> hook -> server -> schema/database -> query key/cache policy: preserved. This slice changes only UI failure copy after existing item mutations fail.
- Query/cache policy: no query keys, invalidations, mutation payloads, or stale-time behavior changed.
- Tenant isolation/data integrity: no server function, tenant predicate, order version check, database write, inventory movement, or finance persistence changed.
- UI states/error handling: draft item toasts and conflict banners now use safe, action-specific copy while preserving local validation.
- Reviewability: one helper, three call sites, one focused test file, and this closeout note.

### Smells Removed

- Raw add/update/remove draft item failure toasts.
- Repeated inline conflict detection in the items tab catch blocks.
- Missing focused coverage for draft item failure feedback boundaries.
- Over-broad local validation pass-through that could have preserved arbitrary unsafe text containing a safe phrase.

### Deferred

- Remaining order-specific raw error paths still need separate slices: order detail workflow/reopen toasts, fulfillment error-boundary display, Xero sync alert copy, order creation failure copy, and server result-row messages.
- Browser QA was deferred because this is failure-copy behavior with no visual layout change.

### Gates

- Passed: focused draft item feedback set, `./node_modules/.bin/vitest run tests/unit/orders/order-item-action-feedback-contract.test.ts tests/unit/orders/order-write-contracts.test.ts tests/unit/orders/order-mutation-invalidation.test.tsx` - 3 files, 18 tests.
- Passed: broader orders suite, `./node_modules/.bin/vitest run tests/unit/orders` - 41 files, 149 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader orders suite still emits the existing `--localstorage-file` jsdom warning and one missing Upstash env warning; tests pass.
- Skipped: browser QA, `bun run lint:reliability`, finance, document, release, and deploy gates because this slice did not change routes, guarded read paths, financial persistence, document generation, release packaging, deployment, or visual layout.

### Goal Adaptation

Made. The retired serialized gate pack is omitted from this unrelated slice closeout instead of being listed as skipped evidence. Serialized lineage remains a domain invariant only for future slices that actually touch lineage or inventory identity.

### Residual Risk

Low for draft order item feedback. Moderate for the broader Orders domain because detail workflow/reopen toasts, fulfillment boundary copy, Xero alert copy, order creation failures, and server result-row messages still need bounded cleanup.
