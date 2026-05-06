# Communications Maintainer Sprint 13

## Status

Closed in commit-ready state.

## Issue 1: Inbox Account Read-State Copy

### Problem

Inbox email account settings still rendered raw `error.message` in cold-load and cached-degraded states. The hook already normalizes read-query failures through the inbox account query key, but the UI boundary trusted the error shape and the system degraded-read test imported unrelated communications modules through the formatter barrel. That left email account setup and sync visibility less isolated than it should be.

### Workflow Spine

Communications inbox account settings route
-> `InboxEmailAccountsSettings`
-> `useInboxEmailAccounts`
-> `listInboxEmailAccounts` server function
-> inbox account schemas/database records
-> centralized inbox email accounts query key
-> normalized read-query error
-> communications-owned read-state formatter
-> operator-safe unavailable and cached-degraded copy.

### Touched Domains

- Communications inbox account settings read-state UI.
- Communications read-state copy helper.
- Communications read-state tests.
- System degraded-read contract test for inbox accounts.
- Communications maintainer closeout docs.

### Business Value Protected

Inbox email accounts keep customer, dealer, warranty, support, and sales communication history connected to RENOZ workflows. Operators need to know when account data is unavailable or stale without seeing provider, OAuth, server, or database details, and without losing visibility into already-loaded connected accounts.

### Scope Constraints

- Do not change inbox account routes, connect buttons, OAuth flow, sync behavior, delete confirmation, mutation failure copy, success copy, polling interval behavior, hook normalization behavior, server functions, tenant predicates, query keys, cache invalidation, account list rendering, or provider status derivation.
- Preserve the existing read contract: inbox email accounts remain `always-shaped`.
- Keep this as inbox account read-state copy and test isolation only.
- Serialized gates remain retired from routine closeout evidence and were not run for this communications slice because it does not touch serial lineage, inventory identity, warranty/RMA continuity, serialized movement, or repair scripts.

### Changes

- Added inbox account cold-load and cached-degraded fallbacks to `COMMUNICATION_READ_MESSAGES`.
- Routed inbox account cold-load copy through `formatCommunicationReadError`.
- Routed cached inbox account degraded copy through `formatCommunicationReadError`.
- Extended focused read-state source coverage so inbox account read states stay behind communications-owned copy.
- Isolated the system degraded-read test from the full communications hook barrel by mocking only the mutation formatter it needs.
- Updated the degraded-read test to expect the safe cached-state fallback when a raw unnormalized error is supplied.

### Standards Checked

- Domain ownership: inbox account read-state copy now uses the communications read formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only the UI display boundary after the existing inbox account read fails.
- Query/cache policy: unchanged. Inbox account query keys, stale times, refetch interval behavior, mutation invalidation behavior, and inbox invalidation behavior were not changed.
- Tenant isolation/data integrity: unchanged. Inbox account reads still flow through existing server functions and tenant predicates.
- UI states/error handling: strengthened. Cold-load unavailable and cached-degraded inbox account states no longer render direct raw error text, and cached accounts stay visible during degraded refresh.
- Reviewability: the diff is limited to fallback constants, two read-state call sites, focused tests, a test isolation mock, and this closeout note.

### Smells Removed

- Direct `Failed to load email accounts: {error.message}` rendering for inbox account cold-load failure.
- Direct `error.message || ...` rendering for cached inbox account degradation.
- System degraded-read test dependency on the full communications hook barrel for one formatter.
- Missing source coverage that inbox account read states use communications-owned copy.

### Deferred

- Other communications read-state surfaces still render normalized query messages directly and need separate review: inbox list/detail, scheduled emails, scheduled calls, templates, signatures, analytics, campaign preview, email history, and email preview.
- Inbox account OAuth, sync, delete, polling, provider status, empty state, and account row rendering were not changed.
- Browser QA was not run because this is read-state copy behavior with no intended route or visual layout change.

### Gates

- Passed: focused communication/system read-state tests, `./node_modules/.bin/vitest run tests/unit/communications/communication-read-error-messages.test.ts tests/unit/system/query-normalization-wave6b.test.tsx` - 2 files, 8 tests.
- Passed: targeted source scan for inbox account read formatter wiring, fallback constants, inbox account query keys, normalization, and removed raw inbox account read failure paths.
- Passed: broader communications suite, `./node_modules/.bin/vitest run tests/unit/communications` - 13 files, 59 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is read-state copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, and deploy gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, or production release paths.
- Retired for routine closeout: serialized gate evidence. It remains relevant only for direct serial lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair-script work.

### Goal Adaptation

Declined. The standing maintainer goal already covers honest UI states, operator-safe errors, query/cache contracts, tenant isolation, meaningful tests, and risk-selected evidence.

### Residual Risk

Low for inbox account read-state copy. Remaining communications read-state risk is broader and should continue as small surface-specific slices rather than a large communications sweep.
