# Ownership Boundaries

Defines primary ownership for shared entities and cross-domain dependencies.

## Canonical Owners (Current)

| Entity / Table Group | Owner Domain | Notes |
| --- | --- | --- |
| organizations, system_settings, custom_fields, data_exports | settings | Source of org identity and configuration. |
| users, user_groups, user_invitations, user_sessions, api_tokens | users | Identity, access, and membership. |
| customers, contacts, addresses | customers | CRM core customer data. |
| opportunities, quotes, win/loss | pipeline | Sales pipeline. |
| products, categories, product pricing, attributes | products | Catalog and pricing. |
| inventory, locations, stock counts | inventory | Stock and warehouse structures. |
| orders, shipments, order templates | orders | Fulfillment and invoicing base. |
| communications (email, calls, campaigns) | communications | Outbound comms. |
| financial (credit notes, schedules, statements, recognition) | financial | Accounting-related records. |
| suppliers, purchase orders, price agreements | suppliers | Procurement and supplier data. |
| support (issues, SLA, KB, escalations) | support | Customer support operations. |
| warranty (policies, warranties, claims) | warranty | Warranty lifecycle. |
| activities | activities | Cross-domain audit log. |

## Shared Infrastructure (Needs Decision)

| Entity / Table Group | Candidate Owners | Decision Needed |
| --- | --- | --- |
| sla_configurations, sla_tracking, sla_events | support vs shared platform | Used by support, jobs, warranty; consider an `sla` shared domain. |
| business_hours_config, organization_holidays | settings vs support | PRDs expect settings ownership; Drizzle places in support. |
| scheduledReports | dashboard vs reports | Defined in both PRDs. |
| audit_logs | activities vs dedicated | PRDs for users/settings expect audit_logs; currently only activities exists. |

## Cross-Domain Dependency Notes

- `products` relies on `warranty_policies` (warranty domain) for defaults. If warranty stays separate, product/category migrations must include FK availability ordering.
- `orders` drive `financial` records; decision needed on whether `orders` are invoices or a new `invoices` table is required.
- `support` and `warranty` both rely on SLA infra; consistent naming and ownership required for stable FK references.

## Post-Sprint 2 Reminder

- Review role PRDs after Sprint 2 to validate domain ownership against role-based access requirements.
