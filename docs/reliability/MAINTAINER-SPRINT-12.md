# Reliability Maintainer Sprint 12: Jobs BOM Header Action Extraction

## Status

Closed and commit-ready.

## Problem

`ProjectBomTab` still owned the BOM header action cluster directly: BOM number
display, CSV file-input/ref mechanics, linked-order import affordance, and the
Add Material command. Those controls are presentation and interaction plumbing,
while the parent tab should be concentrating on data hooks, mutation handlers,
selection, and dialog orchestration.

Keeping the header controls inline made the parent harder to scan and kept
file-input mechanics coupled to unrelated table, summary, dialog, and mutation
concerns.

## Workflow Spine Protected

Project detail -> BOM tab -> header action presenter -> operator imports CSV,
imports linked order lines, or opens Add Material while the parent tab preserves
the existing mutation handlers.

## Touched Domains

- Jobs/projects BOM presentation boundary.
- Jobs BOM header source contract.
- Reliability closeout documentation.

## Business Value Protected

The BOM header controls are the operator's entry points for turning project
material planning into actual BOM data. Keeping those controls isolated makes it
easier to improve import and add-material ergonomics without touching BOM table,
summary, read-failure, or bulk-status behavior.

## Scope Constraints

- No route, hook, server-function, schema, query-key, or cache-policy changes.
- No CSV import, linked-order import, or Add Material mutation behavior changed.
- No BOM item table, summary, read-failure, or bulk action behavior changed.
- The parent still owns mutation handlers and passes them into the presenter.

## Changes

- Added `ProjectBomHeaderActions` as the owner of BOM header display, CSV input
  ref, linked-order import affordance, and Add Material button.
- Updated `ProjectBomTab` to render the extracted header presenter.
- Removed header-specific tooltip, upload, shopping-cart, and file-input
  plumbing from the parent tab.
- Added a focused source contract to keep the header presenter boundary intact.

## Standards Checked

- Domain ownership: Jobs/project BOM presentation remains in the Jobs domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: unchanged for this slice.
- Tenant isolation: unchanged; no data-access path was modified.
- Inventory and finance integrity: unchanged; no stock, costing mutation, or
  financial write path was modified.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved; pending labels and linked-order disabled tooltip
  stay in the header presenter.
- Operator-safe error handling: unchanged in parent mutation handlers.
- Mutation/cache contracts: unchanged.
- Reviewable diff: narrow extraction plus one source-boundary contract.

## Smells Removed

- File-input ref mechanics no longer live in the parent BOM editor.
- Header/import/add-material presentation no longer sits between read-state and
  table orchestration.
- `ProjectBomTab` now sits at 1089 lines, down from 1270 before the Jobs/BOM
  extraction sequence.

## Smells Deferred

- `ProjectBomTab` is still large. Remaining extraction candidates include add
  item dialog, edit item dialog, bulk status dialog, and item table rendering.
- The existing `bom-dialogs.tsx` add-item implementation appears separate from
  the inline `AddBomItemDialog`; reconciling that duplication should be a
  deliberate follow-up rather than a drive-by change.
- `project-tasks-tab.tsx`, `pipeline.ts`, `customers.ts`, supplier purchase
  orders, warranty claims, inventory valuation, and the query-key registry remain
  high-value monolith candidates.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/project-bom-tab.tsx src/components/domain/jobs/projects/project-bom-header-actions.tsx tests/unit/jobs/project-bom-header-boundary-contract.test.ts --report-unused-disable-directives`
  - Passed after restoring the `Badge` import still required by the table.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-bom-header-boundary-contract.test.ts tests/unit/jobs/project-bom-summary-boundary-contract.test.ts tests/unit/jobs/query-normalization-wave4b.test.tsx tests/unit/jobs/project-bom-read-feedback-contract.test.ts`
  - Passed: 4 files, 9 tests, 2.11s.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed.
- Diff hygiene:
  `git diff --check`
  - Passed.
- Full unit:
  - Skipped for this sprint. Sprint 10 ran the full unit suite (`672` files,
    `2255` tests passed), and Sprint 12 only moved header presentation behind a
    narrow interface with focused tests and typecheck coverage.
- Reliability guard scripts:
  - Skipped for this sprint because no route helper, dialog pending guard,
    read-path query guard, serialized read auto-upsert, server-function, schema,
    or query path changed.

## Goal Adaptation

No goal adaptation made. This continues the active repo-maintainer goal by
shrinking a large domain file through a small, tested, reviewable
presentation-boundary extraction.

## Residual Risk

Low behavioral risk because the presenter receives the same pending state and
callbacks and owns only display/ref mechanics.

Medium maintainability risk remains because the parent BOM tab still owns
multiple dialog implementations and table rendering. The next Jobs/BOM slice
should either extract the item table or reconcile the inline add-item dialog with
the existing `bom-dialogs.tsx` path.
