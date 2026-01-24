# Domain: Support — Cleanup & Refinement

## Findings
- PRD uses `issue_feedback`; schema uses `csat_responses` (mapped).
- Verify FK coverage for issues (customer, assigned user, SLA tracking).
- Confirm SLA business hours now reference settings.

## Required Fixes (Atomic)
- [x] Ensure explicit FK constraints on issue relationships.
- [x] Confirm `csat_responses` mapping documented and accepted.
- [x] Add org+createdAt DESC index for issue listing.

## Validation
- [x] SLA/business hours linkage verified
- [x] CSAT naming alignment verified

