# Maintainer Sprint 2: RMA Recovery Operator UX

This sprint follows Support Sprint 1's trace/schema/contract hardening into the operator-facing RMA recovery surfaces.

Status: Issues 1, 2, and 3 implemented.

## Business Value

Support and RMA workflows are where RENOZ Energy protects customer trust after a battery sale. Operators need to see whether a remedy is pending, blocked, or completed, and whether a refund payment, credit note, or replacement order actually exists. The UI should not bury recovery truth inside broad detail cards or duplicate artifact links in ways that make closeout hard to trust.

## Workflow Spine

```text
support / order / warranty context
  -> RMA detail route
  -> RMA detail container/view
  -> RMA execution summary boundary
  -> RMA read model execution artifact links
  -> operator-safe blocked, pending, completed, and linked-record states
```

## Pattern Map

- Routes: `src/routes/_authenticated/support/rmas/$rmaId.tsx`, `src/routes/_authenticated/support/rmas/index.tsx`
- Containers/views: `src/components/domain/support/rma/rma-detail-container.tsx`, `src/components/domain/support/rma/rma-detail-view.tsx`
- High-risk UI surfaces: `src/components/domain/support/rma/rma-detail-card.tsx`, `src/components/domain/support/rma/rma-list.tsx`, `src/components/domain/support/rma/rma-workflow-actions.tsx`
- Hooks: `src/hooks/support/use-rma-detail.ts`, `src/hooks/support/use-rma.ts`
- Server/read model: `src/server/functions/orders/rma.ts`, `src/server/functions/orders/_shared/rma-read-model.ts`, `src/server/functions/orders/_shared/rma-remedy-execution.ts`
- Schema: `src/lib/schemas/support/rma.ts`
- Tests: `tests/unit/support/rma-read-model.test.ts`, `tests/unit/support/rma-remedy-execution-evidence.test.ts`, `tests/unit/support/rma-remedy-execution-transaction.test.ts`, `tests/unit/support/rma-execute-remedy-dialog.test.tsx`

## Triage Findings

- Support Sprint 1 made artifact truth explicit at schema/read-model/transaction-boundary level, but the detail UI still renders remedy execution inline inside `rma-detail-card.tsx`.
- `rma-detail-card.tsx` owns general RMA detail layout, line items, remedy execution state, linked artifact records, and internal notes in one component.
- `rma-detail-view.tsx` also renders sidebar linked records, so artifact visibility exists in more than one place without a focused display contract.
- `rma-list.tsx` already exposes execution filters and summaries, but list/card behavior should not be changed until the detail view has a focused execution boundary.
- The largest support file is `issue-detail-view.tsx`, but it is a different workflow and should not be mixed into this RMA recovery sprint.

## Issue Ledger

### 1. RMA Execution Summary Boundary

Business value: operators should be able to review remedy status, blocked reason, selected remedy, refund amount, completion time, notes, and linked artifacts without scanning the whole RMA detail card implementation.

Workflow invariant: RMA detail -> read-model execution object -> execution summary component -> blocked/pending/completed badges, artifact links, notes, and refund amount -> no mutation or read-model behavior change.

Affected files:

- `src/components/domain/support/rma/rma-execution-summary.tsx`
- `src/components/domain/support/rma/rma-detail-card.tsx`
- `src/components/domain/support/rma/index.ts`
- `tests/unit/support/rma-execution-summary.test.tsx`
- `docs/support/MAINTAINER-SPRINT-2.md`

Out of scope:

- changing RMA read-model hydration
- changing remedy execution server behavior
- changing workflow action buttons or dialogs
- changing list filters or route search schemas
- browser QA for the full support route

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/support/rma-execution-summary.test.tsx
```

Closeout criteria:

- remedy execution rendering leaves `rma-detail-card.tsx`
- blocked, completed, and linked artifact states have focused UI coverage
- refund amount and notes remain visible through the execution summary boundary
- `rma-detail-card.tsx` remains responsible for general RMA detail layout and line items
- focused tests, lint, typecheck, and support suite pass or skipped gates are recorded

### 2. RMA Detail Related Context Boundary

Business value: remedy artifacts should appear where operators evaluate remedy execution, while the side rail should stay focused on upstream context like the related issue and source order. Duplicating refund, credit, and replacement links in both places makes it harder to know which surface owns recovery truth.

Workflow invariant: RMA detail view -> side rail related context -> source issue/order navigation only; remedy artifact links stay in `RmaExecutionSummary`.

Affected files:

- `src/components/domain/support/rma/rma-detail-view.tsx`
- `tests/unit/support/rma-detail-view.test.tsx`
- `docs/support/MAINTAINER-SPRINT-2.md`

Out of scope:

- changing `RmaExecutionSummary`
- changing RMA read-model hydration
- changing server remedy execution behavior
- changing workflow actions or dialogs
- redesigning the detail page layout

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/support/rma-detail-view.test.tsx
```

