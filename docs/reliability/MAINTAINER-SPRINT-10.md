# Reliability Maintainer Sprint 10: Jobs BOM Empty-State Boundary Extraction

## Status

Closed and commit-ready.

## Problem

The Jobs project BOM read-state contract was paying for the full `ProjectBomTab`
editor stack just to prove one operator-facing failure state. That path pulled in
product search, dialogs, bulk actions, import controls, and mutation wiring even
though the contract only needed to prove that a cold BOM read failure does not
show fake "No BOM yet" copy.

That made the test slower, encouraged a broad import boundary, and kept a small
read-failure concern embedded inside a large editing component.

## Workflow Spine Protected

Project detail -> BOM tab -> empty/read-failure presenter -> project materials
read helper -> operator sees "Materials unavailable" on a cold read failure
instead of a misleading empty BOM state.

## Touched Domains

- Jobs/projects BOM presentation boundary.
- Jobs BOM query-normalization and read-feedback tests.
- Reliability closeout documentation.

## Business Value Protected

The BOM workflow supports project material planning, procurement expectation,
and installation cost tracking. When materials cannot be read, the operator must
see an honest unavailable state rather than a false empty state that could imply
no materials have been planned.

## Scope Constraints

- No server-function, schema, query-key, or cache-policy changes.
- No mutation semantics changed.
- No product search, CSV import, order import, or BOM creation behavior changed.
- The full BOM editor remains intact; only the empty/read-failure presenter was
  extracted.

## Changes

- Added `ProjectBomEmptyState` as the owner of BOM empty-state and cold
  read-failure rendering.
- Updated `ProjectBomTab` to delegate the no-BOM branch to the extracted
  presenter.
- Updated the BOM read-feedback source contract to assert that the extracted
  presenter uses `getProjectMaterialsReadErrorMessage`.
- Updated the query-normalization wave 4B BOM degradation assertion to render
  the narrow presenter directly.
- Removed the 60 second timeout from the BOM degradation assertion.

## Standards Checked

- Domain ownership: Jobs/project BOM presentation remains in the Jobs domain.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: unchanged for this slice.
- Tenant isolation: unchanged; no data-access path was modified.
- Inventory and finance integrity: unchanged; no stock, costing, or financial
  mutation path was modified.
- Serialized lineage continuity: unchanged.
- Honest UI states: strengthened for BOM read failures.
- Operator-safe error handling: the presenter uses the centralized project
  materials read-error helper.
- Mutation/cache contracts: unchanged.
- Reviewable diff: narrow extraction plus targeted tests.

## Smells Removed

- A small read-state contract no longer imports the full BOM editor stack.
- The no-BOM/read-failure concern is no longer buried in a large edit component.
- The BOM degradation assertion no longer needs a defensive 60 second timeout.

## Smells Deferred

- `ProjectBomTab` is still large and should continue to be split around import,
  line editing, procurement, and summary concerns.
- `project-tasks-tab.tsx`, `pipeline.ts`, `customers.ts`, supplier purchase
  orders, warranty claims, inventory valuation, and the query-key registry remain
  high-value monolith candidates.
- Full-unit output still includes local runtime warning noise for local storage
  and optional rate-limit environment configuration.
- The Bun script runner failed in this Codex runtime with
  `CouldntReadCurrentDirectory`; direct underlying gates passed.

## Gates

- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/jobs/projects/project-bom-tab.tsx src/components/domain/jobs/projects/project-bom-empty-state.tsx tests/unit/jobs/query-normalization-wave4b.test.tsx tests/unit/jobs/project-bom-read-feedback-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/jobs/query-normalization-wave4b.test.tsx tests/unit/jobs/project-bom-read-feedback-contract.test.ts`
  - Passed: 2 files, 7 tests.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed.
- Full unit:
  `./node_modules/.bin/vitest run tests/unit`
  - Passed: 672 files, 2255 tests, 150.49s.
- Full source ESLint:
  `./node_modules/.bin/eslint src --ext .ts,.tsx --report-unused-disable-directives`
  - Passed.
- Reliability guards:
  - `node scripts/check-route-casts.mjs` passed.
  - `node scripts/check-pending-dialog-guards.mjs` passed.
  - `node scripts/check-read-path-query-guards.mjs` passed.
  - `node scripts/check-serialized-read-auto-upsert.mjs` passed.
- Diff hygiene:
  `git diff --check`
  - Passed.

## Goal Adaptation

No goal adaptation made. This sprint continues the active repo-maintainer goal:
small domain-sliced boundary cleanup, honest UI state, meaningful gates, and
reviewable closeout.

## Residual Risk

Low behavioral risk because the extraction preserves existing handlers and does
not alter data access or mutation flow.

Medium maintainability risk remains in Jobs/BOM because the parent editor is
still large. The next valuable Jobs slice should extract another cohesive BOM
sub-boundary or move to a larger server-function monolith if business priority
favors pipeline, orders, suppliers, warranty, or inventory.
