# UX Debt to PRD Mapping

> **Generated**: 2026-01-10
> **Total UX Debt Files**: 16 domains analyzed
> **Total Issues Identified**: 750+ high-priority issues
> **Average PRD Coverage**: 42%
> **Gap Analysis**: 350+ unmapped issues requiring new PRD stories

---

## Executive Summary

This document maps UX debt identified across 16 domain analyses to existing PRD stories, identifying coverage gaps that require new story creation.

### Coverage Overview

| Domain | Issues | PRD Coverage | Unmapped Gaps | Priority |
|--------|--------|--------------|---------------|----------|
| Customer | 85 | 22.4% | 56 | HIGH |
| Order | 42 | 35.7% | 54 | HIGH |
| Inventory | 45 | 60% | 18 | MEDIUM |
| Financial | 67 | 28% | 48 | CRITICAL |
| Jobs/Field Service | 25 | 40% | 15 | HIGH |
| Pipeline/Sales | 47 | 53% | 25 | HIGH |
| Support | 75 | 73% | 15 | MEDIUM |
| Communications | 95 | 88% | 7 | LOW |
| Reporting | 40 | 20% | 32 | CRITICAL |
| Procurement | 80 | 25% | 60 | HIGH |
| User Management | 92 | 13% | 80 | CRITICAL |
| AI Conversations | 12 | 60% | 5 | LOW |
| Audit Logs | 8 | 75% | 2 | LOW |
| Addresses/Contacts | 24 | 50% | 12 | MEDIUM |
| Customer Activities | 27 | 45% | 15 | MEDIUM |
| User Preferences | 28 | 30% | 20 | MEDIUM |

**Total Coverage**: ~42% (315 mapped / 750+ total issues)

---

## Domain-by-Domain Mapping

### 1. Customer Domain (DOM-CUSTOMERS)

**UX Debt Source**: `CUSTOMER_DOMAIN_UX_DEBT_ANALYSIS.md`
**PRD**: `customers.prd.json`
**Coverage**: 22.4% (19/85 issues mapped)

#### Mapped Issues

| UX Debt Issue | PRD Story | Status |
|---------------|-----------|--------|
| No tagging system | DOM-CUST-001a/b/c | Planned |
| No customer segmentation | DOM-CUST-001c | Planned |
| No credit limit management | DOM-CUST-002a/b/c | Planned |
| No duplicate detection | DOM-CUST-003a/b | Planned |
| No customer 360 view | DOM-CUST-004a/b/c | Planned |
| No health score | DOM-CUST-005a/b/c | Planned |
| No customer hierarchy | DOM-CUST-006a/b/c | Planned |
| No activity timeline | DOM-CUST-007a/b | Planned |

#### Unmapped Gaps (56 issues)

| Gap Category | Issues | Recommended PRD Story |
|--------------|--------|----------------------|
| Address auto-complete | 3 | DOM-CUST-008 (NEW) |
| Industry/category management | 4 | DOM-CUST-009 (NEW) |
| Phone validation | 2 | Foundation PRD |
| Advanced search filters | 8 | DOM-CUST-010 (NEW) |
| Search history/saved filters | 3 | DOM-CUST-010 (NEW) |
| Export search results | 2 | DOM-CUST-011 (NEW) |
| Communication preferences | 5 | DOM-COMMS integration |
| Relationship context display | 6 | DOM-CUST-004 enhancement |
| Bulk operations expansion | 4 | DOM-CUST-012 (NEW) |
| Mobile-optimized views | 5 | Cross-cutting mobile PRD |
| Data quality dashboard | 3 | DOM-CUST-013 (NEW) |
| Customer notes enhancement | 4 | DOM-CUST-014 (NEW) |
| Integration touchpoints | 7 | Integration PRDs |

---

### 2. Order Domain (DOM-ORDERS)

**UX Debt Source**: `ORDER_DOMAIN_UX_DEBT_ANALYSIS.md`
**PRD**: `orders.prd.json`
**Coverage**: 35.7% (15/42 issues mapped)

