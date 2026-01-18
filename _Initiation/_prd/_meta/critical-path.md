# Critical Path Analysis: Core 3 Domains

> **Generated**: 2026-01-09
> **Total Stories**: 52
> **Total Iterations**: 220

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Entry points (no dependencies) | 19 stories |
| Max parallel tracks | 5 |
| Critical path iterations | 20 |
| Theoretical min (perfect parallel) | 54 iterations |

---

## Critical Path

The **longest dependency chain** that determines minimum completion time:

```
DOM-PIPE-001a → DOM-PIPE-001b → DOM-PIPE-001c → DOM-PIPE-007a → DOM-PIPE-007b
(Schema)        (API)            (UI)            (Kanban Totals)  (Kanban Filters)
   3              4                4                 4                5
                                                                  = 20 iterations
```

**Why this is critical**: Pipeline forecasting fields (001) must be complete before Enhanced Kanban (007) can show weighted totals and stale highlighting.

---

## Parallel Execution Strategy

### Track 1: All Schema Work (Can Start Immediately)
```
Customers: DOM-CUST-001a, 002a, 006a          (8 iter)
Orders:    DOM-ORD-001a, 004a, 005a, 006a    (10 iter)
Pipeline:  DOM-PIPE-001a, 003a, 005a          (9 iter)
```
**10 stories, ~27 iterations** - All can run in parallel

### Track 2: Standalone UI (No Schema Dependencies)
```
DOM-CUST-004a  Metrics Dashboard        (5 iter)
DOM-CUST-004b  Quick Actions            (4 iter)
DOM-ORD-007    Fulfillment Dashboard    (8 iter)
DOM-PIPE-002   Quote PDF Integration    (5 iter)
DOM-PIPE-008   Quick Quote Creation     (5 iter)
```
**5 stories, 27 iterations** - Can run parallel to schema track

### Track 3: API-Only (No New Schema)
```
DOM-CUST-003a  Merge Customers          (5 iter)
DOM-CUST-007a  Unified Timeline API     (4 iter)
DOM-PIPE-004a  Quote Validity API       (3 iter)
```
**3 stories, 12 iterations** - Can run parallel to everything

---

## Dependency Visualization

### Customers Domain (17 stories)

```
                 ┌─ DOM-CUST-001a ─→ 001b ─→ 001c    (Tags)
                 │
                 ├─ DOM-CUST-002a ─→ 002b ─→ 002c    (Credit)
                 │
                 ├─ DOM-CUST-003a ─→ 003b            (Merge)
                 │
                 ├─ DOM-CUST-004a ─┬────────────────┐ (360 View)
START ───────────┤                 │                │
                 ├─ DOM-CUST-004b  │                │
                 │                 ▼                │
                 ├─ DOM-CUST-005a ─→ 005b ─→ 005c ←─┘ (Health Score)
                 │
                 ├─ DOM-CUST-006a ─→ 006b ─→ 006c    (Hierarchy)
                 │
                 └─ DOM-CUST-007a ─→ 007b            (Timeline)
```

### Orders Domain (19 stories)

```
                 ┌─ DOM-ORD-001a ─→ 001b ─→ 001c    (Shipments)
                 │       │
                 │       ├─→ DOM-ORD-002a ─→ 002b ─→ 002c  (Delivery)
                 │       │
                 │       └─→ DOM-ORD-003a ─→ 003b ─→ 003c  (Partial)
START ───────────┤
                 ├─ DOM-ORD-004a ─→ 004b ─→ 004c    (Backorders)
                 │
                 ├─ DOM-ORD-005a ─→ 005b ─→ 005c    (Templates)
                 │
                 ├─ DOM-ORD-006a ─→ 006b ─→ 006c    (Amendments)
                 │
                 └─ DOM-ORD-007                      (Fulfillment Dashboard)
```

### Pipeline Domain (16 stories)

