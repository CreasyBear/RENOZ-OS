# Operations Maintainer Sprint 59: Prune Legacy Settings Schema Surface

## Status

Closed in commit-ready state.

## Issue 1: Deleted Settings Presenters Left Unused Schema Types

### Problem

After the extended settings presenter module was deleted, its supporting settings data interfaces remained in the settings schema package and schemas barrel. Those types were no longer consumed by live routes, hooks, or components, but still advertised stale settings concepts as public schema surface.

### Workflow Spine

Settings schema ownership workflow
-> `src/lib/schemas/index.ts`
-> `src/lib/schemas/settings/settings.ts`
-> live settings schema exports
-> route-owned settings presenters/hooks/server functions
-> persisted settings behavior.

### Touched Domains

- Settings schema package.
- Schemas public barrel.
- Focused settings barrel tests.
- Operations maintainer closeout docs.

### Business Value Protected

The settings domain now exposes fewer stale contracts. Future work is less likely to import old modal-era types for preferences, security, targets, API tokens, categories, or win/loss reasons when those workflows already have route-owned models.

### Scope Constraints

- Do not change runtime settings schemas, organization settings types, route behavior, hooks, server functions, database shape, query keys, cache invalidation, or UI behavior.
- Keep live settings schema exports intact.
- Limit the slice to unused legacy type definitions and public re-exports.

### Changes

- Removed unused legacy settings data interfaces from `src/lib/schemas/settings/settings.ts`.
- Removed those legacy type names from the schemas barrel export list.
- Expanded the settings barrel contract test to keep the deleted component module and its stale schema support types out of public settings surface.

### Standards Checked

- Domain ownership: public schema exports now align more closely with live route-owned settings workflows.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged for live settings workflows.
- Tenant isolation/data integrity: unchanged. No server functions, permissions, tenant predicates, database writes, or cache keys changed.
- Transactional inventory and finance integrity: not touched.
- UI states/error handling: unchanged.
- Reviewability: the diff is limited to deleting unused type surface, updating a focused test, and this closeout note.

### Smells Removed

- Unused `PreferencesSettingsData`.
- Unused `EmailSettingsData`.
- Unused `SecuritySettingsData`.
- Unused `ApiToken` settings schema interface.
- Unused `SettingsCategory`.
- Unused `TargetsSettingsData`.
- Unused `SettingsWinLossReason`.
- Schemas barrel exports for those stale types.

### Deferred

- Other broad schema barrel cleanup should happen only when backed by usage scans and typecheck.
- Settings route polish remains separate domain work.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/settings/settings-domain-barrel-contract.test.ts tests/unit/settings/settings-dialog-route-handoff-contract.test.ts` - 2 files, 3 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite and build because this slice removed unused type-only schema surface without changing runtime schemas, route behavior, server behavior, schema/database, query key shape, cache invalidation, inventory behavior, or financial behavior.
- Skipped: browser QA because no runtime UI behavior changed.

### Goal Adaptation

Declined. The standing maintainer goal already covers modularity, domain ownership, reviewable diffs, meaningful tests, and leaving the repo easier to reason about.

### Residual Risk

Low. Typecheck found no hidden consumers. The main residual risk is external code importing these app-internal schema barrel types, which is outside the current repo evidence.
