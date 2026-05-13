# Reliability Maintainer Sprint 15: Jobs BOM Edit Item Dialog Extraction

## Status

Closed and commit-ready.

## Problem

`ProjectBomTab` still owned the edit-material dialog implementation: form reset
from selected item data, status parsing, pending-dialog guards, cost preview,
update-item mutation, and operator-safe mutation feedback.

That work is cohesive dialog behavior. Keeping it inline made the parent tab
responsible for another mutation UI instead of concentrating on BOM read state,
selection state, import handlers, confirmation flow, and presenter wiring.

## Workflow Spine Protected

Project detail -> BOM tab -> item table -> edit item dialog -> update-item
mutation -> operator sees safe success or error feedback.

## Touched Domains

- Jobs/projects BOM edit item dialog presentation boundary.
- Jobs BOM mutation source contract.
- Jobs BOM item table source contract.
- Reliability closeout documentation.

## Business Value Protected

Editing BOM material quantities, costs, status, and notes is core project
material control. Isolating this dialog makes it easier to improve validation,
copy, and edit ergonomics without touching read state, import actions, summary
cards, row rendering, bulk status, or delete confirmation flow.

## Scope Constraints

- No route, hook, server-function, schema, query-key, or cache-policy changes.
- No update-item mutation behavior changed.
- No edit form fields, status labels, cost preview, or pending guard behavior
  intentionally changed.
- The parent tab still owns edit-dialog open state and selected item state.

## Changes

- Added `ProjectBomEditItemDialog` as the owner of the edit-material dialog UI,
  selected-item reset, status parsing, cost preview, update-item mutation, and
  update-item error formatting.
- Updated `ProjectBomTab` to render the extracted dialog presenter.
- Updated the project BOM mutation contract so `updateItem` operator-safe error
  handling follows the new owner.
- Updated the table boundary contract now that the parent no longer imports the
  shared status config.
- Added a focused source contract to keep the edit dialog boundary intact.

## Standards Checked

- Domain ownership: Jobs/project BOM presentation remains in the Jobs domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: unchanged for this slice.
- Tenant isolation: unchanged; no data-access path was modified.
- Inventory and finance integrity: unchanged; no stock, costing mutation, or
  financial write path was modified.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved for selected item reset, pending state, and total
  cost preview.
- Operator-safe error handling: preserved in the extracted dialog.
- Mutation/cache contracts: unchanged; the edit dialog still uses the same
  project-scoped update hook.
- Reviewable diff: cohesive dialog extraction plus focused contract updates.

## Smells Removed

- Edit-item mutation UI no longer lives in the parent BOM editor.
- Update-item operator-safe error handling now lives with the UI that invokes it.
- `ProjectBomTab` now sits at 580 lines, down from 1270 before the Jobs/BOM
  extraction sequence.

## Smells Deferred

- `ProjectBomTab` still owns the add-material dialog.
- The existing `bom-dialogs.tsx` add-item path remains separate from the inline
  `AddBomItemDialog`; reconciling that should be a focused follow-up rather than
  another simple extraction.
- `project-tasks-tab.tsx`, `pipeline.ts`, `customers.ts`, supplier purchase
  orders, warranty claims, inventory valuation, and the query-key registry remain
  high-value monolith candidates.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/project-bom-tab.tsx src/components/domain/jobs/projects/project-bom-edit-item-dialog.tsx tests/unit/jobs/project-bom-edit-item-dialog-boundary-contract.test.ts tests/unit/jobs/project-bom-items-table-boundary-contract.test.ts tests/unit/jobs/project-bom-mutation-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-bom-edit-item-dialog-boundary-contract.test.ts tests/unit/jobs/project-bom-bulk-status-dialog-boundary-contract.test.ts tests/unit/jobs/project-bom-items-table-boundary-contract.test.ts tests/unit/jobs/project-bom-header-boundary-contract.test.ts tests/unit/jobs/project-bom-summary-boundary-contract.test.ts tests/unit/jobs/query-normalization-wave4b.test.tsx tests/unit/jobs/project-bom-read-feedback-contract.test.ts tests/unit/jobs/project-bom-mutation-contract.test.ts`
  - Passed: 8 files, 14 tests, 2.26s.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed.
- Diff hygiene:
  `git diff --check`
  - Passed.
- Full unit:
  - Skipped for this sprint. Sprint 10 ran the full unit suite (`672` files,
    `2255` tests passed), and Sprint 15 only moved edit-dialog presentation and
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
extraction while preserving project-scoped mutation safety.

## Residual Risk

Low behavioral risk because the dialog uses the same project-scoped update hook,
selected item data, and open-state callback as before.

Medium maintainability risk remains around the add-material path. The next
Jobs/BOM slice should decide whether to reconcile the inline `AddBomItemDialog`
with the existing `bom-dialogs.tsx` implementation or deliberately retire one of
the two paths.
