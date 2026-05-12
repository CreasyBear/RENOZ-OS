# Notifications Maintainer Sprint 2

## Status

Closed in commit-ready state.

## Issue 1: Mark-Read Cache Scope

### Problem

Notifications Sprint 1 deliberately deferred `useMarkNotificationRead` cache scope. The hook still refreshed `queryKeys.notifications.all` after marking one notification as read, even though notification query keys already expose list, unread, and count families. That kept the popover functional, but hid the actual notification surfaces affected by the mutation.

### Workflow Spine

Header notification popover
-> `useMarkNotificationRead`
-> `markNotificationRead` server function
-> organization/user-scoped notification row update
-> notification list, unread, and count cache families
-> honest popover item state and unread badge refresh.

### Touched Domains

- Notification center mark-read hook.
- Notification cache contract tests.
- Notification maintainer evidence.

### Business Value Protected

The notification bell is a high-frequency coordination surface across RENOZ ordering, support, warranty, warehouse, and follow-up work. Mark-read should refresh exactly the notification views operators rely on without using a domain-root cache escape hatch that makes future notification surfaces harder to reason about.

### Scope Constraints

- Do not change notification server functions, schemas, tenant/user ownership predicates, database writes, read-state copy, mutation error formatting, popover UI, or badge presentation.
- Keep this sprint to the mark-read cache contract deferred in Sprint 1.
- Do not add broader notification read hooks or notification-center UI behavior.

### Changes

- Replaced `queryKeys.notifications.all` invalidation after mark-read success with explicit invalidation of notification list, unread, and count families.
- Updated the hook comment to name the concrete refreshed families.
- Added a focused cache contract test proving mark-read refreshes those families without notification-root invalidation.

### Standards Checked

- Domain ownership: notification mutation cache policy remains in `src/hooks/notifications/use-notifications.ts`.
- Route -> container/page -> hook -> server flow: unchanged; the header container still calls the hook, and the hook still calls `markNotificationRead`.
- Query/cache policy: mark-read now names the affected notification cache families instead of invalidating the domain root.
- Tenant isolation/data integrity: no server function, schema, organization predicate, user ownership predicate, or notification write changed.
- Inventory/finance integrity: no inventory, valuation, finance, fulfillment, support, or warranty persistence changed.
- Serialized lineage: not touched; serialized gates remain retired from routine closeout.
- UI states/error handling: notification read-state copy, stale-state behavior, and mutation error formatting are unchanged.
- Reviewability: the diff is limited to the notification hook, focused contract test, and this closeout note.

### Smells Removed

- Domain-root `queryKeys.notifications.all` invalidation from mark-read success.
- Sprint 1's deferred mark-read cache-scope smell.

### Deferred

- Dedicated unread/count read hooks remain deferred because no current surface required them in this slice.
- Browser QA remains deferred because this slice changes cache invalidation wiring only, with source and hook-level coverage.
- Broader cross-domain root-invalidation cleanup remains deferred to separate domain sprints.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/notifications/notification-cache-contract.test.tsx tests/unit/notifications/notification-feedback-contract.test.ts tests/unit/system/query-normalization-wave6b.test.tsx` - 3 files, 10 tests.
- Passed: `./node_modules/.bin/eslint src/hooks/notifications/use-notifications.ts tests/unit/notifications/notification-cache-contract.test.tsx --report-unused-disable-directives`.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.
- Skipped: browser QA, reliability, finance, document, release, deploy, and serialized gates because this slice did not touch those contracts.

### Goal Adaptation

Declined. The standing maintainer goal already covers centralized query keys, safe mutation/cache contracts, honest UI states, meaningful tests, and risk-selected evidence. The local-only posture remains in effect.

### Residual Risk

Low for current notification surfaces. If the app later adds independent unread/count query consumers, this mutation already refreshes those key families, but those future hooks should add their own read-state and cache-contract coverage.
