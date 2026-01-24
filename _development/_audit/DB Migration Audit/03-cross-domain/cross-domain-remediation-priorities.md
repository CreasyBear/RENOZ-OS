# Cross-Domain Remediation Priorities

Prioritized sequence to resolve cross-domain gaps and unblock future migrations.

## P0 — Critical Schema Gaps (Blockers)
1. **Create missing Dashboard and Reports schemas**
   - Add tables and MVs for dashboard PRD (`targets`, `scheduledReports`, `dashboardLayouts`, `mv_*`).
   - Add reports tables (`scheduled_reports`, `report_favorites`, `custom_reports`).
2. **Audit logs strategy**
   - Decision: add dedicated `audit_logs` table; keep `activities` for timeline.
   - Align settings/users/support PRD expectations accordingly.
3. **Business hours and holidays ownership**
   - Decision: canonicalize under settings; SLA references settings for business hours.

## P1 — Cross-Domain Integrity & FK Enforcement
1. **Warranty ↔ Support linkage**
   - Add `issueId` to `warranty_claims` or document alternative linkage.
2. **Explicit FK constraints**
   - `issues.customerId`, `issues.assignedToUserId`, `issues.slaTrackingId`.
   - `email_history.campaignId/templateId` (if desired by PRD).
3. **Invoice vs order model**
   - Decide if `orders` are the invoice-of-record or introduce `invoices`.
   - Update financial tables to match.

## P2 — Data Type and Constraint Normalization
1. **Fix numeric precision mismatches**
   - Standardize `currencyColumn` and `quantityColumn` vs PRD decimal specs.
2. **Count fields as integers**
   - Convert statement history count columns to integers.
3. **Enforce PRD constraints**
   - `data_exports.entities` non-empty.
   - `purchase_order_items.lineTotal` formula.
   - Supplier overall rating formula (if enforced).

## P3 — Index and Query Semantics
1. **Index sort order**
   - Add DESC ordering where PRD expects it (analytics-heavy tables).
2. **Uniqueness enforcement**
   - Review PRD-intended uniqueness (e.g., campaign recipients).

## P4 — Naming/Documentation Alignment
1. **Document schema ownership**
   - Decision: `scheduledReports` owned by reports domain.
2. **PRD nomenclature mapping**
   - `issue_feedback` ↔ `csat_responses`, `jobs` table naming collision.