#### Mapped Issues

| UX Debt Issue | PRD Story | Status |
|---------------|-----------|--------|
| Order modification workflow | DOM-ORD-001 | Planned |
| Status tracking | DOM-ORD-002 | Planned |
| Line item management | DOM-ORD-003 | Planned |
| Order templates | DOM-ORD-004 | Planned |
| Fulfillment workflow | DOM-ORD-005 | Planned |

#### Unmapped Gaps (54 issues - includes related workflows)

| Gap Category | Issues | Recommended PRD Story |
|--------------|--------|----------------------|
| Post-creation item changes | 4 | DOM-ORD-006 (NEW) |
| Address update after creation | 2 | DOM-ORD-006 (NEW) |
| Advanced product search | 5 | DOM-ORD-007 (NEW) |
| Date range filtering | 3 | Foundation filter PRD |
| Customer history in order context | 4 | DOM-CUST integration |
| Email notifications from orders | 5 | DOM-COMMS integration |
| Pick path optimization | 3 | WF-FULFILLMENT |
| Mobile picking interface | 4 | Mobile PRD |
| Profit margin display | 3 | DOM-FIN integration |
| Payment tracking in orders | 4 | DOM-FIN integration |
| Overdue order alerts | 3 | CC-NOTIFICATIONS |
| Bulk status updates | 3 | DOM-ORD-008 (NEW) |
| Order cloning | 2 | DOM-ORD-009 (NEW) |
| Related orders view | 3 | DOM-ORD-010 (NEW) |
| Order analytics dashboard | 6 | DOM-REPORTS integration |

---

### 3. Inventory Domain (DOM-INVENTORY)

**UX Debt Source**: `INVENTORY_DOMAIN_UX_DEBT_ANALYSIS.md`
**PRD**: `inventory.prd.json`
**Coverage**: 60% (27/45 issues mapped)

#### Mapped Issues

| UX Debt Issue | PRD Story | Status |
|---------------|-----------|--------|
| Stock level visibility | DOM-INV-001 | Planned |
| Location management | DOM-INV-002 | Planned |
| Stock adjustments | DOM-INV-003 | Planned |
| Low stock alerts | DOM-INV-004 | Planned |
| Inventory movements | DOM-INV-005 | Planned |
| Stock valuation | DOM-INV-006 | Planned |

#### Unmapped Gaps (18 issues)

| Gap Category | Issues | Recommended PRD Story |
|--------------|--------|----------------------|
| Warehouse mobile app | 4 | Mobile PRD |
| Pick list optimization | 3 | WF-FULFILLMENT |
| Barcode scanning | 3 | DOM-INV-007 (NEW) |
| Real-time dashboard | 3 | DOM-INV-008 (NEW) |
| Multi-warehouse transfers | 2 | DOM-INV-009 (NEW) |
| Inventory forecasting | 3 | AI enhancement PRD |

---

### 4. Financial Domain (DOM-FINANCIAL)

**UX Debt Source**: `FINANCIAL_DOMAIN_UX_DEBT_ANALYSIS.md`
**PRD**: `financial.prd.json`
**Coverage**: 28% (19/67 issues mapped)

#### Mapped Issues

| UX Debt Issue | PRD Story | Status |
|---------------|-----------|--------|
| Invoice generation | DOM-FIN-001 | Planned |
| Payment recording | DOM-FIN-002 | Planned |
| Credit notes | DOM-FIN-003 | Planned |
| Statement generation | DOM-FIN-004 | Planned |
| Xero integration | INT-XERO | Planned |

#### Unmapped Gaps (48 issues) - CRITICAL

