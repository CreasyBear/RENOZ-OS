# Reliability Maintainer Sprint 16: Jobs BOM Add Item Dialog Consolidation

## Status

Closed and commit-ready.

## Problem

`ProjectBomTab` still owned a full add-material implementation while
`bom-dialogs.tsx` already exposed `BomAddItemDialog`. That left product search,
form state, add-item mutation execution, add-item error formatting, and close/reset
behavior split across two competing paths.

The duplicate path made future validation, operator copy, and cache-safety review
harder because maintainers had to inspect both the parent tab and the canonical
dialog to understand the same workflow.

## Workflow Spine Protected

Project detail -> BOM tab -> Add Material -> canonical BOM add dialog -> product
search -> add-item mutation -> operator sees safe success or error feedback.

## Touched Domains

- Jobs/projects BOM add-item dialog presentation boundary.
- Jobs BOM mutation source contract.
- Jobs BOM add-item boundary source contract.
- Reliability closeout documentation.

## Business Value Protected

Adding materials to a project BOM is a core planning and fulfillment workflow for
RENOZ Energy. Consolidating the add-material path makes it safer to improve BOM
creation, product search ergonomics, and error feedback without making the parent
BOM tab absorb another mutation workflow.

## Scope Constraints

- No route, hook, server-function, schema, database, query-key, or cache-policy
  changes.
- No add-item mutation hook behavior changed.
- No tenant, inventory movement, finance, stock costing, or serialized lineage
  write path changed.
- The parent tab still owns the add-dialog open state and passes the active BOM
  id to the dialog.

## Changes

- Replaced the inline `AddBomItemDialog` in `ProjectBomTab` with the existing
  exported `BomAddItemDialog`.
- Removed product search, debounced query state, add-item mutation execution,
  unit-cost state, notes state, and add-item error formatting from
  `ProjectBomTab`.
- Updated `BomAddItemDialog` to use the repo toast wrapper instead of importing
  `sonner` directly.
- Preserved the inline dialog's more useful operator details in the canonical
  dialog: "Add Material to BOM" copy, product-specific success toast, and
  org-aware product price formatting.
- Added a boundary contract that prevents add-item product search and mutation UI
  from moving back into the parent tab.
- Updated the BOM mutation contract so add-item error formatting is asserted on
  the canonical dialog owner.

## Standards Checked

- Domain ownership: Jobs/project BOM presentation remains in the Jobs domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: unchanged for this slice.
- Tenant isolation: unchanged; the project-scoped add hook and server checks were
  not modified.
- Inventory and finance integrity: unchanged; no inventory movement, costing
  mutation, or financial write path was modified.
- Serialized lineage continuity: unchanged.
- Honest UI states: preserved through the canonical dialog's submit disabled
  state, submit error surface, close guard, and form reset behavior.
- Operator-safe error handling: add-item failures still route through
  `formatProjectBomMutationError(error, 'addItem')`.
- Mutation/cache contracts: unchanged; add-item still uses `useAddBomItem(projectId)`.
- Reviewable diff: parent tab deletion plus canonical dialog polish and focused
  source contracts.

## Smells Removed

- Add-item mutation UI no longer lives in the parent BOM tab.
- Product search and debounced search state no longer sit inside the parent BOM
  read/selection/import surface.
- Direct `sonner` import removed from the canonical BOM add dialog.
- `ProjectBomTab` now sits at 319 lines, down from 580 before this sprint and
  1270 before the Jobs/BOM extraction sequence.

## Smells Deferred

- `BomAddItemDialog` still uses a literal `$` prefix for the unit-cost input
  because `NumberField` accepts a static prefix string. Product search result
  prices now use organization-aware formatting, but input prefix localization
  needs a shared form-field affordance.
- Several older Jobs dialogs still import `sonner` directly; this sprint only
  normalized the touched BOM add dialog.
- `project-tasks-tab.tsx`, supplier detail, inventory detail/dashboard, order
  detail, invoice detail, and the query-key registry remain high-value
  architecture cleanup candidates.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/project-bom-tab.tsx src/components/domain/jobs/projects/bom-dialogs.tsx tests/unit/jobs/project-bom-add-item-dialog-boundary-contract.test.ts tests/unit/jobs/project-bom-mutation-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-bom-add-item-dialog-boundary-contract.test.ts tests/unit/jobs/project-bom-edit-item-dialog-boundary-contract.test.ts tests/unit/jobs/project-bom-bulk-status-dialog-boundary-contract.test.ts tests/unit/jobs/project-bom-items-table-boundary-contract.test.ts tests/unit/jobs/project-bom-header-boundary-contract.test.ts tests/unit/jobs/project-bom-summary-boundary-contract.test.ts tests/unit/jobs/query-normalization-wave4b.test.tsx tests/unit/jobs/project-bom-read-feedback-contract.test.ts tests/unit/jobs/project-bom-mutation-contract.test.ts`
  - Passed: 9 files, 15 tests, 2.04s.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed.
- Diff hygiene:
  `git diff --check`
  - Passed.
- Reliability guard scripts:
  - `node scripts/check-route-casts.mjs` - passed.
  - `node scripts/check-pending-dialog-guards.mjs` - passed.
  - `node scripts/check-read-path-query-guards.mjs` - passed.
  - `node scripts/check-serialized-read-auto-upsert.mjs` - passed.
- Full unit:
  - Skipped for this sprint. The slice consolidates a presentation owner and
    keeps add-item hook/server/cache behavior unchanged. Focused Jobs/BOM
    contracts, full typecheck, targeted ESLint, and reliability guards cover the
    changed surface.

## Goal Adaptation

No goal adaptation made. This continues the active repo-maintainer goal by
removing duplicate mutation UI, preserving the BOM workflow spine, and leaving
the Jobs/BOM area easier to reason about.

## Residual Risk

Low mutation risk because the same project-scoped add hook and existing server
contract remain in place.

Medium UI risk because the tab now uses the existing `FormDialog` add-material
path instead of the retired inline manual `Dialog` implementation. The tradeoff
is intentional: one canonical add-item owner is easier to harden than two
competing implementations.
