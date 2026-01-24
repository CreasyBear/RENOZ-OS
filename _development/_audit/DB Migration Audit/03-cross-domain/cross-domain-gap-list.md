# Cross-Domain Gap List

This list aggregates gaps and inconsistencies that impact multiple domains or shared entities.

## Missing or Divergent Shared Tables
- `dashboard` PRD tables and materialized views are missing from Drizzle (`targets`, `scheduledReports`, `dashboardLayouts`, `mv_*`).
- `reports` PRD tables are missing from Drizzle (`scheduled_reports`, `report_favorites`, `custom_reports`).
- `audit_logs` table appears in PRDs (users/settings) but has no dedicated Drizzle schema; only `activities` exists. **Decision**: add `audit_logs` table.
- `business_hours`/`holidays` in settings PRD exist in Drizzle under support as `business_hours_config` and `organization_holidays` (naming/ownership mismatch). **Decision**: canonicalize under settings.

## Cross-Domain FK or Modeling Misalignments
- `warranty_claims` lacks `issueId` linkage required by Support/Warranty workflows.
- `issues` uses `slaTrackingId` but does not declare explicit FK constraints for `customerId`, `assignedToUserId`, `slaTrackingId`.
- Financial records consistently use `orderId` where PRD references `invoiceId`; needs a shared invoice model decision.
- `statement_history` uses numeric currency columns for count fields (`invoiceCount`, `paymentCount`, `creditNoteCount`) which should be integer counts.
- `supplier` performance formula for `overallRating` not enforced; PRD expects a derived rule.

## Schema Ownership Conflicts
- `scheduledReports` defined in both dashboard PRD and reports PRD (domain ownership decision needed). **Decision**: reports owns.
- `report_favorites` can be either table or `user_preferences` JSON per PRD; decision needed. **Decision**: dedicated table.
- SLA-related tables live under support in Drizzle but serve warranty/jobs; ownership and naming should be clarified.

## Enum and Precision Mismatches
- Financial monetary amounts defined as "AUD cents" in PRD; Drizzle uses numeric(12,2) via `currencyColumn`.
- Job materials quantities and unit cost precision differ from PRD.

## Consistency/Integrity Gaps
- Missing explicit DESC ordering in indexes where PRD expects descending (applies across multiple domains).
- Several PRD-required constraints are not enforced (e.g., `data_exports.entities` non-empty array, `purchase_order_items.lineTotal = quantity * unitPrice`).