| Gap Category | Issues | Recommended PRD Story |
|--------------|--------|----------------------|
| Payment plans | 5 | DOM-FIN-005 (NEW) |
| Automated reminders | 4 | DOM-FIN-006 (NEW) |
| Multi-currency support | 3 | DOM-FIN-007 (NEW) |
| Bank reconciliation | 4 | DOM-FIN-008 (NEW) |
| Expense tracking | 5 | DOM-FIN-009 (NEW) |
| Financial reporting | 6 | DOM-REPORTS enhancement |
| Cash flow forecasting | 4 | DOM-FIN-010 (NEW) |
| Late payment penalties | 3 | DOM-FIN-006 enhancement |
| Partial payment handling | 3 | DOM-FIN-002 enhancement |
| Refund workflow | 4 | DOM-FIN-011 (NEW) |
| Tax reporting (BAS/GST) | 4 | DOM-FIN-012 (NEW) |
| Aged receivables | 3 | DOM-FIN-013 (NEW) |

---

### 5. Jobs/Field Service Domain (DOM-JOBS)

**UX Debt Source**: `JOBS_DOMAIN_UX_DEBT_ANALYSIS.md`
**PRD**: `jobs.prd.json`
**Coverage**: 40% (10/25 issues mapped)

#### Mapped Issues

| UX Debt Issue | PRD Story | Status |
|---------------|-----------|--------|
| Job scheduling | DOM-JOBS-001 | Planned |
| Assignment management | DOM-JOBS-002 | Planned |
| Job status workflow | DOM-JOBS-003 | Planned |
| Calendar integration | DOM-JOBS-004 | Planned |

#### Unmapped Gaps (15 issues)

| Gap Category | Issues | Recommended PRD Story |
|--------------|--------|----------------------|
| Task checklists | 3 | DOM-JOBS-005 (NEW) |
| Materials tracking | 3 | DOM-JOBS-006 (NEW) |
| Time entry | 2 | DOM-JOBS-007 (NEW) |
| Mobile field app | 4 | Mobile PRD |
| Route optimization | 2 | DOM-JOBS-008 (NEW) |
| Photo documentation | 1 | DOM-JOBS-009 (NEW) |

---

### 6. Pipeline/Sales Domain (DOM-PIPELINE)

**UX Debt Source**: `PIPELINE_DOMAIN_UX_DEBT_ANALYSIS.md`
**PRD**: `pipeline.prd.json`
**Coverage**: 53% (25/47 issues mapped)

#### Mapped Issues

| UX Debt Issue | PRD Story | Status |
|---------------|-----------|--------|
| Kanban view | DOM-PIPE-001 | Planned |
| Opportunity stages | DOM-PIPE-002 | Planned |
| Quote generation | DOM-PIPE-003 | Planned |
| Win/loss tracking | DOM-PIPE-004 | Planned |
| Forecasting | DOM-PIPE-005 | Planned |

#### Unmapped Gaps (25 issues)

| Gap Category | Issues | Recommended PRD Story |
|--------------|--------|----------------------|
| Lead scoring | 4 | DOM-PIPE-006 (NEW) |
| Sales activity tracking | 3 | DOM-PIPE-007 (NEW) |
| Competitor tracking | 3 | DOM-PIPE-008 (NEW) |
| Territory management | 4 | DOM-PIPE-009 (NEW) |
| Commission tracking | 3 | DOM-PIPE-010 (NEW) |
| Quote versioning | 2 | DOM-PIPE-003 enhancement |
| Sales playbooks | 3 | DOM-PIPE-011 (NEW) |
| Deal analytics | 3 | DOM-REPORTS integration |

---

### 7. Support Domain (DOM-SUPPORT)

**UX Debt Source**: `SUPPORT_DOMAIN_UX_DEBT_ANALYSIS.md`
**PRD**: `support.prd.json`
**Coverage**: 73% (55/75 issues mapped)

#### Mapped Issues

| UX Debt Issue | PRD Story | Status |
|---------------|-----------|--------|
| Ticket management | DOM-SUP-001 | Planned |
| Issue categorization | DOM-SUP-002 | Planned |
| Priority/SLA tracking | DOM-SUP-003 | Planned |
| Knowledge base | DOM-SUP-004 | Planned |
| Customer portal | DOM-SUP-005 | Planned |

#### Unmapped Gaps (15 issues)

