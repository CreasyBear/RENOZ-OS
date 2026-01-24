# RLS and Security (Top-Down)

## Tenant Isolation
- Every table with `organizationId` enforces `organizationId = auth.orgId()`.
- Join-only tables must enforce organization via parent joins.

## Join-Policy Checklist (Required for Join-Only Tables)
- Identify parent table with `organizationId`.
- RLS policy must join to parent and validate org match.
- Add composite index on join key to avoid RLS performance regressions.
- Document the join path in `cross-domain-fk-map.md`.

## Role Access Matrix (High-Level)
- **Admin**: read all domains, write approvals and settings.
- **Sales**: write pipeline, read customers/products/orders.
- **Operations**: write inventory/orders/suppliers, read customers/products.
- **Finance**: write financial, read orders/customers/reports.
- **Field Tech**: read assigned jobs and customer basics only.

## Sensitive Data
- PII (emails, phone) restricted to roles that need access.
- Audit trail for sensitive actions (price changes, approvals, exports).

## Audit Logging (Decision)
- Use a dedicated `audit_logs` table for immutable security/audit events.
- Keep `activities` for user-facing timeline entries only.
- `audit_logs` is append-only, org-scoped, and protected by strict RLS.

## Guardrails
- Polymorphic tables require entity type allowlists.
- RLS policies tested via org-scoped queries.

## Portal Policies
- Customer portal: customer-scoped access (customerId via contact mapping).
- Subcontractor portal: job-assignment scoped access only.

## Polymorphic Allowlist (Minimum)
- `activities.entityType` allowlist: customer, order, product, opportunity, job, issue, warranty, supplier.
- `custom_field_values.entityType` must match custom_fields.entityType.
- `sla_tracking.entityType` allowlist: issue, job_assignment, warranty_claim.
