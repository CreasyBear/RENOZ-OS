# Domain: Search — Cleanup & Refinement

## Findings
- PRD expects `searchVector` and additional entity fields; schema uses `searchText`.
- Outbox enqueue uses conflict updates for idempotent retries.

## Required Fixes (Atomic)
- [x] Decide if `searchVector` column is required or `searchText` + GIN is sufficient.
- [x] Ensure outbox worker idempotency and retry behaviors documented.

## Validation
- [x] Outbox worker idempotency verified
- [x] RLS policies validated

