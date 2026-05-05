# Reports Maintainer Sprint 13

## Status

Closed after Issue 1.

## Issue 1: Reports Landing Read Feedback Boundary

### Problem

The reports landing page uses normalized read hooks for report favorites and scheduled reports, but the presenter rendered `favoritesError.message` and `scheduledError.message` directly inside cached/unavailable alerts. That left the highest-level reports entry point less protected than the procurement and job costing report pages.

### Workflow Spine

`/reports`
-> `ReportsLandingContent`
-> `useReportFavorites` / `useScheduledReports`
-> report favorites / scheduled reports server functions
-> normalized read query errors
-> cached or unavailable landing alerts
-> operator-safe read feedback.

### Touched Domains

- Reports landing favorites read state.
- Reports landing scheduled reports read state.
- Reports read feedback helpers.

### Business Value Protected

The reports landing page is the operator's entry point for saved and recurring reporting work. If favorites or scheduled reports are temporarily unavailable, the page should stay useful with stable recovery copy instead of exposing internal read failures.

### Scope Constraints

- Did not change report favorite or scheduled report server functions, schemas, query keys, cache timing, list filtering, navigation, or retry behavior.
- Did not alter scheduled-report management screens outside the reports landing page.
- Did not broaden into win/loss or other report pages.

### Changes

- Added landing-specific read-error wrappers for report favorites and scheduled reports.
- Routed favorites cached/unavailable alert copy through the report favorites formatter.
- Routed scheduled reports cached/unavailable alert copy through the scheduled reports formatter.
- Added a source contract and pure helper assertions for unsafe-message fallback behavior.

### Standards Checked

- Domain ownership: landing read-feedback copy stays in reports landing helpers while sharing the common reports unsafe-message guard.
- Route/page -> hook -> server/schema -> query key/cache policy: hook/server/cache behavior remains unchanged and is covered by source assertions.
- Query/cache policy: unchanged; hooks still use centralized report favorite and scheduled report query keys.
- Tenant isolation: unchanged; no server query or organization scope changed.
- Inventory/finance integrity: no inventory, serial, movement, valuation, or finance writes touched.
- UI state: cached and unavailable landing alerts now use operator-safe feedback.
- Error handling: unsafe database/internal read messages fall back to stable landing copy.
- Diff reviewability: one helper, two landing call sites, one contract, one sprint note.

### Gates Run

- Focused reports landing read-feedback and landing degradation contracts: `./node_modules/.bin/vitest run tests/unit/reports/reports-landing-read-feedback-contract.test.ts tests/unit/reports/query-normalization-wave4e.test.tsx` passed, 2 files / 9 tests.
- Full reports unit suite: `./node_modules/.bin/vitest run tests/unit/reports` passed, 13 files / 34 tests.
- TypeScript: `bun run typecheck` passed.
- ESLint: `bun run lint` passed.
- Targeted source scan for landing read formatter usage, removed direct favorites/scheduled message rendering, normalized favorites/scheduled hooks, and centralized report query keys passed.
- Diff hygiene: `git diff --check` passed.

### Gates Skipped

- Browser QA skipped because this is read-error copy hardening with no layout or interaction change.

### Smells Removed

- Direct `favoritesError.message` rendering in the reports landing page.
- Direct `scheduledError.message` rendering in the reports landing page.

### Deferred

- Win/loss cached read feedback still has direct nullable message rendering and remains a follow-up reports slice.
- Scheduled-report management outside the reports landing page remains outside this slice.

### Goal Adaptation

- Declined. The standing maintainer process already covers operator-safe errors, workflow-spine contracts, source evidence, and bounded domain slices.

### Residual Risk

- Win/loss cached read feedback still has direct nullable message rendering and remains a follow-up reports slice.
- Scheduled-report management outside the reports landing page remains outside this slice.
