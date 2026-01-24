# Domain: Suppliers — Cleanup & Refinement

## Findings
- Line total formula and rating formula enforced by checks; confirm PRD alignment.
- Verify org+createdAt DESC indexes across supplier-related tables.

## Required Fixes (Atomic)
- [x] Decide if `overallRating` should be generated column vs check constraint.
- [x] Add missing org FK constraints if absent.

## Validation
- [x] Line total formula enforced
- [x] Rating formula enforced

