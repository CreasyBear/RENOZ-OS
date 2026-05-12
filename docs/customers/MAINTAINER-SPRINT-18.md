# Customers Maintainer Sprint 18: Saved Filter Query-Key Ownership

## Status

Closed in commit-ready state.

## Issue 1: Saved Customer Filters Used a Hook-Local Query Key

### Problem

`useSavedCustomerFilters` owned `SAVED_FILTERS_QUERY_KEY` locally as `['customers', 'saved-filters']`. Reads and save/update/delete invalidations were consistent, but the cache contract lived inside the hook instead of the centralized customer query-key registry.

### Workflow Spine

Customer list route
-> `CustomersListContainer`
-> `SavedFilterPresets`
-> `useSavedCustomerFilters`
-> saved customer filter server functions
-> `userPreferences` rows scoped to current user and customer-filter category
-> `queryKeys.customers.savedFilters()`.

### Touched Domains

- Customer saved-filter hook.
- Central query-key registry.
- Customer saved-filter cache contract test.
- Customer maintainer closeout docs.

### Business Value Protected

Saved filters let RENOZ operators return quickly to useful customer views such as active dealers, commercial accounts, or low-health customers. Centralizing the saved-filter cache key makes future customer list, preference, and refresh work easier to review without hunting through hook-local constants.

### Scope Constraints

- Do not change saved filter server functions, schemas, persistence, user/org scoping, UI behavior, toast copy, mutation response handling, or key shape.
- Do not broaden customer list/detail invalidation.
- Keep this slice limited to query-key ownership.

### Changes

- Added `queryKeys.customers.savedFilters()`.
- Replaced the hook-local `SAVED_FILTERS_QUERY_KEY` read and mutation invalidations with the centralized helper.
- Added a focused contract proving the key shape, hook usage, removal of the local constant, and unchanged user/category server scoping signals.

### Standards Checked

- Domain ownership: saved-filter cache ownership now lives under `queryKeys.customers`.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: checked through customer list, saved-filter hook, saved-filter server functions, `userPreferences`, and the named customer query key.
- Tenant isolation/data integrity: unchanged; server reads/writes remain authenticated and user/category scoped, with organization ID recorded on insert.
- Transactional inventory/finance integrity: not touched.
- Serialized lineage continuity: not touched.
- Honest UI/error handling: saved-filter toast success/error behavior unchanged.
- Query/cache contract: improved and covered by focused contract.
- Reviewability: one query-key helper, one hook replacement, one contract, one closeout note.

### Smells Removed

- Hook-local saved customer filter query-key constant.
- Repeated local cache key usage across read and mutation invalidation paths.

### Deferred

- Broader customer saved-filter read-state UX remains deferred; this slice only centralizes cache ownership.
- Server-side organization predicate review for user preferences remains a separate security/data-model slice if the app wants saved filters to be organization-specific rather than strictly user-specific.
- Browser QA remains deferred because this changes cache-key ownership only.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/customers/saved-filters-cache-contract.test.ts tests/unit/customers/customer-mutation-errors.test.ts tests/unit/customers/customer-list-query-contract.test.tsx`.
- Passed: `./node_modules/.bin/eslint src/hooks/customers/use-saved-filters.ts src/lib/query-keys.ts tests/unit/customers/saved-filters-cache-contract.test.ts --report-unused-disable-directives`.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This sprint continues centralized query-key cleanup under the standing maintainer goal.

### Residual Risk

Low. The query-key shape is preserved exactly while ownership moves to the central customer registry.