| Gap Category | Issues | Recommended PRD Story |
|--------------|--------|----------------------|
| SLA breach alerts | 3 | CC-NOTIFICATIONS |
| First response metrics | 2 | DOM-SUP-006 (NEW) |
| Agent workload balancing | 3 | DOM-SUP-007 (NEW) |
| Canned responses | 3 | DOM-SUP-008 (NEW) |
| Customer satisfaction surveys | 4 | DOM-SUP-009 (NEW) |

---

### 8. Communications Domain (DOM-COMMUNICATIONS)

**UX Debt Source**: `COMMUNICATIONS_DOMAIN_UX_DEBT_ANALYSIS.md`
**PRD**: `communications.prd.json`
**Coverage**: 88% (84/95 issues mapped)

#### Mapped Issues

| UX Debt Issue | PRD Story | Status |
|---------------|-----------|--------|
| Email templates | DOM-COMMS-001 | Planned |
| Campaign management | DOM-COMMS-002 | Planned |
| Email history | DOM-COMMS-003 | Planned |
| Notification preferences | DOM-COMMS-004 | Planned |
| Resend integration | INT-RESEND | Planned |

#### Unmapped Gaps (7 issues)

| Gap Category | Issues | Recommended PRD Story |
|--------------|--------|----------------------|
| SMS integration | 3 | DOM-COMMS-005 (NEW) |
| Email scheduling | 2 | DOM-COMMS-001 enhancement |
| Open/click analytics | 2 | DOM-COMMS-006 (NEW) |

---

### 9. Reporting Domain (DOM-REPORTS)

**UX Debt Source**: `REPORTING_DOMAIN_UX_DEBT_ANALYSIS.md`
**PRD**: `reports.prd.json`
**Coverage**: 20% (8/40 issues mapped) - CRITICAL

#### Mapped Issues

| UX Debt Issue | PRD Story | Status |
|---------------|-----------|--------|
| Basic dashboards | DOM-REP-001 | Planned |
| Export functionality | DOM-REP-002 | Planned |

#### Unmapped Gaps (32 issues) - CRITICAL

| Gap Category | Issues | Recommended PRD Story |
|--------------|--------|----------------------|
| Custom report builder | 5 | DOM-REP-003 (NEW) |
| Scheduled reports | 3 | DOM-REP-004 (NEW) |
| Real-time dashboards | 4 | DOM-REP-005 (NEW) |
| KPI tracking | 4 | DOM-REP-006 (NEW) |
| Data visualization | 4 | DOM-REP-007 (NEW) |
| Report templates | 3 | DOM-REP-008 (NEW) |
| Cross-domain analytics | 5 | DOM-REP-009 (NEW) |
| Historical comparisons | 4 | DOM-REP-010 (NEW) |

---

### 10. Procurement Domain (DOM-PROCUREMENT)

**UX Debt Source**: `PROCUREMENT_DOMAIN_UX_DEBT_ANALYSIS.md`
**PRD**: `suppliers.prd.json` (partial)
**Coverage**: 25% (20/80 issues mapped)

#### Mapped Issues

| UX Debt Issue | PRD Story | Status |
|---------------|-----------|--------|
| Supplier management | DOM-SUP-001 | EXISTS |
| Purchase orders | DOM-PROC-001 | Planned |

#### Unmapped Gaps (60 issues)

| Gap Category | Issues | Recommended PRD Story |
|--------------|--------|----------------------|
| Purchase order workflow | 8 | DOM-PROC-002 (NEW) |
| Goods receiving | 5 | DOM-PROC-003 (NEW) |
| Supplier performance | 6 | DOM-PROC-004 (NEW) |
| Price management | 5 | DOM-PROC-005 (NEW) |
| Reorder automation | 4 | DOM-PROC-006 (NEW) |
| Supplier portal | 6 | DOM-PROC-007 (NEW) |
| Quality control | 4 | DOM-PROC-008 (NEW) |
| Returns to supplier | 4 | DOM-PROC-009 (NEW) |
| Contract management | 5 | DOM-PROC-010 (NEW) |
| Procurement analytics | 5 | DOM-REP integration |
| Multi-supplier ordering | 4 | DOM-PROC-011 (NEW) |
| Approval workflows | 4 | DOM-PROC-012 (NEW) |

