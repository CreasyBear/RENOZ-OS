# Domain: Customers — Cleanup & Refinement

## Findings
- Confirm composite org+createdAt DESC indexes align with PRD.
- Potential missing explicit FK for `organizationId`.

## Required Fixes (Atomic)
- [x] Add explicit `organizationId` FK where missing.
- [x] Verify contact/address FKs and org-scoped indexes.

## Validation
- [x] FK integrity for contacts/addresses
- [x] Index ordering matches PRD

