# Communications Maintainer Sprint 12

## Status

Closed in commit-ready state.

## Issue 1: Suppression List Read-State Copy

### Problem

The suppression list cold-load and cached-degraded alerts still rendered `error.message` directly. The suppression hook already normalizes read-query failures, but the settings UI did not use the communications-owned read-state formatter introduced for preference read states. That left an outbound email safety workflow trusting the error shape at the display boundary.

### Workflow Spine

Communications settings route
-> suppression settings surface
-> `SuppressionListTable`
-> `useSuppressionList`
-> `getSuppressionList` server function
-> suppression list filters/schema
-> tenant-scoped suppression database reads
-> centralized suppression list query key
-> normalized read-query error
-> communications-owned read-state formatter
-> operator-safe unavailable and cached-degraded copy.

### Touched Domains

- Communications suppression list read-state UI.
- Communications read-state copy helper.
- Communications read-state tests.
- Communications query normalization tests.
- Communications maintainer closeout docs.

### Business Value Protected

Suppression list visibility protects outbound email trust for customer, dealer, warranty, support, RMA, and marketing communications. Operators need honest unavailable and cached states without raw backend detail when managing addresses RENOZ should not email.

### Scope Constraints

- Do not change suppression routes, settings layout, filters, pagination, sorting, delete confirmation behavior, mutation failure copy, success copy, hook normalization behavior, server functions, tenant predicates, suppression policy behavior, soft-delete behavior, query keys, cache invalidation, or list rendering.
- Preserve the existing read contract: suppression list remains `always-shaped`.
- Keep this as suppression list read-state copy only.
- Serialized gates remain retired from routine closeout evidence and were not run for this communications slice because it does not touch serial lineage, inventory identity, warranty/RMA continuity, serialized movement, or repair scripts.

### Changes

- Added a suppression list fallback to `COMMUNICATION_READ_MESSAGES`.
- Routed suppression list cold-load alert copy through `formatCommunicationReadError`.
- Routed cached suppression list degraded alert copy through `formatCommunicationReadError`.
- Extended focused read-state source coverage so suppression read states stay behind communications-owned copy.

### Standards Checked

- Domain ownership: suppression list read-state copy now uses the communications read formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only the UI display boundary after the existing suppression list read fails.
- Query/cache policy: unchanged. Suppression list query keys, stale times, cache behavior, and invalidation behavior were not changed.
- Tenant isolation/data integrity: unchanged. Suppression reads still flow through existing server functions and database predicates.
- UI states/error handling: strengthened. Cold-load unavailable and cached-degraded suppression list states no longer render direct `error.message` text.
- Reviewability: the diff is limited to a fallback constant, two alert message call sites, focused tests, and this closeout note.

### Smells Removed

- Direct `<span>{error.message}</span>` rendering for suppression list cold-load failure.
- Direct `<span>{error.message}</span>` rendering for cached suppression list degradation.
- Missing source coverage that suppression read states use communications-owned copy.

### Deferred

- Other communications read-state surfaces still render normalized query messages directly and need separate review: inbox, inbox accounts, scheduled emails, scheduled calls, templates, signatures, analytics, campaign preview, and email preview.
- Suppression filters, sorting, pagination, empty state, delete confirmation, soft-delete behavior, and suppression policy behavior were not changed.
- Browser QA was not run because this is read-state copy behavior with no intended route or visual layout change.

### Gates

- Passed: focused communication read-state tests, `./node_modules/.bin/vitest run tests/unit/communications/communication-read-error-messages.test.ts tests/unit/communications/query-normalization-wave4c.test.tsx` - 2 files, 9 tests.
- Passed: targeted source scan for suppression read formatter wiring, fallback constants, suppression query keys, normalization, and removal of direct suppression `<span>{error.message}</span>` rendering.
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

Low for suppression list read-state copy. Remaining communications read-state risk is broader and should continue as small surface-specific slices rather than a large communications sweep.
