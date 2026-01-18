# Performance Benchmarks for renoz-v3

## Target Data Volumes

| Entity | Year 1 | Year 3 | Year 5 |
|--------|--------|--------|--------|
| Customers | 500 | 2,000 | 10,000 |
| Contacts | 1,500 | 6,000 | 30,000 |
| Opportunities | 2,000 | 10,000 | 50,000 |
| Quotes | 3,000 | 15,000 | 75,000 |
| Orders | 1,000 | 5,000 | 25,000 |
| Jobs | 500 | 2,500 | 12,000 |
| Invoices | 1,200 | 6,000 | 30,000 |
| Products | 200 | 500 | 1,000 |
| Activities | 20,000 | 100,000 | 500,000 |

## Response Time Targets

| Operation | Target | Acceptable | Unacceptable |
|-----------|--------|------------|--------------|
| Page load (dashboard) | <1s | <2s | >3s |
| List view (100 items) | <500ms | <1s | >2s |
| Detail view | <300ms | <500ms | >1s |
| Search results | <500ms | <800ms | >1.5s |
| Form submit | <200ms | <500ms | >1s |
| Report generation | <3s | <5s | >10s |

## Benchmark Tests

```bash
# Run with Year 3 data volume (seed script)
bun run seed:benchmark --volume=year3

# Performance test suite
bun test:perf -- --grep "dashboard load" --timeout=5000
bun test:perf -- --grep "customer list" --timeout=2000
bun test:perf -- --grep "global search" --timeout=1500
```

## Materialized View Refresh

| View | Refresh Frequency | Max Duration |
|------|------------------|--------------|
| mv_daily_metrics | Every 15 min | <30s |
| mv_pipeline_summary | Every 5 min | <15s |
| mv_inventory_levels | Real-time trigger | <1s |

## Query Optimization Requirements

- All list queries MUST use pagination (limit 50)
- All dashboard queries MUST hit materialized views or cache
- No query should scan >10,000 rows without index
- EXPLAIN ANALYZE required for any query >100ms
