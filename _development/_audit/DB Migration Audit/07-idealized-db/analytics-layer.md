# Analytics Layer (Canonical)

## Purpose
Provide consistent, fast, org‑scoped metrics for dashboards and reports without
inconsistent per‑feature calculations.

## Canonical Sources
- **Transactional tables**: orders, order_line_items, payments, issues, jobs, inventory.
- **Event tables**: activities, unified_activities.

## Materialized Views (Required)
- `mv_daily_metrics`: revenue, orders, quotes, issues, jobs by day.
- `mv_daily_pipeline`: pipeline value by stage and day.
- `mv_daily_warranty`: claims, status counts by day.
- `mv_daily_jobs`: completion and SLA by day.
- `mv_current_state`: latest point‑in‑time snapshot for dashboards.

## Refresh Strategy
- Operational dashboards: hourly refresh.
- Executive/weekly dashboards: daily refresh.
- Force refresh on demand for admin reports.

## Ownership
- Views owned by **Reports** domain; Dashboard consumes them.

## Guardrails
- All views include `organizationId` and date bucketing.
- Avoid complex joins at query time; pre‑aggregate.
- Document each metric definition once (metric catalog).

## Future‑Proofing
- If volume grows, move to incremental refresh or summary tables.
- Keep raw transactional truth intact; never write back from analytics.
