# Reliability Maintainer Sprint 38: SKU Copy Failure Feedback

## Status

Closed and commit-ready.

## Problem

`SkuCell` is exported through the shared data-table package and is used by the
products table for copyable SKUs. When clipboard access failed, the cell wrote a
raw `console.error("Failed to copy:", err)` and gave the operator no visible or
accessible failure state.

That made a real operator action look like nothing happened. Copying a SKU is a
small workflow, but SKU handling sits close to product lookup, inventory
movement, warehouse picking, and support/warranty identification. The shared
cell should make success and failure legible.

## Workflow Spine Protected

Products table -> shared data-table exports -> `SkuCell` -> browser clipboard
write -> copied/failed state -> structured diagnostic on failure.

## Touched Domains

- Shared data-table cell primitives.
- Product catalog SKU table behavior.
- Reliability/test-signal coverage for shared operator feedback.

## Business Value Protected

Operators copy SKUs to search, reconcile, communicate, and identify battery OEM
products across ordering, inventory, support, and warranty work. A failed copy
should not silently disappear. This slice gives the operator immediate state and
keeps the diagnostic centralized without logging raw console output.

## Scope Constraints

- No route, page/container, product query, server function, schema, database,
  tenant check, query key, cache invalidation, mutation, inventory, finance, or
  serialized-lineage behavior changed.
- Non-copyable SKU rendering is unchanged.
- Empty/fallback SKU rendering is unchanged.
- Clipboard behavior still uses `navigator.clipboard.writeText(value)`.
- The cell logs SKU length rather than the SKU value on failure.

## Changes

- Replaced boolean `copied` state with an explicit `idle | copied | failed`
  copy status.
- Added accessible `aria-label` and `title` text for idle, copied, and failed
  states.
- Added a visible failure icon for failed copy attempts.
- Replaced raw `console.error` with `logger.warn("Failed to copy SKU to clipboard", ...)`.
- Added timeout cleanup on unmount so transient copy states do not update after
  the cell leaves the table.
- Added focused tests for successful copy feedback, failed copy feedback, bounded
  logging context, and the no-raw-console source contract.

## Standards Checked

- Domain ownership: copy feedback belongs in the shared SKU cell, not in each
  product table consumer.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: unchanged. This is a browser-only cell interaction after
  product data has already rendered.
- Tenant isolation: unchanged.
- Transactional inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged.
- Honest UI states and operator-safe errors: improved by making clipboard
  failure explicit and bounded.
- Mutation/cache contracts: unchanged.
- Reviewable diff: one shared cell update, one focused shared test, one closeout
  doc.

## Smells Removed

- Removed raw `console.error` from copyable SKU cells.
- Removed silent clipboard failure for product SKU copy actions.
- Avoided logging the SKU value itself in failure diagnostics.
- Added cleanup for the transient copy status timer.

## Smells Deferred

- `BulkImportWizard` still has two raw `console.error` paths for parse/import
  failures. It already shows visible error state, so it is a separate bounded
  cleanup candidate.
- Broader clipboard usage across detail pages still varies between toast,
  silent write, and no failure handling. That should be handled as a future
  copy-action consistency slice, not bundled into this SKU-cell fix.
- No browser QA was run because the behavior is covered by focused component
  tests and does not alter routing, layout structure, server behavior, or data
  fetching.

## Gates

- Focused component test:
  `./node_modules/.bin/vitest run tests/unit/shared/sku-cell-copy-feedback.test.tsx --reporter=dot --printConsoleTrace`
  - Passed, 1 file / 3 tests in 2s.
- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/shared/data-table/cells/sku-cell.tsx tests/unit/shared/sku-cell-copy-feedback.test.tsx --report-unused-disable-directives`
  - Passed in 2s.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed in 178s.
- Full source ESLint:
  `./node_modules/.bin/eslint src --ext .ts,.tsx --report-unused-disable-directives`
  - Passed in 178s.
- Routine reliability guards:
  - `node scripts/check-route-casts.mjs` passed.
  - `node scripts/check-pending-dialog-guards.mjs` passed.
  - `node scripts/check-read-path-query-guards.mjs` passed.
- Full unit suite:
  `./node_modules/.bin/vitest run tests/unit --reporter=dot`
  - Passed, 716 files / 2331 tests in 150s.

## Goal Adaptation

No goal text changed. This sprint applies the standing maintainer goal by
treating shared operator feedback as product infrastructure: small controls
should fail visibly, accessibly, and with bounded diagnostics.

## Residual Risk

Low application risk. The change is isolated to copyable SKU cell feedback after
clipboard success or failure. The main residual risk is broader copy-action
inconsistency elsewhere in the app, which remains visible for future sprint
selection.
