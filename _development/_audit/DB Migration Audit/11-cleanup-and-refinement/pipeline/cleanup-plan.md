# Domain: Pipeline — Cleanup & Refinement

## Findings

- Verify org+createdAt DESC indexes on opportunities, activities, quote versions.
- Confirm FK coverage for customer/contact/assigned user fields.

## Required Fixes (Atomic)

- [x] Add missing org FK constraints if absent.
- [x] Ensure PRD composite indexes exist with DESC ordering.

## Validation

- [x] DESC indexes match PRD
- [x] Quote/version constraints verified
