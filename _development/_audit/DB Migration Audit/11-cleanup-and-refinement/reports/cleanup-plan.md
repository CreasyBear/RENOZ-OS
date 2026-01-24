# Domain: Reports — Cleanup & Refinement

## Findings
- Scheduled reports are owned by reports domain; verify schema aligns with PRD.
- Report favorites uses table; verify uniqueness + FKs.

## Required Fixes (Atomic)
- [x] Ensure org+createdAt DESC indexes on scheduled reports.
- [x] Confirm report favorites unique constraints and FKs.

## Validation
- [x] Scheduled reports ownership consistent
- [x] Report favorites constraints verified

