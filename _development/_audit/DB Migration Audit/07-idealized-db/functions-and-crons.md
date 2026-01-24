# Functions and Cron Jobs (Top-Down)

This list captures system functions and scheduled jobs implied by PRDs and role flows.

## Core Server Functions

- **Orders**: create order, update status, generate invoice, calculate totals.
- **Pipeline**: create opportunity, update stage, generate quote, win/loss logging.
- **Customers**: customer 360 retrieval, merge logic, health score calc.
- **Jobs**: start/complete job, log time, upload photos, checklist updates.
- **Support**: create issue, SLA start/pause/resolve, CSAT submission.
- **Finance**: record payment, generate statement, apply credit note.
- **Reports**: run report, export report, schedule report.

## Role-Specific Functions

- **Admin**: exception summary, approval queue actions, team metrics.
- **Sales**: follow-up management, quote wizard timing.
- **Operations**: pick/pack workflows, low stock reorder creation.
- **Finance**: AR aging, reconciliation, payment reminder run.
- **Field Tech**: offline sync, GPS capture, time entry timer.

## Cron Jobs (Scheduled)

- **scheduled_reports**: daily/weekly/monthly delivery.
- **reminder_automation**: payment reminders based on configuration.
- **dashboard_mv_refresh**: refresh `mv_*` views (hourly/daily).
- **sla_breach_checks**: compute SLA breach and trigger alerts.
- **sync_health_checks**: external integrations health ping (Xero, email).
- **search_index_outbox_worker**: process pending index events in batches.

## Outbox Worker Contract (Search Index)

- **Input**: `search_index_outbox` rows in `pending` status, ordered by `createdAt`.
- **Processing**: batch size capped; each row updates `search_index` and marks outbox row.
- **Retries**: increment `retryCount`, move to `failed` after max retries.
- **Idempotency**: upserts by `(organizationId, entityType, entityId)`.
- **Audit**: write a summary activity per batch.

## Notes

- Prefer idempotent cron jobs with lastRunAt tracking.
- All cron jobs should write to `activities` for auditing.
