# Decisions (Cross-Domain + Role Alignment)

## Ownership
- **Scheduled reports**: owned by Reports domain, referenced by Dashboard.
- **SLA infrastructure**: shared platform component (separate `sla` domain or shared support infra).
- **Business hours/holidays**: owned by Settings, referenced by SLA.

## Audit Strategy
- **Activities** remains the canonical audit log.
- **audit_logs** table is optional; only add if PRD requires strict schema separation.

## Financial Model
- **Orders vs invoices**: treat `orders` as the invoice-of-record unless a dedicated `invoices` table is introduced.
- **Money precision**: numeric(12,2) across financial tables (no cents integers).

## Role PRD Impacts
- **Follow-up date**: add `opportunities.follow_up_date`.
- **Payment reminder settings**: add `payment_reminder_settings`.
- **Approval workflows**: define either `quote_approvals` table or `quotes` status with approval log.
