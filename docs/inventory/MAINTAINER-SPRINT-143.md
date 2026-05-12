# Inventory Maintainer Sprint 143: Stock Count Completion Evidence Freshness

## Status

Closed in commit-ready state.

## Issue 1: Non-Adjusting Count Completion Could Bypass Freshness

### Problem

The stock-count completion API accepts `applyAdjustments: false`. After Sprint 142, freshness checks protected adjustment completion, but the non-adjusting path could still complete a count without locking inventory rows or verifying that the count-sheet snapshot was fresh.

### Workflow Spine

Stock count start
-> expected quantity snapshot
-> counted quantity entry
-> complete stock count
-> lock every counted inventory row
-> reject stale or missing rows
-> optionally apply variance adjustments only after freshness passes
-> completed count evidence.

### Touched Domains

- Inventory stock-count server completion.
- Inventory stock-count contract tests.
- Inventory sprint evidence.

### Business Value Protected

A completed cycle count is business evidence even when adjustments are not applied. It must not certify stale warehouse truth.

### Scope Constraints

- Do not remove the `applyAdjustments` API option.
- Do not change desktop UI behavior, which currently calls completion with adjustments enabled.
- Do not alter adjustment math, cost-layer mutation, valuation recompute, or serialized lineage when adjustments are enabled.
- Do not add recovery UX in this slice.

### Changes

- Moved the all-row lock and snapshot freshness guard outside the `applyAdjustments` condition.
- Kept variance adjustment writes gated by `applyAdjustments`.
- Updated the stock-count contract test to reject regression back to `applyAdjustments && items.length` freshness gating.

### Standards Checked

- Domain ownership: stock-count completion owns completed-count evidence freshness.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: route and hook unchanged; server completion contract tightened.
- Tenant isolation/data integrity: all inventory rows remain organization-scoped and locked before completion evidence is written.
- Transactional inventory/finance integrity: adjustment writes are unchanged and still require a fresh snapshot first.
- Serialized lineage continuity: serialized mutations remain behind the same fresh-snapshot gate.
- UI states/error handling: stale evidence reports through the existing conflict path.
- Query/cache contract: unchanged.
- Reviewability: two-line server behavior change, focused contract-test assertions, closeout note.

### Smells Removed

- Freshness checks were coupled to adjustment writes instead of completion evidence.
- `applyAdjustments: false` could mark stale count evidence complete.

### Deferred

- Explicit UI affordance for completing counts without adjustment remains deferred.
- Stale-count recovery workflow remains deferred.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/stock-count-tenant-scope-contract.test.ts`.
- Passed: focused ESLint on touched server function and contract test.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This is a small contract correction under the same stock-count integrity thread.

### Residual Risk

Moderate. The API becomes stricter for non-adjusting completion calls that previously bypassed freshness checks.
