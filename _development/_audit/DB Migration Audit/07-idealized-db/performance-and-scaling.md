# Performance and Scaling (Top-Down)

## Index Principles
- Always include `organizationId` in list query indexes.
- Composite indexes for status/date queues.
- DESC indexes for dashboard metrics lists.

## Partitioning
- Partition append-only tables by month:
  - `activities`, `email_history`, `sla_events`, `campaign_recipients`.

## Materialized Views
- Implement `mv_*` for dashboard KPIs.
- Refresh cadence: hourly for operational, daily for analytics.

## Query Hygiene
- Avoid JSONB scans without GIN indexes.
- Use cursor pagination for large lists.