Closeout criteria:

- sidebar/source context still links to related issue and source order
- sidebar no longer renders credit note, replacement order, or refund payment cards
- remedy artifact display remains owned by `RmaExecutionSummary`
- focused tests, lint, typecheck, and support suite pass or skipped gates are recorded

### 3. RMA List Execution Cells Boundary

Business value: list rows are the operator's fastest way to spot blocked or completed recovery work. Remedy, execution state, source order, issue state, and artifact context should be reviewable without reading the full RMA list/table/filter component.

Workflow invariant: RMA list -> row execution cell boundary -> remedy badge, execution badge, artifact/blocker/pending context, source order, linked issue state -> no filter, pagination, read-model, or mutation behavior change.

Affected files:

- `src/components/domain/support/rma/rma-list-execution-cells.tsx`
- `src/components/domain/support/rma/rma-list.tsx`
- `src/components/domain/support/rma/index.ts`
- `tests/unit/support/rma-list-execution-cells.test.tsx`
- `docs/support/MAINTAINER-SPRINT-2.md`

Out of scope:

- changing list filters, route search schemas, or pagination
- changing `getRmaExecutionContextSummary`
- changing RMA read-model hydration or server behavior
- redesigning the RMA list
- browser QA for the full list route

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/support/rma-list-execution-cells.test.tsx
```

Closeout criteria:

- remedy/execution row rendering leaves `rma-list.tsx`
- execution context row rendering leaves `rma-list.tsx`
- blocked, completed-artifact, and pending row states have focused UI coverage
- `rma-list.tsx` remains responsible for filters, table assembly, selection, pagination, loading/error/empty states
- focused tests, lint, typecheck, and support suite pass or skipped gates are recorded

## Closeout Log

### Issue 1: RMA Execution Summary Boundary

Touched domains: support/RMA detail UI, RMA execution artifact display, support UI tests.

Workflow protected: RMA detail route -> RMA detail container/view -> RMA detail card -> focused execution summary -> read-model execution artifact links -> blocked, completed, refund, credit, replacement, and notes display.

Business value: operators can now review remedy execution state and linked artifact truth through a focused RMA execution summary boundary instead of relying on a broad detail card that mixed general RMA facts, line items, remedy status, and linked records.

Standards checked:

- extracted `RmaExecutionSummary` for selected remedy, execution status, blocked reason, refund amount, completed timestamp, notes, and linked artifact records
- kept `RmaDetailCard` responsible for loading/error states, header, detail grid, reason/customer/inspection notes, line items, and internal notes
- kept RMA read-model hydration, remedy execution server behavior, workflow actions, route search schemas, and query/cache behavior unchanged
- exported the execution summary from the RMA domain barrel for focused reuse/testing

Smells removed:

- `rma-detail-card.tsx` directly owned remedy execution and linked artifact rendering
- blocked/completed execution UI had no focused component test despite being high-stakes support recovery state
- linked refund, credit, and replacement artifact display was mixed into the general RMA detail card

Deferred:

- `rma-detail-view.tsx` still renders sidebar linked-record cards and may need deduplication or layout judgment in a later slice
- `rma-list.tsx` execution summary/filter behavior remains unchanged
- `issue-detail-view.tsx` remains a large separate support workflow surface and should not be mixed into this RMA slice
- browser QA was skipped because this is a focused component extraction with unit coverage and no route/server behavior change

Verification:

- `./node_modules/.bin/vitest run tests/unit/support/rma-execution-summary.test.tsx`
- `./node_modules/.bin/eslint src/components/domain/support/rma/rma-detail-card.tsx src/components/domain/support/rma/rma-execution-summary.tsx src/components/domain/support/rma/index.ts tests/unit/support/rma-execution-summary.test.tsx`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`
- `./node_modules/.bin/vitest run tests/unit/support`

Goal adaptation: no standing goal change. This continues the support/RMA maintainer posture by moving artifact-truth UI into a reviewable domain boundary.

