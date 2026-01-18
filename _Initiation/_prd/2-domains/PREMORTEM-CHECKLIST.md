# PRD-2 Premortem Checklist

**Created**: 2026-01-17
**Status**: PRE-IMPLEMENTATION GATE

This checklist must be completed before starting ralph-loop execution on PRD-2 domains.

---

## Executive Summary

A deep premortem analysis identified **33 tigers** and **27 elephants** across 16 domains.
Four remediation plans have been created to address the most critical risks.

---

## Remediation Plans (Must Review)

| Plan | Location | Critical For |
|------|----------|--------------|
| Schema Migrations | `_meta/remediation-schema-migrations.md` | products, inventory, suppliers |
| SLA Engine | `_meta/remediation-sla-engine.md` | support, warranty, jobs |
| Dashboard Performance | `_meta/remediation-dashboard-performance.md` | dashboard, reports |
| Xero Integration | `_meta/remediation-xero-integration.md` | financial |

---

## Pre-Implementation Gates

### Gate 1: Schema Foundation (BLOCKING)

Before starting any domain implementation:

- [ ] Create `007_inventory-core.ts` migration with shared tables
- [ ] Verify migration sequence: 007 -> 008 (products) -> 010 (suppliers) -> 011 (inventory)
- [ ] Update Products PRD to remove `inventoryMovements` table definition
- [ ] Update Inventory PRD to not recreate shared tables
- [ ] Test FK constraints with sample data

**Owner**: Schema Lead
**Estimated effort**: 1 dev-day

### Gate 2: SLA Engine Design (BLOCKING for Service Line)

Before starting support/warranty/jobs domains:

- [ ] Review unified SLA engine design in remediation plan
- [ ] Create `src/lib/sla/` directory structure
- [ ] Define `sla_configurations` table schema
- [ ] Define `business_hours_config` table schema
- [ ] Document SLA calculation API contract

**Owner**: Architect
**Estimated effort**: 2 dev-days

### Gate 3: Dashboard Infrastructure (BLOCKING for Analytics)

Before starting dashboard domain:

- [ ] Design 5 materialized views per remediation plan
- [ ] Create Redis cache strategy document
- [ ] Define Trigger.dev refresh jobs
- [ ] Set up pg_cron or alternative for MV refresh
- [ ] Verify Financial domain has metrics available

**Owner**: Backend Lead
**Estimated effort**: 2 dev-days

### Gate 4: Xero Integration Architecture (BLOCKING for Financial)

Before DOM-FIN-005a (Xero sync):

- [ ] Set up rate limiter utility (`src/lib/xero/rate-limiter.ts`)
- [ ] Set up circuit breaker pattern (`src/lib/xero/circuit-breaker.ts`)
- [ ] Configure Trigger.dev job queue for Xero operations
- [ ] Set up Xero sandbox account for testing
- [ ] Document webhook endpoint requirements

**Owner**: Integration Lead
**Estimated effort**: 3 dev-days

---

## Domain Execution Order (Risk-Adjusted)

Based on premortem findings, the recommended execution order is:

### Phase 1: Low-Risk Domains (Start Here)
1. **activities** - 5 stories, independent, low complexity
2. **communications** - 17 stories, depends only on customers (done)
3. **users** - 13 stories, mostly independent

### Phase 2: Core Business (After Gate 1)
4. **products** - 18 stories, schema dependency resolved
5. **inventory** - 13 stories, depends on products
6. **suppliers** - 12 stories, depends on inventory

### Phase 3: Service Line (After Gate 2)
7. **jobs** - 19 stories, SLA engine dependency
8. **support** - 17 stories, SLA engine dependency
9. **warranty** - 20 stories, depends on support + products

### Phase 4: Analytics (After Gates 3 & 4)
10. **financial** - 21 stories, Xero integration critical
11. **dashboard** - 16 stories, depends on financial + MVs
12. **reports** - 8 stories, depends on dashboard infrastructure

### Phase 5: System Domains (Parallel Safe)
13. **settings** - 13 stories, custom fields complexity
14. **pipeline** - 15 stories, mostly independent
15. **orders** - 15 stories, mostly independent
16. **customers** - 12 stories, mostly independent

---

## Critical Risks Accepted

The following risks were identified but accepted as manageable:

1. **47 stories in Core Business** - Timeline realistic at 12-16 weeks
2. **Timer persistence complexity** - Will implement basic version first
3. **Custom fields migration** - Manual backfill acceptable for MVP
4. **GDPR export scope** - Legal review deferred to post-MVP

---

## Key Metrics to Track

During PRD-2 implementation, monitor:

| Metric | Target | Action if Exceeded |
|--------|--------|-------------------|
| Story iteration count | <=4 per story | Review scope/approach |
| Migration conflicts | 0 | Stop, resolve before continuing |
| Performance test failures | 0 | Apply caching/optimization |
| Xero rate limit hits | <5/day | Increase batch delays |

---

## Sign-Off

Before starting PRD-2 ralph-loop:

- [ ] All 4 gates reviewed
- [ ] Blocking gates completed (1 for Core Business minimum)
- [ ] Remediation plans saved to CLAUDE.md for agent context
- [ ] This checklist reviewed by lead developer

**Approved by**: _________________ **Date**: _________________

---

*Generated from premortem analysis on 2026-01-17*
