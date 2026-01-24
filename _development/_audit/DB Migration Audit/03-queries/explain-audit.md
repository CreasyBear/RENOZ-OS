# Explain Plan Audit (Hot Paths)

Status: pending execution

## Scope
- Orders list/detail
- Customers list/detail
- Jobs list/detail
- Search (global + quick)
- Quotes list/detail

## Checklist (per query)
- [ ] Capture SQL (or Drizzle query) and bind values.
- [ ] Run `EXPLAIN (ANALYZE, BUFFERS)` with realistic parameters.
- [ ] Record index usage and row estimates vs actuals.
- [ ] Note missing indexes or misestimates.
- [ ] Capture execution time and rows scanned.

## Notes
- RLS policies are enabled; ensure `app.organization_id` is set for accurate plans.
- Use seeded data volumes to avoid misleading plans.
