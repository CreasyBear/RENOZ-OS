# Customers Maintainer Sprint 5

## Status

Closed in commit-ready state.

## Issue 1: Saved Filter Mutation Failure Copy

### Problem

The live customer list uses `useSavedCustomerFilters` through `CustomersListContainer`, but save, update, and delete failures still toasted raw `error.message`. That left an operator-facing list workflow able to expose database, auth, transport, or infrastructure wording when managing saved customer filters.

### Workflow Spine

Customer list route
-> `customers-page`
-> `CustomersListContainer`
-> `SavedFilterPresets`
-> `useSavedCustomerFilters`
-> saved customer filter server functions
-> `userPreferences` persistence
-> saved filters query invalidation
-> operator-safe toast feedback.

### Touched Domains

- Customer mutation feedback helper.
- Saved customer filter hook.
- Customer mutation feedback tests.
- Customer maintainer closeout docs.

### Business Value Protected

Saved customer filters help operators quickly return to useful account views such as active dealers, suspended customers, or low-health commercial accounts. When saving or managing those views fails, the app should give clear recovery copy without leaking implementation details.

### Scope Constraints

- Do not change saved filter server functions, schemas, user preference persistence, auth/user/org scoping, query key shape, invalidation behavior, saved filter UI behavior, customer list filters, pagination, sorting, or customer data reads.
- Preserve safe saved-filter conflict copy where it is useful to the operator.
- Keep the formatter in the customer hook boundary; do not add a new cross-domain error system for this small slice.
- Do not run serialized gates because this slice does not touch serial lineage, inventory identity, warranty/RMA continuity, or repair scripts.

### Changes

- Extended `formatCustomerMutationError` with optional code-message overrides.
- Added `formatCustomerSavedFilterMutationError` with saved-filter-specific fallbacks and code copy.
- Routed saved filter save, update, and delete mutation errors through the formatter.
- Added focused coverage for saved-filter not-found copy, unsafe database suppression, safe conflict copy, and source wiring.

### Standards Checked

- Domain ownership: saved filter mutation feedback now lives beside other customer mutation feedback instead of local raw-message branches.
- Route -> container/page -> hook -> server -> schema/database -> query key/cache policy: preserved. This sprint changes client-side failure copy after existing saved filter mutations fail.
- Query/cache policy: `SAVED_FILTERS_QUERY_KEY`, invalidation, and mutation success behavior are unchanged.
- Tenant isolation/data integrity: no server function, auth boundary, organization/user predicate, database write, inventory transaction, finance persistence, or serialized lineage behavior changed.
- UI states/error handling: unsafe raw saved filter mutation messages are suppressed; known codes and safe conflict messages remain available.
- Reviewability: the diff is limited to one formatter extension, one hook import/catch rewrite, focused tests, and this closeout note.

### Smells Removed

- Raw saved filter save `error.message` toast.
- Raw saved filter update `error.message` toast.
- Raw saved filter delete `error.message` toast.
- Generic saved filter fallback strings scattered in mutation handlers.
- Missing regression coverage for saved customer filter mutation feedback.

### Deferred

- Customer hierarchy actions, action plans, Xero contact actions, communications, duplicate dismissal, rollback, and export feedback still have separate operator-feedback debt.
- Saved filter read-state handling was not changed; this slice only covers mutation failures.
- Browser QA remains deferred because no route layout or interaction structure changed.

### Gates

- Passed: focused customer mutation feedback test, `./node_modules/.bin/vitest run tests/unit/customers/customer-mutation-errors.test.ts` - 1 file, 4 tests.
- Passed: broader customer suite, `./node_modules/.bin/vitest run tests/unit/customers` - 14 files, 43 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Passed: targeted source scan for saved filter formatter wiring and removed raw saved filter failure fallbacks.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is failure-copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, finance persistence, document generation, release packaging, or repair scripts.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, mutation/cache contracts, meaningful tests, and risk-selected evidence.

### Residual Risk

Low for saved customer filter mutation feedback. The next customer slice should target another supported workflow with raw feedback, likely hierarchy actions, action plans, Xero contact actions, duplicate dismissal, rollback, or export feedback.
