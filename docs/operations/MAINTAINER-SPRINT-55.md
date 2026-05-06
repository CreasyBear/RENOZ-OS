# Operations Maintainer Sprint 55: Preferences Read And Save Feedback Safety

## Status

Closed in commit-ready state.

## Issue 1: Preferences Rendered Defaults When Reads Failed

### Problem

The Preferences settings route used `usePreferences` without normalized read errors. If the preferences read failed, the route could render default controls as though preferences had loaded. Save failures also used generic route-local copy instead of the users domain mutation formatter.

### Workflow Spine

Preferences settings workflow
-> `/settings/preferences`
-> `PreferencesSettings`
-> `usePreferences`, `useSetPreference`
-> `getPreferences`, `setPreference`
-> `userPreferences` schema/database rows
-> `queryKeys.user.preferences(category)`
-> safe read and save feedback.

### Touched Domains

- Settings/preferences.
- Users/preferences.
- User read-error messages.
- User mutation-error formatter.
- Focused user preference feedback tests.
- Operations maintainer closeout docs.

### Business Value Protected

Operators no longer see default preference controls when the read failed. Preference save failures now use safe user-owned copy and still revert optimistic local state.

### Scope Constraints

- Do not change preference categories, control layout, optimistic update shape, server functions, schema/database, query key shape, cache invalidation, or notification preference behavior.
- Keep auto-save success feedback unchanged.
- Limit the slice to read normalization, honest read states, and safe save failure copy.

### Changes

- Added users-owned read-error messages and `formatUserReadError`.
- Normalized `usePreferences` read failures with `normalizeReadQueryError`.
- Fixed `usePreferences(category)` to pass the category filter to `getPreferences`.
- Added a hard unavailable state when preferences fail with no cached data.
- Added a cached-data warning state when preferences fail while cached data is still present.
- Added a general `updatePreference` fallback to the user mutation formatter.
- Routed preference save failures through `formatUserMutationError`.
- Added focused tests for read safety, mutation safety, and the route/hook/server/query-key spine.

### Standards Checked

- Domain ownership: preference read copy lives in `src/lib/users/read-error-messages.ts`; save failure copy lives in the users mutation formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked and preserved for preferences.
- Tenant isolation/data integrity: unchanged. Preference reads and writes remain scoped to `ctx.user.id` and `ctx.organizationId`.
- Transactional inventory and finance integrity: not touched.
- UI states/error handling: strengthened. Failed reads no longer masquerade as defaults, and failed saves use safe formatter-backed copy.
- Reviewability: the diff is limited to preferences route/hook feedback, users feedback helpers, focused tests, and this closeout note.

### Smells Removed

- Fake-default preferences UI on read failure.
- Unnormalized `usePreferences` read errors.
- `usePreferences(category)` query key and server input drift.
- Route-local `toast.error('Failed to save preference')`.
- Missing user-owned read-error helper for preferences.
- Missing focused preference settings feedback contract.

### Deferred

- Preferences page layout and dense settings ergonomics remain separate UI quality work.
- Broader users read-error helper adoption can happen route-by-route as future slices expose gaps.
- Browser QA can be added if a future slice changes preference controls or interaction behavior.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/users/preference-settings-feedback-contract.test.ts tests/unit/users/user-mutation-errors.test.ts` - 2 files, 6 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite and build because this slice did not change preference server behavior, schema/database, query key shape, cache invalidation, control layout, inventory behavior, or financial behavior.
- Skipped: browser QA because this is a narrow read/save feedback contract change with focused tests and no layout or interaction-flow change.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, honest UI states, operator-safe errors, mutation/cache contracts, tenant isolation checks, meaningful tests, and reviewable diffs.

### Residual Risk

Low. Preferences read and save feedback are now safer. Broader preference UI polish remains a separate product-quality slice.
