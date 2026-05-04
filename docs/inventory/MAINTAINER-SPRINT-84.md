# Inventory Maintainer Sprint 84

This sprint follows Sprint 83's bulk receive cache-contract hardening. The target is bulk receive dialog intent preservation: when an operator starts bulk receiving from selected purchase orders, the dialog should honor that selection instead of forcing the operator to select the same purchase orders again.

Status: Closed after Issue 1.

## Business Value

Bulk receiving exists to speed warehouse work. Requiring a second selection pass after the dashboard action creates avoidable friction and raises the chance that an operator processes a different set of POs than intended.

## Workflow Spine

receiving dashboard selected rows
-> bulk receive action
-> bulk receiving dialog opens
-> selected PO intent is preserved
-> review step reflects the intended PO set
-> confirm payload sends the intended PO ids
-> server bulk receive workflow.

## Architecture Constraints

- Keep this sprint to dialog state ownership and selected-intent preservation.
- Preserve the container/presenter split, server mutation contract, serial-number entry workflow, retry failed behavior, and cache policy from Sprint 83.
- Avoid resetting in-progress serial entry or selection when background purchase-order data refetches while the dialog is open.

## Issue Ledger

### 1. Bulk Receive Dialog Dropped Caller Selection On Open

Problem:

- The dashboard passes selected purchase orders into `BulkReceivingDialogContainer`.
- `BulkReceivingDialog` reset `selectedPOIds` to an empty set every time it opened.
- Operators had to select the same POs a second time before review/confirm, which made the bulk action feel broken and added mis-selection risk.

Workflow protected:

dashboard selection -> dialog open -> review -> confirm payload.

Implemented slice:

- Added an open-transition guard using `useRef`.
- On the actual open transition, the dialog now preselects all caller-provided purchase orders.
- The reset no longer fires on ordinary rerenders while open, protecting in-progress selections and serial entry from background refetch churn.
- Added focused dialog coverage proving preselected POs reach the receive payload.

Out of scope:

- Visual redesign of the bulk receiving dialog.
- Browser QA of the full dashboard flow.
- Server bulk receive behavior.
- Serial-number batch entry UX.

Closeout:

- Touched domains: procurement receiving dialog, procurement dialog regression test, inventory sprint evidence.
- Workflow protected: receiving dashboard selected rows -> bulk receive dialog -> review step -> confirm payload -> bulk receive server workflow.
- Business value protected: operators no longer repeat the same selection work before bulk receiving, reducing friction and mis-selection risk.
- Architecture standards checked: container/page/hook/server boundaries are unchanged; the dialog owns only local wizard state; cache policy remains in `useBulkReceiveGoods`.
- Tenant isolation and data integrity checked: no database reads, writes, tenant predicates, stock mutation logic, finance integrity behavior, or serialized lineage server behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or mutation cache contracts changed.
- Smells removed: local dialog reset discarded upstream selected intent and conflated open initialization with every open-state rerender.
- Smells deferred: browser QA of dashboard-to-dialog interaction; serial-number entry ergonomics; broader dialog visual polish.
- Gates run: focused dialog/consumer tests (`3` files, `10` tests); focused ESLint; procurement + purchase-order + supplier + inventory unit suites (`106` files, `326` tests); TypeScript.
- Gates skipped: browser QA, because the regression is covered at the component state/payload level and no layout behavior changed.
- Goal adaptations: declined. The standing maintainer goal already covers honest UI state, operator-safe workflows, meaningful tests, and evidence-based closeout.
- Residual risk: a browser dogfood pass would still be valuable for keyboard/focus behavior and the full dashboard selection handoff.
