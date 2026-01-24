# Domain: Warranty — Cleanup & Refinement

## Findings
- Verify FK coverage for warranty claims (issue, warranty, SLA tracking).
- Confirm PRD composite indexes with createdAt DESC.

## Required Fixes (Atomic)
- [x] Add missing FK constraints if absent in schema/migrations.
- [x] Add/verify PRD composite indexes.

## Validation
- [x] SLA linkage verified
- [x] Index ordering matches PRD

