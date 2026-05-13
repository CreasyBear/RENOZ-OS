# Reliability Maintainer Sprint 11: Jobs BOM Summary Presenter Extraction

## Status

Closed and commit-ready.

## Problem

`ProjectBomTab` still mixed several BOM responsibilities in one large file:
dialog state, mutation handlers, CSV and order import controls, bulk status
updates, table rendering, read-failure handling, and summary card calculation.

The summary cards were already a cohesive submodule with a small interface
(`items` and `bom`), but they still lived inside the parent editor file. That
kept cost, status, and progress rendering coupled to unrelated edit and mutation
concerns.

## Workflow Spine Protected

Project detail -> BOM tab -> project BOM data -> summary presenter -> operator
sees BOM status, material count, estimated cost, and installation progress.

## Touched Domains

- Jobs/projects BOM presentation boundary.
- Jobs BOM summary source contract.
- Reliability closeout documentation.

## Business Value Protected

The BOM summary gives operators a quick read on material planning and install
progress. Keeping that presenter isolated makes it easier to change cost,
status, and progress display without touching import, editing, bulk mutation, or
read-failure behavior.

## Scope Constraints

- No route, hook, server-function, schema, query-key, or cache-policy changes.
- No mutation behavior changed.
- No CSV import, order import, add/edit/remove item behavior changed.
- No status labels, cost calculation, or progress calculation intentionally
  changed.

## Changes

- Added `ProjectBomSummaryCards` as the owner of BOM status, material count,
  estimated cost, and installation progress cards.
- Removed the summary-card implementation and BOM status display config from
  `ProjectBomTab`.
- Updated `ProjectBomTab` to render the extracted summary presenter with the
  same `items` and `bom` data.
- Added a focused source contract to keep the summary presenter from collapsing
  back into the parent tab.

## Standards Checked

- Domain ownership: Jobs/project BOM presentation remains in the Jobs domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: unchanged for this slice.
- Tenant isolation: unchanged; no data-access path was modified.
- Inventory and finance integrity: unchanged; no stock, costing mutation, or
  financial write path was modified.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved; summary rendering still reflects BOM data.
- Operator-safe error handling: unchanged.
- Mutation/cache contracts: unchanged.
- Reviewable diff: narrow extraction plus one source-boundary contract.

## Smells Removed

- BOM status/cost/progress rendering no longer lives inside the parent editor.
- `ProjectBomTab` dropped another cohesive internal presenter and now sits at
  1141 lines, down from 1270 after Sprint 10.
- Summary-specific imports and config moved out of the parent tab.

## Smells Deferred

- `ProjectBomTab` is still large. Remaining extraction candidates include add
  item dialog, edit item dialog, bulk status dialog, table rendering, and import
  action header controls.
- `project-tasks-tab.tsx`, `pipeline.ts`, `customers.ts`, supplier purchase
  orders, warranty claims, inventory valuation, and the query-key registry remain
  high-value monolith candidates.
- Full-unit output still carries local runtime warning noise.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/project-bom-tab.tsx src/components/domain/jobs/projects/project-bom-summary-cards.tsx tests/unit/jobs/project-bom-summary-boundary-contract.test.ts --report-unused-disable-directives`
  - Passed after removing one leftover import.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-bom-summary-boundary-contract.test.ts tests/unit/jobs/query-normalization-wave4b.test.tsx tests/unit/jobs/project-bom-read-feedback-contract.test.ts`
  - Passed: 3 files, 8 tests, 3.47s.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed.
- Diff hygiene:
  `git diff --check`
  - Passed.
- Full unit:
  - Skipped for this sprint. Sprint 10 ran the full unit suite immediately
    before this slice (`672` files, `2255` tests passed), and this slice only
    moved an internal presenter with focused tests and typecheck coverage.
- Reliability guard scripts:
  - Skipped for this sprint because no route helper, dialog pending guard,
    read-path query guard, serialized read auto-upsert, server-function, or
    schema path changed.

## Goal Adaptation

No goal adaptation made. This continues the active repo-maintainer goal by
shrinking a large domain file through a reviewable, tested, presentation-only
boundary extraction.

## Residual Risk

Low behavioral risk because the presenter receives the same `items` and `bom`
inputs and keeps the existing calculations.

Medium maintainability risk remains because `ProjectBomTab` still owns too many
interactive concerns. The next Jobs/BOM slice should extract either the action
header/import controls or the add/edit/bulk status dialogs.
