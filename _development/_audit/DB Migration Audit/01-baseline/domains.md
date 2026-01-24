# Domain Inventory (renoz-v3)

## Core Business Domains
- Users & Organizations: Multi-tenant identity, roles, access, and org-level settings.
- Customers: CRM core with contacts, addresses, tags, health metrics, and activities.
- Orders: Order lifecycle, line items, shipments, amendments, and templates.
- Pipeline: Opportunities, activities, quote versions, and win/loss reasons.
- Products: Catalog, pricing, attributes, relations, and warranty linkages.
- Inventory: Stock, movements, locations, cost layers, counts, forecasts, alerts.
- Jobs: Installations, assignments, time tracking, checklists, job artifacts.
- Support/Issues: Issue tracking, SLA, escalation, templates, KB, RMA.
- Warranty: Policies, claims, extensions, and SLA integration.
- Suppliers: Supplier management, POs, approvals, receipts, costs.
- Financial: Invoicing, payment schedules, reminders, revenue recognition.

## Cross-Cutting Domains
- Activities/Audit: Append-only activity log + immutable audit logs.
- Communications: Email history, scheduled communications, campaigns, templates.
- Notifications: In-app notifications tied to user and org context.

## Reporting & Intelligence
- Dashboard (BI): Targets, scheduled reports, layouts, materialized views.
- Reports: Operational and executive reports with exports and scheduled delivery.
- Settings: Workspace configuration, preferences, and integrations.

## Notes
- No dedicated “files” domain PRD found under `_Initiation/_prd/2-domains`.
- Dashboard domain requires new tables and materialized views not present in Drizzle yet.
