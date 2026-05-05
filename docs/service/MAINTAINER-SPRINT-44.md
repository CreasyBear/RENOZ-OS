# Maintainer Sprint 44 - Service Activity History Read Feedback

## Slice

Sprint 43 centralized primary service read-state copy, but the service-system detail route still passed secondary activity-history errors directly into the shared activity timeline. The shared activity hook already normalizes read failures, but the service boundary should still sanitize the message before handing it to a generic shared component.

## Workflow Spine Protected

Service system detail route
-> service system detail container
-> `useUnifiedActivities({ entityType: 'service_system' })`
-> activity read hooks/server functions
-> normalized read-query error
-> service-system detail view
-> shared activity timeline.

## Business Value Protected

System history explains ownership, linkage, and service context around installed battery systems. If the history panel is unavailable, the service detail page should show service-specific safe copy without compromising the primary service-system detail read state.

## Change

- Added `SERVICE_READ_MESSAGES.activityHistory`.
- Sanitized `activitiesError` in `ServiceSystemDetailContainer` through `formatServiceReadError` before passing it to `ServiceSystemDetailView`.
- Preserved the shared `UnifiedActivityTimeline` API and behavior.
- Extended service read-error and source-contract coverage for activity-history failures.

## Standards Checked

- Domain ownership: service owns the service-system history fallback copy while shared activity components remain generic.
- Route -> container -> hook -> server flow: the service detail container still uses `useUnifiedActivities`; activity hooks and server functions are unchanged.
- Query/cache policy: no service-system, activity, or warranty query keys/stale times changed.
- Tenant isolation/data integrity: no server function, schema, query predicate, mutation, or transaction changed.
- Inventory/finance integrity: no inventory, valuation, finance, or closeout path changed.
- Serialized lineage: not touched.
- UI states/error handling: service-system activity history errors are safe and service-specific before reaching the shared timeline.
- Reviewability: the diff is limited to one service message constant, one container sanitization line, focused tests, and this closeout note.

## Smells Removed

- Unsanitized secondary activity-history error handoff from service-system detail container to shared timeline.
- Missing service-owned copy for service-system activity-history read failures.

## Deferred

- The shared `UnifiedActivityTimeline` still has generic `Failed to load activities` title/copy behavior for other domains; that should be handled as a shared activity component slice.
- Browser QA was not selected because this was source-covered error-copy wiring with no layout or interaction change.
- Other secondary service detail view panels may need separate review if they start accepting raw query errors.

## Gates

- Focused service activity-history/read-state contracts: `./node_modules/.bin/vitest run tests/unit/service/service-read-error-messages.test.ts tests/unit/service/service-read-state-contract.test.ts tests/unit/service/query-normalization-wave1.test.tsx` passed, 3 files and 6 tests.
- Targeted source scan: confirmed `activityHistory` copy, `activityHistoryError` sanitization, service detail view receives the sanitized error, and the remaining generic activity timeline copy is isolated to the shared activity component.
- Service unit suite: `./node_modules/.bin/vitest run tests/unit/service` passed, 9 files and 19 tests.
- Typecheck: `bun run typecheck` passed.
- Full lint: `bun run lint` passed.
- Diff hygiene: `git diff --check` passed.
- Browser QA, reliability, finance, document, release, deploy, and serialized gates skipped because this slice did not touch those contracts. Serialized gates remain retired as routine evidence and should only reopen for deliberate serialized lineage, inventory identity, or invariant changes.

## Goal Adaptation

Declined. This is a bounded service-domain maintainer slice under the existing honest UI state, operator-safe error, and reviewable-diff standards.

## Residual Risk

The contract verifies service-level sanitization but does not improve the shared activity timeline for every domain. The shared timeline still deserves its own future hardening slice.
