# Design Principles (Greenfield Schema)

## Core Principles
- **Tenant-first**: Every business table has `organizationId` unless strictly derived; RLS is mandatory.
- **Explicit relationships**: Use FK constraints wherever possible; avoid implicit linkage.
- **Consistent data types**: Money, quantity, percentage, and count types are standardized.
- **Auditability**: Record who/when for critical actions (audit columns + activities).
- **Soft delete policy**: Only on entities with legal or operational retention requirements.
- **Predictable naming**: snake_case tables, singular columns, consistent FK naming.

## Non-Negotiables
- Every cross-domain reference must be documented and justified.
- Polymorphic tables (`activities`, `custom_field_values`, `sla_tracking`) must enforce org-level scoping and indexes.
- Performance must be designed at schema-level (composite indexes for list queries).
- Role access must map cleanly to RLS policies.

## Standards
- Money: numeric(12,2) for currency unless explicitly cents-integer is required; choose one and enforce across domains.
- Counts: integer types only (not currency columns).
- UUID everywhere for PKs; do not mix UUID and serial IDs.
- Version column required on offline-synced entities (jobs, checklists, time entries, etc.).