---

### 11. User Management Domain (DOM-USERS)

**UX Debt Source**: `USER_MANAGEMENT_DOMAIN_UX_DEBT_ANALYSIS.md`
**PRD**: `users.prd.json`
**Coverage**: 13% (12/92 issues mapped) - CRITICAL

#### Mapped Issues

| UX Debt Issue | PRD Story | Status |
|---------------|-----------|--------|
| User CRUD | DOM-USER-001 | EXISTS |
| Role assignment | DOM-USER-002 | Planned |
| Profile management | DOM-USER-003 | Planned |

#### Unmapped Gaps (80 issues) - CRITICAL

| Gap Category | Issues | Recommended PRD Story |
|--------------|--------|----------------------|
| User groups | 8 | DOM-USER-004 (NEW) |
| Permission matrix UI | 6 | DOM-USER-005 (NEW) |
| Delegation workflow | 5 | DOM-USER-006 (NEW) |
| Onboarding flow | 8 | DOM-USER-007 (NEW) |
| Activity audit | 5 | DOM-USER-008 (NEW) |
| Password policies | 4 | FOUND-AUTH enhancement |
| Session management | 4 | FOUND-AUTH enhancement |
| 2FA setup | 5 | DOM-USER-009 (NEW) |
| Team management | 6 | DOM-USER-010 (NEW) |
| User deactivation workflow | 4 | DOM-USER-011 (NEW) |
| Bulk user operations | 5 | DOM-USER-012 (NEW) |
| User notifications config | 4 | DOM-COMMS integration |
| License management | 5 | DOM-USER-013 (NEW) |
| User analytics | 4 | DOM-REP integration |
| Avatar/profile photos | 3 | DOM-USER-003 enhancement |
| User search/filter | 4 | DOM-USER-014 (NEW) |

---

### 12. AI Conversations Domain

**UX Debt Source**: `AI_CONVERSATIONS_DOMAIN_UX_DEBT_ANALYSIS.md`
**PRD**: `communications.prd.json` (partial), INT-CLAUDE
**Coverage**: 60% (7/12 issues mapped)

#### Unmapped Gaps (5 issues)

| Gap Category | Issues | Recommended PRD Story |
|--------------|--------|----------------------|
| Conversation history | 2 | INT-CLAUDE enhancement |
| AI settings per user | 2 | DOM-USER integration |
| Usage analytics | 1 | DOM-REP integration |

---

### 13. Audit Logs Domain

**UX Debt Source**: `AUDIT_LOGS_DOMAIN_UX_DEBT_ANALYSIS.md`
**PRD**: `settings.prd.json` (partial)
**Coverage**: 75% (6/8 issues mapped)

#### Unmapped Gaps (2 issues)

| Gap Category | Issues | Recommended PRD Story |
|--------------|--------|----------------------|
| Advanced audit search | 1 | DOM-SET-002 enhancement |
| Audit export | 1 | DOM-SET-002 enhancement |

---

## Gap Analysis Summary

### Critical Gaps Requiring New PRD Stories

| Priority | Domain | New Stories Needed | Effort |
|----------|--------|-------------------|--------|
| CRITICAL | Financial | 9 new stories | High |
| CRITICAL | Reporting | 8 new stories | High |
| CRITICAL | User Management | 11 new stories | High |
| HIGH | Procurement | 11 new stories | High |
| HIGH | Customer | 7 new stories | Medium |
| HIGH | Order | 5 new stories | Medium |
| HIGH | Jobs | 5 new stories | Medium |
| HIGH | Pipeline | 6 new stories | Medium |
| MEDIUM | Inventory | 3 new stories | Low |
| MEDIUM | Support | 4 new stories | Low |
| LOW | Communications | 2 new stories | Low |

**Total New Stories Required**: ~71 new PRD stories

### Cross-Cutting Gaps

