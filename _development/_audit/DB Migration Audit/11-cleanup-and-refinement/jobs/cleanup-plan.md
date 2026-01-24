# Domain: Jobs — Cleanup & Refinement

## Findings
- Verify org+createdAt DESC indexes on tasks, materials, templates, checklists, time entries.
- Potential missing explicit `organizationId` FK constraints.

## Required Fixes (Atomic)
- [x] Add missing org FK constraints if absent in schema/migrations.
- [x] Confirm PRD composite indexes (org + createdAt DESC / startTime DESC).

## Validation
- [x] DESC indexes match PRD
- [x] FK integrity (jobs ↔ users/customers/orders)

