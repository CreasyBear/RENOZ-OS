# Operations Maintainer Sprint 57: Settings Dialog Canonical Route Handoff

## Status

Closed in commit-ready state.

## Issue 1: Settings Dialog Pretended To Save Non-Persisted Panes

### Problem

The global settings dialog rendered hard-coded preferences, notification switches, security controls, target values, and an empty API token list. Several of those controls emitted success toasts even though they did not call the real persistence hooks or server functions. Operators could believe settings were saved when the canonical settings routes owned the actual workflows.

### Workflow Spine

Settings dialog handoff workflow
-> sidebar settings dialog
-> `SettingsDialog`
-> `SettingsPane`
-> `SettingsRouteShortcutPane`
-> canonical routes for `/settings/preferences`, `/settings/security`, `/settings/api-tokens`, `/settings/targets`, and `/profile`
-> route-owned containers/hooks/server functions/query keys
-> persisted settings behavior.

### Touched Domains

- Layout/settings dialog.
- Settings/preferences route handoff.
- Settings/security route handoff.
- Settings/API tokens route handoff.
- Settings/targets route handoff.
- Focused settings dialog route-handoff tests.
- Operations maintainer closeout docs.

### Business Value Protected

Operators no longer get false-positive save feedback from modal controls that are not wired to persistence. The dialog remains useful for navigation while the real settings pages continue to own saved workflows, read states, permissions, mutation feedback, and cache contracts.

### Scope Constraints

- Do not change canonical preferences, security, API token, target, profile, organization, branding, integration, server, schema, query key, or cache behavior.
- Keep organization settings panes live in the dialog because they already use real organization handlers.
- Keep integrations live in the dialog because OAuth callback flow intentionally returns there.
- Limit the slice to removing fake modal controls and delegating to canonical settings routes.

### Changes

- Replaced fake preferences, notifications, security, API token, and KPI target modal panes with `SettingsRouteShortcutPane`.
- Added dialog close behavior when handing off to canonical routes.
- Removed hard-coded preferences/security/target data from the dialog.
- Removed fake notification switch rows and success toasts.
- Removed fake empty API token list rendering from the dialog.
- Added focused source coverage that prevents reintroducing fake modal save toasts, fake API token empty state, or notification switches.

### Standards Checked

- Domain ownership: persisted settings behavior remains owned by canonical route surfaces, not by a modal with hard-coded local values.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: delegated workflows now hand off to existing canonical route spines.
- Tenant isolation/data integrity: unchanged. No server functions, permissions, tenant predicates, database writes, or cache keys changed.
- Transactional inventory and finance integrity: not touched.
- UI states/error handling: strengthened. The dialog no longer presents unsaved local controls as successful persisted changes.
- Reviewability: the diff is isolated to settings dialog routing, one focused test, and this closeout note.

### Smells Removed

- Fake preferences pane with hard-coded defaults.
- Fake notification switches with local-only state and success toasts.
- Fake security controls with success toasts.
- Fake KPI target values with success toasts.
- Fake empty API token list in the dialog.
- Dialog navigation that left the modal open after route handoff.

### Deferred

- The canonical settings routes still need continued route-by-route polish.
- The settings dialog could eventually become a slimmer command launcher or only host workflows that are genuinely modal-safe.
- Browser QA can be added if a later slice changes dialog layout, focus management, or mobile behavior.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/settings/settings-dialog-route-handoff-contract.test.ts tests/unit/settings/settings-read-error-messages.test.ts` - 2 files, 4 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite and build because this slice did not change canonical settings route behavior, server behavior, schema/database, query key shape, cache invalidation, inventory behavior, or financial behavior.
- Skipped: browser QA because this is a narrow source-wired modal delegation change with no intended styling or responsive layout change.

### Goal Adaptation

Declined. The standing maintainer goal already covers honest UI states, domain ownership, operator-safe feedback, mutation/cache contracts, meaningful tests, and reviewable diffs.

### Residual Risk

Medium-low. The dialog is more honest now, but modal/settings IA still deserves a dedicated product design pass to decide which workflows belong inline versus on full pages.
