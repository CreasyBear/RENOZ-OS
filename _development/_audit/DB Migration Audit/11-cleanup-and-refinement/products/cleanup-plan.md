# Domain: Products — Cleanup & Refinement

## Findings
- Verify FK coverage for category and warranty policy references.
- Check PRD composite indexes with createdAt DESC.

## Required Fixes (Atomic)
- [x] Add missing FK constraints if absent in schema/migrations.
- [x] Add/verify PRD composite indexes.

## Validation
- [x] Pricing/tiers constraints verified
- [x] Index ordering matches PRD

