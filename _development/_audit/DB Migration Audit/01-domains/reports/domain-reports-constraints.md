# Domain: Reports — Constraints

## Drizzle
- No reports-specific constraints or indexes defined in `drizzle/schema`.

## PRD (expected)
- `scheduled_reports`: organization/user scoping, indexes for `frequency`, `nextRunAt`, and enabled status.
- `report_favorites`: unique per user/report type (if modeled as table).
- `custom_reports`: user/org scoping, saved filters/config JSON validation.
