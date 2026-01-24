# Domain: Financial — Cleanup & Refinement

## Findings
- Verify all currency/count types standardized to numeric(12,2)/integer.
- Confirm composite org+createdAt DESC indexes where PRD specifies.
- Potential missing explicit `organizationId` FK on some financial tables.

## Required Fixes (Atomic)
- [x] Add missing org FK constraints if absent in schema/migrations.
- [x] Add/verify PRD composite indexes (org+createdAt DESC).

## Validation
- [x] Money/count types normalized
- [x] Index ordering matches PRD

