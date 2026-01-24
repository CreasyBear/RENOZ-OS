# RLS Blueprint

## Baseline Policy
- Every table with `organizationId` enforces `organizationId = auth.orgId()`.
- For join-based tables (no orgId), restrict by join to parent entity.

## Polymorphic Tables
- `activities`: enforce orgId filter + validate entity ownership in app logic.
- `custom_field_values`: enforce orgId by join to `custom_fields`.
- `sla_tracking`: enforce orgId and entityType allowlist.

## Role-Based Access
- Roles map to read/write access by domain (admin = broad read, scoped write).
- Field tech: restrict to assigned jobs + related customer info.
- Finance: restrict to financial + orders + customers + reports.

## Enforcement Checklist
- No table left without RLS policy.
- All access paths tested via org-scoped queries.

## Implementation Status (renoz-website)
- RLS remediation applied and policies normalized to baseline.
- FORCE RLS enabled across public org/user-scoped tables.
