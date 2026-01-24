# Domain: Dashboard — Diff (PRD vs Drizzle)

## PRD vs Drizzle
- PRD defines `targets`, `scheduledReports`, and `dashboardLayouts` tables; no corresponding Drizzle schemas found.
- PRD requires dashboard materialized views (`mv_daily_metrics`, `mv_daily_pipeline`, `mv_daily_warranty`, `mv_daily_jobs`, `mv_current_state`); no Drizzle migrations or schema artifacts located.
- PRD specifies index and check constraints for targets, scheduled reports, and layouts; none are implemented in Drizzle.

## Open Questions
## Resolutions
- Dashboard tables and materialized views are required and must live in Drizzle migrations.
- `scheduledReports` ownership is assigned to the **reports** domain (dashboard references it only).
