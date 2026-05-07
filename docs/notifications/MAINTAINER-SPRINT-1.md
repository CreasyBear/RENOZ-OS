# Notifications Maintainer Sprint 1

## Slice

Notification center read and mark-read feedback should be operator-safe. The header popover is a high-frequency workflow surface; stale notification reads should be honest, and mutation failures should not leak backend, database, or tenancy internals.

## Business Value

RENOZ operators need the bell popover to remain trustworthy while moving through orders, support, warranties, warehouse work, and follow-up tasks. When notifications degrade, the UI should explain whether it is showing recent data or needs a refresh. When mark-read fails, the toast should give recovery copy without exposing implementation details.

## Workflow Spine

```text
header notification trigger
  -> NotificationCenterContainer
  -> useNotifications / useMarkNotificationRead
  -> listNotifications / markNotificationRead server functions
  -> notifications table scoped by organizationId and userId
  -> queryKeys.notifications list/all invalidation
  -> popover degraded/read state and mark-read toast
```

## Pattern Map

- Route/page: shared shell/header notification center.
- Container: `src/components/domain/notifications/notification-center-container.tsx`.
- UI: `src/components/domain/notifications/notification-center-popover.tsx`.
- Hooks: `src/hooks/notifications/use-notifications.ts`.
- Server functions: `src/server/functions/notifications/list-notifications.ts`, `src/server/functions/notifications/mark-read.ts`.
- Schemas: `src/lib/schemas/notifications/notification.ts`.
- Query keys: `queryKeys.notifications.list`, `queryKeys.notifications.all`.

## Triage Findings

- The popover read warning used raw `error.message` as the display source.
- Mark-read mutation toasts used raw `error.message` before fallback copy.
- The stale-notifications path already had better cached-data copy, but normalized read errors prevented that copy from being reliably used.
- Tenant scope and query keys were already present in the server/read/write path.

## Implementation

- Added a notification read feedback helper that distinguishes unavailable empty reads from degraded cached reads.
- Added a notification mutation formatter for mark-read failures with safe code-specific copy.
- Routed the popover and mark-read toast through those helpers.
- Added a focused notification feedback contract test.

## Closeout

Touched domains: notifications.

Workflow protected: header bell popover read state, stale notification display, and mark-read mutation feedback.

Business value: operators get honest notification availability states without backend leakage while moving across RENOZ workflows.

Standards checked: route/container/hook/server/schema/query key flow, centralized query keys, tenant/user scope in server functions, safe mutation/cache contract, honest UI states, operator-safe error handling, meaningful tests, reviewable diff.

Smells removed: raw notification read `error.message` display and raw mark-read mutation toast display.

Deferred: mark-read still invalidates all notification queries on success; that is acceptable for this tiny domain but could later narrow to list/count if notification usage grows.

Verification: `bun run test:vitest tests/unit/notifications/notification-feedback-contract.test.ts tests/unit/system/query-normalization-wave6b.test.tsx`, `bun run typecheck`, `bun run lint`, targeted notification raw-message scan, `git diff --check`.

Goal adaptation: none; the current maintainer process already treats the old serialized gate pack as closed work.

Residual risk: no browser QA yet; this slice is a feedback contract change rather than a layout rewrite.
