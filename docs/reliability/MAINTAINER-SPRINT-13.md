# Reliability Maintainer Sprint 13: Jobs BOM Items Table Extraction

## Status

Closed and commit-ready.

## Problem

`ProjectBomTab` still owned row rendering, product links, selection checkbox
behavior, status badges, line totals, and per-row edit/remove menus. That table
logic was unrelated to the parent tab's main responsibilities: reading BOM data,
owning mutation handlers, coordinating dialogs, and passing state into
presenters.

The parent also owned BOM item status display semantics even though the same
status config is required by edit status selection, bulk status selection, and
row badges.

## Workflow Spine Protected

Project detail -> BOM tab -> BOM item table presenter -> operator reviews,
selects, edits, or removes material rows while status semantics stay shared
between row badges and status update controls.

## Touched Domains

- Jobs/projects BOM item table presentation boundary.
- Jobs/projects BOM item status display config.
- Jobs BOM item table source contract.
- Reliability closeout documentation.

## Business Value Protected

The BOM item table is the main operator surface for material review and control.
Isolating table rendering makes it easier to improve row density, selection,
linking, and mobile behavior without touching BOM read state, summary cards,
import actions, or mutation orchestration.

## Scope Constraints

- No route, hook, server-function, schema, query-key, or cache-policy changes.
- No add/edit/remove/bulk mutation behavior changed.
- No row selection behavior intentionally changed.
- No status labels, descriptions, colors, or icons intentionally changed.
- The parent tab still owns mutation handlers and confirmation flow.

## Changes

- Added `ProjectBomItemsTable` as the owner of BOM row rendering, product links,
  selection checkboxes, status badges, line totals, and row edit/remove menu.
- Added `PROJECT_BOM_ITEM_STATUS_CONFIG` as the shared status display config for
  edit dialog, bulk status dialog, and item table.
- Updated `ProjectBomTab` to render the extracted table presenter and consume
  the shared status config.
- Added a focused source contract to keep row rendering in the table presenter
  and status semantics centralized.

## Standards Checked

- Domain ownership: Jobs/project BOM presentation remains in the Jobs domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: unchanged for this slice.
- Tenant isolation: unchanged; no data-access path was modified.
- Inventory and finance integrity: unchanged; no stock, costing mutation, or
  financial write path was modified.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved for empty rows, status badges, and totals.
- Operator-safe error handling: unchanged in parent mutation handlers.
- Mutation/cache contracts: unchanged.
- Reviewable diff: cohesive table extraction, shared status config, and one
  source-boundary contract.

## Smells Removed

- Row rendering and table selection mechanics no longer live in the parent BOM
  editor.
- BOM item status semantics no longer live inside `ProjectBomTab`.
- `ProjectBomTab` now sits at 847 lines, down from 1270 before the Jobs/BOM
  extraction sequence.

## Smells Deferred

- `ProjectBomTab` is still large. Remaining extraction candidates include add
  item dialog, edit item dialog, and bulk status dialog.
- The existing `bom-dialogs.tsx` add-item path remains separate from the inline
  `AddBomItemDialog`; reconciling that should be a focused follow-up.
- `project-tasks-tab.tsx`, `pipeline.ts`, `customers.ts`, supplier purchase
  orders, warranty claims, inventory valuation, and the query-key registry remain
  high-value monolith candidates.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/project-bom-tab.tsx src/components/domain/jobs/projects/project-bom-items-table.tsx src/components/domain/jobs/projects/project-bom-status-config.ts tests/unit/jobs/project-bom-items-table-boundary-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-bom-items-table-boundary-contract.test.ts tests/unit/jobs/project-bom-header-boundary-contract.test.ts tests/unit/jobs/project-bom-summary-boundary-contract.test.ts tests/unit/jobs/query-normalization-wave4b.test.tsx tests/unit/jobs/project-bom-read-feedback-contract.test.ts tests/unit/jobs/project-bom-mutation-contract.test.ts`
  - Passed: 6 files, 12 tests, 3.56s.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed.
- Diff hygiene:
  `git diff --check`
  - Passed.
- Full unit:
  - Skipped for this sprint. Sprint 10 ran the full unit suite (`672` files,
    `2255` tests passed), and Sprint 13 only moved table presentation and shared
    status display config with focused tests, mutation contract coverage, and
    typecheck coverage.
- Reliability guard scripts:
  - Skipped for this sprint because no route helper, dialog pending guard,
    read-path query guard, serialized read auto-upsert, server-function, schema,
    or query path changed.

## Goal Adaptation

No goal adaptation made. This continues the active repo-maintainer goal by
shrinking a large domain file through a small, tested, reviewable presenter and
shared-config extraction.

## Residual Risk

Low behavioral risk because the table receives the same items, selection object,
and edit/remove callbacks as before.

Medium maintainability risk remains because dialog implementations still live in
the parent tab. The next Jobs/BOM slice should extract or reconcile add/edit/bulk
status dialogs, with special care around the existing `bom-dialogs.tsx` module.
