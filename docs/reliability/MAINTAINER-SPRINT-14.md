# Reliability Maintainer Sprint 14: Jobs BOM Bulk Status Dialog Extraction

## Status

Closed and commit-ready.

## Problem

`ProjectBomTab` still owned the bulk status dialog implementation even after the
item table and shared BOM item status config were extracted. That kept status
mutation UI, pending-dialog guards, status parsing, success copy, and
operator-safe update-status errors inside the parent tab.

The parent should own selection, mutation adapters, and completion wiring. The
dialog implementation can live behind a small interface.

## Workflow Spine Protected

Project detail -> BOM tab -> selected material rows -> bulk status dialog ->
update-status mutation -> selection clears and operator sees safe success or
error feedback.

## Touched Domains

- Jobs/projects BOM bulk status dialog presentation boundary.
- Jobs BOM mutation source contract.
- Reliability closeout documentation.

## Business Value Protected

Bulk status updates let operators move groups of project materials through the
planned, ordered, received, allocated, and installed workflow. Keeping the dialog
isolated makes status workflow changes easier without touching read state,
summary cards, row rendering, import actions, or delete confirmation flow.

## Scope Constraints

- No route, hook, server-function, schema, query-key, or cache-policy changes.
- No update-status mutation behavior changed.
- No selected-row clear behavior changed.
- No status labels, descriptions, colors, or icons changed.
- The parent tab still owns the update-status hook and passes it into the dialog
  as a mutation adapter.

## Changes

- Added `ProjectBomBulkStatusDialog` as the owner of the bulk status dialog UI,
  pending guards, status parsing, success toast, and update-status error
  formatting.
- Updated `ProjectBomTab` to render the extracted dialog presenter.
- Updated the project BOM mutation contract so `updateStatus` operator-safe
  error handling follows the new owner.
- Added a focused source contract to keep the bulk status dialog boundary
  intact.

## Standards Checked

- Domain ownership: Jobs/project BOM presentation remains in the Jobs domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: unchanged for this slice.
- Tenant isolation: unchanged; no data-access path was modified.
- Inventory and finance integrity: unchanged; no stock, costing mutation, or
  financial write path was modified.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved for pending status and selected item counts.
- Operator-safe error handling: preserved in the extracted dialog.
- Mutation/cache contracts: unchanged; the same update-status hook remains owned
  by the parent.
- Reviewable diff: cohesive dialog extraction plus focused contract updates.

## Smells Removed

- Bulk status dialog implementation no longer lives in the parent BOM editor.
- Update-status operator-safe error handling now lives with the UI that invokes
  it.
- `ProjectBomTab` now sits at 760 lines, down from 1270 before the Jobs/BOM
  extraction sequence.

## Smells Deferred

- `ProjectBomTab` still owns add and edit item dialogs.
- The existing `bom-dialogs.tsx` add-item path remains separate from the inline
  `AddBomItemDialog`; reconciling that should be a focused follow-up.
- `project-tasks-tab.tsx`, `pipeline.ts`, `customers.ts`, supplier purchase
  orders, warranty claims, inventory valuation, and the query-key registry remain
  high-value monolith candidates.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/project-bom-tab.tsx src/components/domain/jobs/projects/project-bom-bulk-status-dialog.tsx tests/unit/jobs/project-bom-bulk-status-dialog-boundary-contract.test.ts tests/unit/jobs/project-bom-mutation-contract.test.ts --report-unused-disable-directives`
  - Passed after removing one leftover import.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-bom-bulk-status-dialog-boundary-contract.test.ts tests/unit/jobs/project-bom-items-table-boundary-contract.test.ts tests/unit/jobs/project-bom-header-boundary-contract.test.ts tests/unit/jobs/project-bom-summary-boundary-contract.test.ts tests/unit/jobs/query-normalization-wave4b.test.tsx tests/unit/jobs/project-bom-read-feedback-contract.test.ts tests/unit/jobs/project-bom-mutation-contract.test.ts`
  - Passed: 7 files, 13 tests, 2.48s.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed.
- Diff hygiene:
  `git diff --check`
  - Passed.
- Full unit:
  - Skipped for this sprint. Sprint 10 ran the full unit suite (`672` files,
    `2255` tests passed), and Sprint 14 only moved dialog presentation and
    operator-safe mutation feedback behind a narrow interface with focused tests
    and typecheck coverage.
- Reliability guard scripts:
  - Skipped for this sprint because no route helper, read-path query guard,
    serialized read auto-upsert, server-function, schema, or query path changed.
    Pending-dialog guard behavior was preserved by moving the existing guard
    calls with the dialog.

## Goal Adaptation

No goal adaptation made. This continues the active repo-maintainer goal by
shrinking a large domain file through a small, tested, reviewable dialog
extraction while preserving mutation safety.

## Residual Risk

Low behavioral risk because the dialog receives the same selected items,
completion callback, and update-status mutation adapter as before.

Medium maintainability risk remains because add/edit item dialog implementations
still live in the parent tab, and add-item behavior appears duplicated with the
older `bom-dialogs.tsx` module.
