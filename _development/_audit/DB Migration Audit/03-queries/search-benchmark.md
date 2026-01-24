# Search Latency Benchmark

Status: pending execution

## Target
- Global search P50 < 500ms on seeded data
- Quick search P50 < 250ms on seeded data

## Benchmark Inputs
- Queries: `battery`, `warranty`, `order 1001`, `job 2001`, `acme`
- Entity filters: none + single entity type

## Procedure
- [ ] Seed data (customers, orders, jobs, issues, quotes).
- [ ] Warm up (5 runs per query).
- [ ] Measure 20 runs per query (P50/P95).
- [ ] Record results and regression notes.

## Notes
- Ensure outbox has processed search index entries before running.
