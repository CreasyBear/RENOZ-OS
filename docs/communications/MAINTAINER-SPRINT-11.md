# Communications Maintainer Sprint 11

## Status

Closed in commit-ready state.

## Issue 1: Communication Preference Read-State Copy

### Problem

Communication preference and preference-history alerts displayed `error.message` directly in cold-load and cached-degraded states. The hooks already normalize read-query failures, but the UI boundary still trusted the error shape instead of using a communications-owned read-state formatter. That made a consent and audit workflow harder to reason about and left room for raw backend or database text if an unnormalized error reached the component.

### Workflow Spine

Customer/contact communications surface
-> `CommunicationPreferences` and `PreferenceHistory`
-> `useContactPreferences` and `usePreferenceHistory`
-> `getContactPreferences` and `getPreferenceHistory` server functions
-> `getPreferencesSchema` and `getPreferenceHistorySchema`
-> tenant-scoped `contacts` and `customerActivities` reads
-> contact preference and preference history query keys
-> normalized read-query error
-> communications-owned read-state formatter
-> operator-safe unavailable and cached-degraded copy.

### Touched Domains

- Communications preference read-state UI.
- Communications read-state copy helper.
- Communications read-state tests.
- Communications query normalization tests.
- Communications maintainer closeout docs.

### Business Value Protected

Communication preferences protect consent, customer contact accuracy, and audit history. Operators need preference and history read failures to be honest without leaking backend detail, so they can distinguish unavailable data from actual opt-in state while managing customer communications.

### Scope Constraints

- Do not change preference routes, customer/contact surfaces, preference layout, confirmation dialog behavior, mutation failure copy, form schema, success copy, hook normalization behavior, server functions, tenant predicates, transaction boundaries, database reads/writes, query keys, cache invalidation, or preference-history rendering.
- Preserve the existing read contracts: contact preference remains `detail-not-found`; preference history remains `always-shaped`.
- Keep this as preference and preference-history read-state copy only.
- Serialized gates remain retired from routine closeout evidence and were not run for this communications slice because it does not touch serial lineage, inventory identity, warranty/RMA continuity, serialized movement, or repair scripts.

### Changes

- Added `formatCommunicationReadError` and communications read fallback constants.
- Routed preference cold-load and cached-degraded alert copy through the communications read formatter.
- Routed preference-history cold-load and cached-degraded alert copy through the same formatter.
- Added focused coverage that normalized read-query copy is preserved while raw unnormalized errors fall back to safe copy.
- Added source coverage that preference read states stay behind communications-owned copy instead of direct `error.message` rendering.

### Standards Checked

- Domain ownership: preference read-state copy now uses a communications-owned helper.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes the UI display boundary after the existing reads fail.
- Query/cache policy: unchanged. Contact preference and preference history query keys, stale times, cache behavior, and invalidation behavior were not changed.
- Tenant isolation/data integrity: unchanged. Preference reads still flow through server functions that use `withAuth` and `organizationId` predicates.
- UI states/error handling: strengthened. Cold-load unavailable and cached-degraded states now reject raw unnormalized error messages.
- Reviewability: the diff is limited to one read formatter, four alert message call sites, focused tests, and this closeout note.

### Smells Removed

- Direct `<span>{error.message}</span>` rendering for preference cold-load failure.
- Direct `<span>{error.message}</span>` rendering for cached preference degradation.
- Direct `<span>{error.message}</span>` rendering for preference-history cold-load failure.
- Direct `<span>{error.message}</span>` rendering for cached preference-history degradation.
- Missing communications-owned read-state copy helper for preference read boundaries.

### Deferred

- Other communications read-state surfaces still render normalized query messages directly and need separate review: inbox, inbox accounts, scheduled emails, scheduled calls, suppression list, templates, signatures, analytics, campaign preview, and email preview.
- Preference layout, empty history presentation, audit-history row rendering, and retry interaction behavior were not changed.
- Browser QA was not run because this is read-state copy behavior with no intended route or visual layout change.

### Gates

- Passed: focused communication read-state tests, `./node_modules/.bin/vitest run tests/unit/communications/communication-read-error-messages.test.ts tests/unit/communications/query-normalization-wave4c.test.tsx` - 2 files, 9 tests.
- Passed: targeted source scan for preference read formatter wiring, fallback constants, query keys, and removal of direct preference `<span>{error.message}</span>` rendering.
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

Low for communication preference and preference-history read-state copy. Remaining communications read-state risk is broader and should continue as small surface-specific slices rather than a large communications sweep.