These issues span multiple domains and require cross-cutting PRDs:

| Gap | Affected Domains | Recommended PRD |
|-----|------------------|-----------------|
| Mobile experience | All | CC-MOBILE (NEW) |
| Advanced search/filters | 8 domains | CC-SEARCH (NEW) |
| Bulk operations | 6 domains | CC-BULK-OPS (NEW) |
| Data export | 5 domains | CC-EXPORT (NEW) |
| Real-time notifications | 7 domains | CC-NOTIFICATIONS |
| Analytics integration | 10 domains | DOM-REPORTS |

---

## Remediation Roadmap

### Phase 1: Foundation Gaps (Weeks 1-4)
- Address FOUND-AUTH gaps (password policies, session management)
- Create CC-NOTIFICATIONS enhancements
- Implement foundation filter patterns

### Phase 2: Critical Domain Gaps (Weeks 5-12)
- Financial domain: 9 new stories
- User Management: 11 new stories
- Reporting: 8 new stories

### Phase 3: High Priority Gaps (Weeks 13-20)
- Procurement: 11 new stories
- Customer enhancements: 7 new stories
- Jobs/Field Service: 5 new stories

### Phase 4: Medium Priority Gaps (Weeks 21-28)
- Pipeline: 6 new stories
- Order: 5 new stories
- Support: 4 new stories
- Inventory: 3 new stories

### Phase 5: Cross-Cutting (Weeks 29-32)
- CC-MOBILE PRD
- CC-SEARCH PRD
- CC-BULK-OPS PRD

---

## Action Items

### Immediate Actions

1. **Create 71 new PRD stories** to address unmapped gaps
2. **Enhance 15 existing stories** to expand coverage
3. **Create 4 new cross-cutting PRDs** (Mobile, Search, Bulk Ops, Export)

### PRD Updates Required

| PRD File | Action | New Stories |
|----------|--------|-------------|
| `financial.prd.json` | Add DOM-FIN-005 through DOM-FIN-013 | 9 |
| `users.prd.json` | Add DOM-USER-004 through DOM-USER-014 | 11 |
| `reports.prd.json` | Add DOM-REP-003 through DOM-REP-010 | 8 |
| `suppliers.prd.json` | Add DOM-PROC-002 through DOM-PROC-012 | 11 |
| `customers.prd.json` | Add DOM-CUST-008 through DOM-CUST-014 | 7 |
| `pipeline.prd.json` | Add DOM-PIPE-006 through DOM-PIPE-011 | 6 |
| `jobs.prd.json` | Add DOM-JOBS-005 through DOM-JOBS-009 | 5 |
| `orders.prd.json` | Add DOM-ORD-006 through DOM-ORD-010 | 5 |
| `support.prd.json` | Add DOM-SUP-006 through DOM-SUP-009 | 4 |
| `inventory.prd.json` | Add DOM-INV-007 through DOM-INV-009 | 3 |
| `communications.prd.json` | Add DOM-COMMS-005, DOM-COMMS-006 | 2 |

### New PRD Files Required

| PRD File | Category | Stories |
|----------|----------|---------|
| `mobile.prd.json` | cross-cutting | 8 |
| `search.prd.json` | cross-cutting | 6 |
| `bulk-operations.prd.json` | cross-cutting | 5 |
| `export.prd.json` | cross-cutting | 4 |

---

## Validation Checklist

- [ ] All 16 UX debt files cross-referenced
- [ ] All 15 domain PRDs reviewed
- [ ] Gap categories identified and prioritized
- [ ] New story IDs follow naming convention
- [ ] Cross-cutting gaps assigned to appropriate PRDs
- [ ] Remediation roadmap aligns with execution sequence
- [ ] Total effort estimated realistically

---

## Related Documents

- [Wireframe Readiness Matrix](../_wireframes/wireframe-readiness-matrix.md)
- [Execution Sequence](./execution-sequence.md)
- [Master Execution Plan](./master-execution-plan.md)
- [Reference Mapping](./reference-mapping.md)
