# Domain: Dashboard — Constraints

## Drizzle
- No dashboard-specific constraints or indexes defined in `drizzle/schema`.

## PRD (expected)
- `targets`: indexes on `orgId`, `metric`, `period`, check `targetValue >= 0`.
- `scheduledReports`: indexes on `orgId`, `frequency`, `isActive`, `nextRunAt`, checks on non-empty arrays.
- `dashboardLayouts`: indexes on `userId`, `role`, check `jsonb_typeof(layout) = 'object'`.