Residual risk: detail and sidebar linked-record surfaces can still duplicate credit/replacement/refund access. That may be acceptable because the detail body explains execution while the sidebar supports navigation, but it should be reviewed in a future UX slice before broader RMA polish.

### Issue 2: RMA Detail Related Context Boundary

Touched domains: support/RMA detail view, RMA source-context side rail, support UI tests.

Workflow protected: RMA detail route -> detail view side rail -> source issue/source order navigation, while remedy artifact links remain owned by `RmaExecutionSummary`.

Business value: operators now have a clearer detail page split: the main detail body explains remedy execution and artifact truth, while the side rail links to the upstream issue and source order context. Refund, credit, and replacement artifacts are no longer duplicated in two places on the same page.

Standards checked:

- removed credit note, replacement order, and refund payment cards from `RmaDetailView` side rail
- kept related issue and related order cards in the side rail
- kept artifact links in `RmaExecutionSummary`, where they are tied to blocked/completed remedy state
- kept read-model hydration, route behavior, workflow actions, server behavior, and cache policy unchanged

Smells removed:

- remedy artifact navigation was duplicated in both the execution summary and the detail side rail
- side rail mixed source context with remedy execution artifacts after Issue 1 gave artifacts a focused owner

Deferred:

- the side rail remains a small local helper inside `rma-detail-view.tsx`; extract only if more source-context cards are added
- browser QA was skipped because this is a focused presentational ownership cleanup with unit coverage and no behavior change
- `rma-list.tsx` execution summary/filter behavior remains unchanged

Verification:

- `./node_modules/.bin/vitest run tests/unit/support/rma-detail-view.test.tsx`
- `./node_modules/.bin/eslint src/components/domain/support/rma/rma-detail-view.tsx tests/unit/support/rma-detail-view.test.tsx`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`
- `./node_modules/.bin/vitest run tests/unit/support`

Goal adaptation: no standing goal change. This continues the support/RMA operator UX sprint by clarifying which component owns source context versus remedy artifact truth.

Residual risk: RMA list execution summaries may still need a pass for blocked/completed recovery clarity, but the RMA detail page now has a cleaner ownership split.

### Issue 3: RMA List Execution Cells Boundary

Touched domains: support/RMA list UI, RMA execution list context, support UI tests.

Workflow protected: RMA list route/container -> `RmaList` presenter -> focused remedy/context cells -> execution summary helper -> blocked, pending, completed-artifact, source order, and linked issue row states.

Business value: operators can scan RMA recovery state in the list without list/table/filter code owning all remedy and context rendering. Blocked, pending, and completed artifact states now have a focused review surface and targeted tests.

Standards checked:

- extracted `RmaListRemedyCell` for selected remedy and execution badge rendering
- extracted `RmaListContextCell` for artifact/blocker/pending context plus source order and issue state
- extracted `RmaExecutionBadge` from the list file into the same row-cell boundary
- kept `RmaList` responsible for filters, table assembly, selection, pagination, loading/error/empty states, sorting, and row actions
- kept `getRmaExecutionContextSummary`, read-model hydration, route search schemas, server behavior, and query/cache policy unchanged

Smells removed:

- `rma-list.tsx` directly owned remedy badge, execution badge, execution context, source order, and linked issue row rendering
- blocked/completed/pending row states lacked focused component coverage
- the RMA list mixed table orchestration with high-stakes recovery-state display

Deferred:

- no browser QA for the RMA list route; this is a focused presentational extraction with unit coverage
- filter UX and route search behavior remain unchanged
- broader `rma-list.tsx` table/filter size can be reviewed later if list workflows keep expanding

Verification:

- `./node_modules/.bin/vitest run tests/unit/support/rma-list-execution-cells.test.tsx`
- `./node_modules/.bin/eslint src/components/domain/support/rma/rma-list.tsx src/components/domain/support/rma/rma-list-execution-cells.tsx src/components/domain/support/rma/index.ts tests/unit/support/rma-list-execution-cells.test.tsx`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`
- `./node_modules/.bin/vitest run tests/unit/support`

Goal adaptation: no standing goal change. This continues the support/RMA operator UX sprint by giving list recovery state the same focused ownership as detail execution state.

Residual risk: Support Sprint 2 has now covered RMA detail execution, detail source context, and list execution visibility. The remaining obvious support debt is outside RMA recovery display: either close this sprint or move to the separate `issue-detail-view.tsx` monolith under a new issue/support sprint.