```
                 ┌─ DOM-PIPE-001a ─→ 001b ─→ 001c ─→ DOM-PIPE-007a ─→ 007b
                 │                     │            (Critical Path)
START ───────────┤                     └─→ DOM-PIPE-006 (Forecast Report)
                 │
                 ├─ DOM-PIPE-002                     (Quote PDF)
                 │
                 ├─ DOM-PIPE-003a ─→ 003b ─→ 003c   (Versioning)
                 │
                 ├─ DOM-PIPE-004a ─→ 004b           (Validity)
                 │
                 ├─ DOM-PIPE-005a ─→ 005b ─→ 005c   (Win/Loss)
                 │
                 └─ DOM-PIPE-008                     (Quick Quote)
```

---

## Recommended Sprint Plan

### Sprint 1: Schema Foundation (27 iterations)

All schema stories can run in parallel:

| Story | Description | Iterations |
|-------|-------------|------------|
| DOM-CUST-001a | Customer Tags schema | 3 |
| DOM-CUST-002a | Credit Limit schema | 2 |
| DOM-CUST-006a | Customer Hierarchy schema | 3 |
| DOM-ORD-001a | Shipment Tracking schema | 3 |
| DOM-ORD-004a | Backorder schema | 2 |
| DOM-ORD-005a | Order Templates schema | 3 |
| DOM-ORD-006a | Order Amendments schema | 3 |
| DOM-PIPE-001a | Forecasting Fields schema | 3 |
| DOM-PIPE-003a | Quote Versioning schema | 3 |
| DOM-PIPE-005a | Win/Loss Reasons schema | 3 |

### Sprint 2: API Layer (57 iterations)

All server functions, depends on Sprint 1:

| Story | Description | Iterations |
|-------|-------------|------------|
| DOM-CUST-001b | Customer Tags API | 4 |
| DOM-CUST-002b | Credit Limit API | 4 |
| DOM-CUST-003a | Merge Customers API | 5 |
| DOM-CUST-005a | Health Score Algorithm | 4 |
| DOM-CUST-006b | Customer Hierarchy API | 4 |
| DOM-CUST-007a | Unified Timeline API | 4 |
| DOM-ORD-001b | Shipment Tracking API | 4 |
| DOM-ORD-004b | Backorder API | 5 |
| DOM-ORD-005b | Order Templates API | 5 |
| DOM-ORD-006b | Order Amendments API | 5 |
| DOM-PIPE-001b | Forecasting API | 4 |
| DOM-PIPE-003b | Quote Versioning API | 4 |
| DOM-PIPE-004a | Quote Validity API | 3 |
| DOM-PIPE-005b | Win/Loss Reasons API | 4 |

### Sprint 3: UI Components (93 iterations)

All UI stories, depends on Sprint 2:

*(21 stories - see execution-graph.yaml for full list)*

### Sprint 4: Complex Features (43 iterations)

Multi-dependency features requiring earlier features complete:

| Story | Description | Dependencies |
|-------|-------------|--------------|
| DOM-CUST-005c | Health Score UI | 004a, 005a |
| DOM-ORD-002b/c | Delivery Confirmation | 001a/b/c |
| DOM-ORD-003b/c | Partial Shipments | 001a/b/c |
| DOM-PIPE-006 | Forecasting Report | 001b |
| DOM-PIPE-007a/b | Enhanced Kanban | 001c |

---

## Risk Areas

### High Dependency Stories

| Story | # Dependencies | Risk |
|-------|----------------|------|
| DOM-CUST-005c | 2 (004a + 005a) | Medium - two features must be complete |
| DOM-PIPE-007b | 5 (full chain) | High - end of critical path |
| DOM-ORD-003c | 4 (001a, 003a, 001b, 003b) | Medium - deep in order chain |

### Schema Changes

10 stories create new tables - coordinate migrations to avoid conflicts:

```sql
-- New tables in Sprint 1
customer_tags, customer_tag_assignments
order_shipments, shipment_items
order_templates, order_template_items
order_amendments
quote_versions
win_loss_reasons
```

---

## Success Metrics

After completion of all 52 stories:

1. ✅ All 52 `completion_promise` tags emitted
2. ✅ `npm run typecheck` passes
3. ✅ `npm run db:generate` succeeds
4. ✅ No regression in existing functionality
5. ✅ Performance targets met (per assumptions.md)

---

*This document should be updated as stories are completed.*
