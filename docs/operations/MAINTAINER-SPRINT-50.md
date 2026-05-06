# Operations Maintainer Sprint 50: Settings Read Error Copy Safety

## Status

Closed in commit-ready state.

## Issue 1: Settings Read Failures Could Surface Raw Exception Copy

### Problem

Several settings surfaces still rendered `error.message` directly for read-query and route errors. That could expose database/provider details in operator-facing settings screens and made settings error copy inconsistent with the safer read-path contracts already used in other domains.

### Workflow Spine

Settings read-error workflow
-> settings route/dialog/container
-> settings read hook
-> normalized read-query error
-> `SETTINGS_READ_MESSAGES`
-> `formatSettingsReadError`
-> route error, organization settings, scheduled reports, and win/loss reasons UI states.

### Touched Domains

- Settings.
- Scheduled reports settings.
- Win/loss reason settings.
- Settings dialog and authenticated settings route.
- Settings read-error helper.
- Focused settings contract tests.
- Operations maintainer closeout docs.

### Business Value Protected

Operators now see stable, task-appropriate settings failure copy instead of raw exception details. This keeps configuration workflows calmer and safer when database, provider, or network failures happen.

### Scope Constraints

- Do not change settings route structure, navigation, query keys, cache policy, server functions, database schema, or mutation semantics.
- Keep stale scheduled report data visible when available.
- Keep win/loss reason cache keys and invalidation behavior unchanged.
- Limit the slice to read-error copy safety and a focused contract guard.

### Changes

- Added settings-owned read messages and a `formatSettingsReadError` helper.
- Routed organization settings container, settings dialog, settings route error, scheduled report list states, and Win/Loss Reasons error state through the settings formatter.
- Reused `SETTINGS_READ_MESSAGES.winLossReasons` in the Win/Loss Reasons read hook fallback.
- Added a focused unit contract proving normalized read errors preserve safe copy while arbitrary raw errors fall back to settings-owned messages.
- Added source-level guards preventing the touched settings surfaces from drifting back to direct `error.message` rendering.

### Standards Checked

- Domain ownership: settings read-error copy now lives in `src/lib/settings/read-error-messages.ts`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This slice changes read-error presentation, not server behavior or cache contracts.
- Tenant isolation/data integrity: unchanged. No server functions, database predicates, or write paths changed.
- Transactional inventory and finance integrity: not touched.
- UI states/error handling: strengthened. Full-error and stale-data states use operator-safe copy.
- Reviewability: the diff is limited to settings error presentation, one hook fallback constant, a focused contract test, and this closeout note.

### Smells Removed

- Direct `error.message` rendering in settings route/dialog/container read-error UI.
- Scheduled reports fallback copy split across presenter/container instead of a settings-owned message contract.
- Win/Loss Reasons settings read failures rendering normalized errors directly instead of through a presenter-safe formatter.
- Missing focused settings test coverage for read-error copy safety.

### Deferred

- Broader settings UI consistency, layout density, and form-state cleanup remain separate product-quality slices.
- Mutation error copy in settings should be reviewed by workflow in a later sprint; this slice only covered read-path failures.
- Browser QA can be added when a future slice changes settings layout or interaction behavior.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/settings/settings-read-error-messages.test.ts` - 1 file, 2 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite and build because this slice did not change shared runtime plumbing, routing behavior, server functions, schema/database, query keys, mutation behavior, inventory behavior, or financial behavior.
- Skipped: browser QA because this is a narrow read-error copy safety change with focused source contracts and no visual layout or interaction change.

### Goal Adaptation

Accepted. Routine closeouts now focus only on evidence relevant to the current slice; completed background infrastructure gates are not listed unless the slice directly touches that workflow.

### Residual Risk

Low. Settings mutation feedback and broader settings UX polish still need separate workflow-driven review, but the touched read-error states no longer surface arbitrary raw exception copy.
