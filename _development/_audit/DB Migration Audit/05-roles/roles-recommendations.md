# Role PRDs — Recommendations

## 1) Align Role Needs with Schema Roadmap
- **Scheduled reports**: implement `scheduled_reports` (shared by admin + reports PRD).
- **Follow-up tracking**: add `opportunities.followUpDate` and index `(organizationId, followUpDate)`.
- **Payment reminders**: add `payment_reminder_settings` table and link to `reminder_templates`.

## 2) Define Role Permissions Model
- Keep `users.role` for coarse routing.
- Add optional `role_permissions` and `role_permission_assignments` if granular access is required.
- Map role PRD actions to RLS policies (read vs write per domain).

## 3) Normalize Approval Workflows
- Decide if quote approvals should be a table (`quote_approvals`) or use `activities` + status fields on `quotes`.
- Ensure PO approvals use consistent status enums and timestamps for queue sorting.

## 4) Support Ops and Field Tech Workflows
- Consider order-level fulfillment fields for pick/pack/ship stages if not already present.
- Add time entry category enum (`work`, `travel`, `break`) if required by field tech workflow.
- Ensure offline sync uses `version` columns on all syncable tables.

## 5) Notifications & Preferences
- Use `user_preferences` (or new `notification_preferences`) to persist role defaults.
- Persist per-notification channel preferences and last sent timestamps.

## 6) Role PRDs + RLS Cross-Check
- For admin dashboards, allow aggregated read access across domains but enforce org scope.
- For finance, ensure access to financial + orders + customer tables.
- For operations, ensure access to inventory + orders + suppliers tables.
- For field tech, ensure access only to assigned jobs and related customer info.
