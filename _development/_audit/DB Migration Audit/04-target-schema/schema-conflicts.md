# Schema Conflicts and Gaps

## Missing Structures
- Dashboard tables and materialized views.
- Reports tables (`scheduled_reports`, `custom_reports`, `report_favorites`).
- Dedicated `audit_logs` table (if required by PRDs).

## Naming / Ownership Conflicts
- `scheduledReports` appears in both dashboard and reports PRDs.
- `business_hours` / `holidays` expected in settings PRD but implemented in support.
- `issue_feedback` in PRD vs `csat_responses` in Drizzle.

## Data Model Divergences
- Financial tables use `orderId` where PRD references `invoiceId`.
- Monetary fields in PRD described as "AUD cents"; Drizzle uses numeric(12,2).
- `statement_history` count fields stored as currency columns.
- `jobs` table represents background jobs; PRD jobs domain represents field work.

## FK / Constraint Gaps
- Missing `warranty_claims.issueId` linkage.
- Missing explicit FK constraints on several support issue fields.
- `campaign_recipients` lacks unique constraints per recipient/campaign.
- Missing check constraints (e.g., `data_exports.entities` non-empty, line total formulas).
