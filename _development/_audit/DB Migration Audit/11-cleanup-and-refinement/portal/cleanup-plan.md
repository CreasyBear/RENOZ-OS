# Domain: Portal — Cleanup & Refinement

## Findings
- Verify portal RLS policies on orders/jobs/quotes align with identity scoping.
- Ensure portal read APIs are the only access path for suppressed fields.
- RLS validation script requires applied migrations; policy list tests pass.

## Required Fixes (Atomic)
- [x] Re-run portal RLS validation script and tests.
- [x] Confirm field suppression list matches PRD and security expectations.

## Validation
- [x] RLS scope verified (customer/subcontractor)
- [x] Field suppression tests pass
