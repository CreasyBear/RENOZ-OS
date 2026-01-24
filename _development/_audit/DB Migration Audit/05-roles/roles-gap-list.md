# Role PRDs — Schema Gap List

This list captures schema-level gaps implied by role PRDs.

## Admin/Manager
- **scheduled_reports**: explicitly required in ROLE-ADMIN-008a; missing in Drizzle.
- **approval queue support**: approvals for quotes and POs require:
  - Quote approvals (pipeline) not represented in schema.
  - PO approvals exist in suppliers domain; ensure approvals index/sorting by submittedAt.
- **exception tracking**: no schema to store exception acknowledgements.
  - Consider `exceptions` table or `activities` entries with acknowledgment state.

## Sales
- **opportunities.followUpDate**: required by ROLE-SALES-005a; not in Drizzle.
- **quote templates**: role references template library; could map to `order_templates` or add `quote_templates` if not shared.

## Operations
- **batch pick / pick queue**: requires operational status fields on orders and line items (e.g., `pickStatus`, `pickedAt`, `pickedBy`).
- **low-stock alert acknowledgements**: alerts exist but no acknowledge/seen tracking.

## Finance
- **payment reminder settings**: ROLE-FIN-007a expects `payment_reminder_settings` table; not in Drizzle.
- **invoice vs order distinction**: role assumes invoices; current schema treats orders as invoice source.
- **reminder history** exists; lacks direct linkage to scheduled config.

## Field Technician
- **time tracking**: job time entries exist, but role expects:
  - break/travel categorization in schema.
  - daily summary requires query support.
- **checklists**: job_checklists exist, but role expects large mobile checklist workflow (no schema gaps).
- **GPS**: start/complete location fields already present in Drizzle; role requires ensuring they are populated.
- **offline sync**: requires versioning on job/task/checklist entities (some tables have `version`, others do not).

## Cross-Role Common Gaps
- **role-based routing / permissions**: schema lacks role/permission mapping beyond `users.role`.
- **notification preferences**: role PRDs define notification defaults; storage model for per-user preferences not fully specified.
