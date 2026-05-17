# Reliability Maintainer Sprint 37: Entity Combobox Search Failure State

## Status

Closed and commit-ready.

## Problem

`EntityCombobox` is the shared async selector used by customer, order, and
warranty wrappers. When its `searchFn` failed, it wrote the raw error through
`console.error("Search error:", error)` and cleared options. The visible state
then fell through to the normal empty result copy, which could make an operator
think there were no matching customers, orders, or warranties when the actual
problem was a failed lookup.

That was a shared UI contract smell: cross-domain selectors should distinguish
empty results from unavailable search, and diagnostics should go through the
central logger with bounded context.

## Workflow Spine Protected

Domain form/search surface -> customer/order/warranty combobox wrapper ->
`EntityCombobox` -> domain `searchFn`/server function or lookup hook -> honest
search failure state -> structured shared UI diagnostic.

## Touched Domains

- Shared UI primitives.
- Customer search selector behavior through `CustomerCombobox`.
- Order search selector behavior through `OrderCombobox`.
- Warranty search selector behavior through `WarrantyCombobox`.
- Reliability/test-signal coverage for shared error handling.

## Business Value Protected

RENOZ operators use selectors to bind real business records to financial,
support, warranty, and order workflows. A failed lookup must not masquerade as
"no records found"; that can send the operator down the wrong recovery path.
This slice makes failed search explicit while keeping the existing empty-state
copy for true empty results.

## Scope Constraints

- No route, page/container, domain wrapper API, server function, schema,
  database query, tenant check, query key, cache invalidation, mutation,
  inventory, finance, or serialized-lineage behavior changed.
- Existing wrapper placeholders and empty messages remain unchanged.
- The shared component keeps the same default debounce behavior.
- The new `searchErrorMessage` prop is optional and defaults to generic recovery
  copy.

## Changes

- Added an explicit `searchError` state to `EntityCombobox`.
- Added optional `searchErrorMessage` support with the default
  `Search failed. Try again.`
- Replaced raw `console.error` with `logger.error("Entity combobox search failed", ...)`.
- Logged bounded context only: component name and query length, not raw query
  text or record payloads.
- Kept abort errors ignored.
- Added a focused render test proving a failed search shows the failure message,
  does not show the empty-result message, and logs through the centralized
  logger.
- Added a source contract proving raw console search errors stay out of the
  shared combobox.

## Standards Checked

- Domain ownership: the cross-domain invariant belongs in the shared combobox;
  customer/order/warranty wrappers inherit it without duplicating error logic.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: unchanged. This slice only changes the shared UI state
  after the caller's search function rejects.
- Tenant isolation: unchanged; tenant filtering remains in the domain lookup
  hooks/server functions.
- Transactional inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged.
- Honest UI states and operator-safe errors: improved by separating failed
  lookup from empty search results.
- Mutation/cache contracts: unchanged.
- Reviewable diff: one shared component update, one focused shared test, one
  closeout doc.

## Smells Removed

- Removed raw `console.error` from the shared entity search control.
- Removed misleading empty-result presentation for failed async searches.
- Avoided logging raw search text in the shared diagnostic context.

## Smells Deferred

- `SkuCell` still logs clipboard failures through `console.error` and gives no
  visible copy-failure feedback.
- `BulkImportWizard` still logs parse/import failures through `console.error`,
  although it already shows visible error state.
- Documentation examples still contain `console.log` snippets. Those are not
  runtime operator errors and should be handled separately if they are worth
  cleaning.
- No browser QA was run because this slice is covered by a focused component
  render test and does not alter layout, routing, or server behavior.

## Gates

- Focused component test:
  `./node_modules/.bin/vitest run tests/unit/shared/entity-combobox-error-state.test.tsx --reporter=dot --printConsoleTrace`
  - Passed, 1 file / 2 tests in 1s.
- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/shared/entity-combobox.tsx tests/unit/shared/entity-combobox-error-state.test.tsx --report-unused-disable-directives`
  - Passed in 1s.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed in 78s.
- Full source ESLint:
  `./node_modules/.bin/eslint src --ext .ts,.tsx --report-unused-disable-directives`
  - Passed in 76s.
- Routine reliability guards:
  - `node scripts/check-route-casts.mjs` passed.
  - `node scripts/check-pending-dialog-guards.mjs` passed.
  - `node scripts/check-read-path-query-guards.mjs` passed.
- Full unit suite:
  `./node_modules/.bin/vitest run tests/unit --reporter=dot`
  - Passed, 715 files / 2328 tests in 103s.

## Goal Adaptation

No goal text changed. This sprint applies the standing maintainer goal by
treating shared UI error handling as a cross-domain product invariant: failed
lookups should be legible to operators and bounded in diagnostics.

## Residual Risk

Low application risk. The change is isolated to the shared combobox failure
state after a rejected search. The main residual risk is copy specificity:
wrappers now inherit a generic search failure message unless a future domain
slice chooses more specific recovery copy.
