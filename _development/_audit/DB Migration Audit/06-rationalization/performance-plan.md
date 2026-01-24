# Performance Plan

## Index Strategy
- Composite indexes: `(organizationId, status, createdAt)` for list views.
- Date-ordered lists should include DESC indexes if required by PRD.
- Polymorphic tables: `(organizationId, entityType, createdAt)` indexes.
- SLA: `(organizationId, responseDueAt)` and `(organizationId, resolutionDueAt)`.

## Partitioning Candidates
- `activities` by month or org+month when volume grows.
- `email_history`, `campaign_recipients` by month.
- `sla_events` by month.

## Materialized Views
- Implement PRD-required `mv_*` views for dashboard metrics.
- Schedule refresh cadence (hourly/daily) via cron.

## Query Guardrails
- Enforce `organizationId` filter in all list queries.
- Avoid wide JSONB filters without GIN indexes.
