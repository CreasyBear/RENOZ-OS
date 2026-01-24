# Domain: Activities — Cleanup & Refinement

## Findings
- Potential missing FK constraints for `organizationId`, `userId`, `createdBy`.
- Index ordering now uses DESC; verify against PRD list.

## Required Fixes (Atomic)
- [x] Add explicit FKs for `organizationId`, `userId`, `createdBy` if missing in schema/migrations.
- [x] Confirm all PRD-required composite indexes exist (org + createdAt DESC).

## Validation
- [x] RLS/org scoping verified
- [x] Index ordering matches PRD

