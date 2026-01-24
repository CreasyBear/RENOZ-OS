# Debt Remediation (Technical + Functional + UX)

## Technical Debt
- Add missing tables: dashboard views, reports tables, scheduled reports.
- Add missing FKs in support and warranty.
- Add org scoping on join-only tables (or enforce via RLS joins).
- Standardize money precision and count types.

## Functional Debt
- Role-driven schema gaps: follow_up_date, payment_reminder_settings.
- Approval workflows need consistent status and audit trail.
- Exceptions/acknowledgements need persistence.

## User Debt
- Missing role dashboards and routes delay adoption.
- Lack of notification preferences persistence.
- Incomplete mobile/offline affordances for field tech.

## Remediation Sequence
1. Fill missing schema (reports/dashboard, role-specific tables).
2. Fix integrity (FKs, constraints, indexes).
3. Normalize types (money/count).
4. Align roles to RLS and preferences.
