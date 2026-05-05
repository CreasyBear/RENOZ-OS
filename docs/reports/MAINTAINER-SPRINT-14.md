# Reports Maintainer Sprint 14

## Status

Closed after Issue 1.

## Issue 1: Win/Loss Read Feedback Boundary

### Problem

`useWinLossAnalysis` and `useCompetitors` already normalize always-shaped read failures, but `WinLossAnalysisContainer` rendered `(analysisQuery.error ?? competitorsQuery.error)?.message` directly in the cached/unavailable alert. That left the win/loss report surface behind the reports landing, procurement, and job costing read-feedback boundaries.

### Workflow Spine

`/reports/win-loss`
-> `WinLossAnalysisContainer`
-> `useWinLossAnalysis` / `useCompetitors`
-> pipeline win/loss server functions
-> normalized read query errors
-> cached or unavailable win/loss alert
-> operator-safe read feedback.

### Touched Domains

- Reports win/loss read state.
- Reports read feedback helpers.

### Business Value Protected

Win/loss analysis helps RENOZ understand sales outcomes, competitors, and revenue lost or won. If the read path is degraded, operators should see stable recovery copy while cached analysis remains usable, not raw server or database wording.

### Scope Constraints

- Did not change win/loss or competitor server functions, schemas, query keys, cache timing, presenter charts, export behavior, scheduling behavior, or period selection.
- Did not change the normalized read hooks because they already use always-shaped read contracts.
- Did not broaden into pipeline opportunity or win/loss reason management screens.

### Changes

- Added a win/loss read-error wrapper using the shared reports unsafe-message guard.
- Routed cached/unavailable win/loss alert copy through the formatter.
- Added a source contract and pure helper assertions for unsafe-message fallback behavior.

### Standards Checked

- Domain ownership: win/loss read-feedback copy stays in a reports win/loss helper while sharing the common reports unsafe-message guard.
- Route/page -> hook -> server/schema -> query key/cache policy: hook/server/cache behavior remains unchanged and is covered by source assertions.
- Query/cache policy: unchanged; hooks still use centralized win/loss and competitor query keys.
- Tenant isolation: unchanged; no server query or organization scope changed.
- Inventory/finance integrity: no inventory, serial, movement, valuation, or finance writes touched.
- UI state: cached and unavailable win/loss alerts now use operator-safe feedback.
- Error handling: unsafe database/internal read messages fall back to stable win/loss copy.
- Diff reviewability: one helper, one container call site, one contract, one sprint note.

### Gates Run

- Focused win/loss read-feedback and reports query-normalization contracts: `./node_modules/.bin/vitest run tests/unit/reports/win-loss-read-feedback-contract.test.ts tests/unit/reports/query-normalization-wave4e.test.tsx` passed, 2 files / 9 tests.
- Full reports unit suite: `./node_modules/.bin/vitest run tests/unit/reports` passed, 14 files / 36 tests.
- TypeScript: `bun run typecheck` passed.
- ESLint: `bun run lint` passed.
- Targeted source scan for win/loss read formatter usage, removed nullable direct message rendering, normalized win/loss/competitor hooks, and centralized report query keys passed.
- Diff hygiene: `git diff --check` passed.

### Gates Skipped

- Browser QA skipped because this is read-error copy hardening with no layout or interaction change.

### Smells Removed

- Direct nullable `.message` rendering in the win/loss cached/unavailable alert.

### Deferred

- Broader win/loss presenter extraction remains outside this read-feedback slice.
- Pipeline opportunity and win/loss reason management screens remain outside this reports slice.

### Goal Adaptation

- Declined. The standing maintainer process already covers operator-safe errors, workflow-spine contracts, source evidence, and bounded domain slices.

### Residual Risk

- Reports read-feedback consistency is stronger across landing, procurement, job costing, and win/loss; remaining report pages should still be scanned before declaring the domain fully normalized.
- Broader win/loss presenter extraction remains deferred.
