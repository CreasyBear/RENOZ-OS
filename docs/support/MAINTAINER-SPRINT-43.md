# Support Maintainer Sprint 43

This sprint follows Sprint 42's issue-detail feedback boundary and stays in the support/RMA domain. The target is RMA detail mutation feedback and failure propagation: failed RMA workflow actions must not look successful to the presenter, and operator error copy must not leak raw exception text.

Status: Closed after Issue 1.

## Business Value

RMAs are returned-stock recovery and remedy execution for RENOZ Energy. Approve, reject, receive, execute remedy, and cancel actions affect customer support, inventory recovery, linked orders, and financial remedy artifacts. Operators need safe failure feedback, and dialogs must stay open when a mutation fails so they can correct or retry without losing context.

## Workflow Spine

RMA detail route
-> `RmaDetailContainer`
-> `useRmaDetail`
-> `RmaWorkflowActions`, `RmaReceiveDialog`, and `RmaExecuteRemedyDialog`
-> RMA workflow mutation hooks
-> RMA server functions and existing cache invalidation
-> operator toast and dialog state.

## Architecture Constraints

- Keep this sprint to the RMA detail workflow boundary.
- Do not change RMA routes, server functions, schemas, database predicates, query keys, cache invalidation, status transitions, receive inventory transaction behavior, serialized lineage, remedy execution semantics, or financial artifact creation.
- Keep local dialog validation feedback in presenters.
- Move server mutation failure feedback to `useRmaDetail` using the support formatter and shared toast adapter.
- Re-throw failed detail workflow mutations after toasting so presenters do not close dialogs or fire success refreshes on failure.
- Treat serialized/reliability gates as closed for the standing goal unless a future slice touches serialized lineage.

## Issue Ledger

### 1. RMA Detail Mutation Failure Contract

Problem:

- `useRmaDetail` surfaced raw `Error.message` text for workflow mutation failures.
- The hook swallowed approve, reject, receive, and process failures after showing a toast.
- Because failures were swallowed, presenters could still run `onSuccess`, close receive/remedy dialogs, or reset form state after failed mutations.
- RMA workflow presenters also contained fallback raw-error toasts, splitting mutation feedback responsibility across hook and UI components.

Workflow protected:

RMA detail route -> `RmaDetailContainer` -> `useRmaDetail` -> RMA workflow presenters/dialogs -> RMA mutation hooks -> existing server/cache contracts -> safe operator feedback and honest dialog state.

Implemented slice:

- Added RMA-specific mutation code copy through the support mutation formatter.
- Moved `useRmaDetail` to the shared toast adapter.
- Routed approve, reject, receive, process, cancel, and blocked remedy execution feedback through safe formatting.
- Re-threw failed approve, reject, receive, and process mutations after toasting so presenters only close or refresh on real success.
- Removed raw server mutation error toasts from RMA workflow presenters while preserving local validation toasts.
- Added source-contract coverage for the hook/presenter boundary and formatter option behavior.

Out of scope:

- RMA create dialog and RMA list bulk actions.
- RMA server mutation behavior, receive inventory transaction behavior, serialized lineage, financial remedy execution, query invalidation, and tenant predicates.
- Browser/mounted workflow QA.

Closeout:

- Touched domains: support/RMA detail orchestration, RMA workflow presenters, RMA receive/remedy dialogs, support mutation error formatting tests, RMA source/behavior contract tests, support sprint evidence.
- Workflow protected: RMA detail route -> `RmaDetailContainer` -> `useRmaDetail` -> `RmaWorkflowActions`, `RmaReceiveDialog`, and `RmaExecuteRemedyDialog` -> existing RMA workflow mutation hooks -> existing RMA server functions/cache invalidation -> safe operator toast and honest dialog state.
- Business value protected: failed approve/reject/receive/remedy actions no longer look successful to operators, and receive/remedy dialogs now keep the operator's context when a mutation fails.
- Architecture standards checked: route/container/page boundaries unchanged; `useRmaDetail` owns server mutation feedback; presenters keep only local validation feedback; server functions, schemas, database predicates, status transitions, query keys, cache invalidation, receive inventory transactions, serialized lineage, remedy execution, and financial artifact creation unchanged.
- Tenant isolation and data integrity checked: no tenant predicate, server mutation, database write path, inventory transaction, serialized lineage write, or financial side-effect path changed.
- Query/cache contract checked: existing `useApproveRma`, `useRejectRma`, `useReceiveRma`, `useProcessRma`, and `useCancelRma` invalidation behavior remains unchanged; this slice only changed failed-mutation feedback and propagation.
- Smells removed: raw `Error.message` feedback in `useRmaDetail`; swallowed approve/reject/receive/process failures that allowed presenters to run success paths; presenter-level raw server mutation fallback toasts for RMA detail approve/reject/receive/remedy; stale receive-location source contract tied to the deprecated toast helper.
- Smells deferred: RMA create dialog and RMA list bulk actions still need separate feedback-boundary slices; broader support direct `sonner` and raw-error call sites remain outside this RMA detail slice; formatter duplication across support/service/warranty remains deferred until a shared extraction is worth the blast radius.
- Gates run: `./node_modules/.bin/vitest run tests/unit/support/rma-detail-mutation-feedback-contract.test.ts tests/unit/support/support-mutation-errors.test.ts tests/unit/support/rma-receive-dialog.test.tsx tests/unit/support/rma-execute-remedy-dialog.test.tsx tests/unit/support/use-rma-mutations.test.tsx`; focused eslint for changed hook/components/tests; source scan for RMA formatter/raw-error patterns; `./node_modules/.bin/vitest run tests/unit/support/rma-receive-location-contract.test.ts tests/unit/support/rma-detail-mutation-feedback-contract.test.ts tests/unit/support/rma-receive-dialog.test.tsx tests/unit/support/rma-execute-remedy-dialog.test.tsx`; `./node_modules/.bin/vitest run tests/unit/support` (39 files, 165 tests); `bun run typecheck`; `bun run lint`; `git diff --check`.
- Gates skipped: browser QA, because this was a hook/presenter failure-contract slice with unit/source coverage and no visual layout change; serialized/reliability gates, by maintainer direction, because the serialized gate track is closed and this slice did not touch serialized lineage.
- Goal adaptations: kept the Sprint 42 adaptation that serialized/reliability gates are no longer default gates; declined broader goal changes because the standing product-owner/repo-maintainer posture still fits.
- Residual risk: RMA create and bulk-list workflows may still close or surface raw errors on failed mutations; support-wide feedback consistency remains incomplete until the remaining direct `sonner` and raw-error call sites are triaged.
