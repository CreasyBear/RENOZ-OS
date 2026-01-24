# Domain: Users — Cleanup & Refinement

## Findings
- Audit logs now dedicated table; verify org/user FKs and RLS.
- Confirm `organizationId` FK constraints where required.

## Required Fixes (Atomic)
- [x] Add explicit org/user FKs if missing in schema/migrations.

## Validation
- [x] Audit logs alignment verified
- [x] RLS policies verified

