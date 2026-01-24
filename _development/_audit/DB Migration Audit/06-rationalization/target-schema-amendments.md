# Target Schema Amendments

## Add Tables
- `scheduled_reports` (reports)
- `report_favorites`
- `custom_reports`
- `payment_reminder_settings`
- `exceptions` (optional) or extend `activities` with acknowledgment metadata
- `search_index`
- `recent_items`
- `unified_activities` (table or view)
- `customer_portal_sessions` (magic-link auth)

## Add Columns
- `opportunities.follow_up_date`
- `job_time_entries.category` (work|travel|break)
- `order_line_items.pick_status`, `picked_at`, `picked_by` (if ops flow requires)
- `quotes.approval_status` + approval audit (if no quote_approvals table)
- `organizations.portal_branding` (or settings JSONB) for portal customization

## Add FK Constraints
- `issues.customerId`, `issues.assignedToUserId`, `issues.slaTrackingId`
- `warranty_claims.issueId`
- `return_authorizations.issueId`, `return_authorizations.customerId`, `return_authorizations.orderId`

## Type Normalization
- Convert count fields to integer types.
- Standardize currency columns to numeric(12,2).

## Index Updates
- Composite indexes for follow-up date and due date queues.
- Add descending indexes where dashboards require latest-first.
