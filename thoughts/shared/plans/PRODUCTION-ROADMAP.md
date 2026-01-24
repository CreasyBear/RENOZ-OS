# Renoz v3 Production Roadmap

**Core Goal:** Full production build with all domains complete
**Phase 1 Target:** Stable foundation (2 weeks)
**Phase 2 Target:** All PRDs executed (ongoing)
**Generated:** 2026-01-18

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION READINESS                      │
├─────────────────────────────────────────────────────────────┤
│  Phase 1: Stabilization (Weeks 1-2)                         │
│  ├── P0: Security & Build                                   │
│  ├── P1: Technical Debt                                     │
│  └── P2: Best Practices                                     │
├─────────────────────────────────────────────────────────────┤
│  Phase 2: Foundation Completion (Week 3)                    │
│  ├── error-handling PRD                                     │
│  ├── notifications PRD                                      │
│  └── realtime-webhooks PRD                                  │
├─────────────────────────────────────────────────────────────┤
│  Phase 3: Domain Expansion (Weeks 4+)                       │
│  ├── Tier 1: Revenue (financial, suppliers)                 │
│  ├── Tier 2: Operations (jobs, support)                     │
│  └── Tier 3: Enhancement (reports, portal, analytics)       │
├─────────────────────────────────────────────────────────────┤
│  Phase 4: Integrations                                      │
│  ├── xero, stripe, resend                                   │
│  └── google-maps, ai-infrastructure                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Stabilization (Weeks 1-2)

### Week 1: P0 - Security & Build

| Task | File(s) | Est | Blocks |
|------|---------|-----|--------|
| Fix SSR QueryClient leak | `src/routes/__root.tsx` | 1h | All SSR |
| Fix TypeScript build | deps + `vitest.setup.ts` + enums | 2h | All dev |
| Migrate auth to createServerFn | `src/routes/_authenticated.tsx` | 4h | Auth patterns |
| Audit multi-tenant queries | `src/server/*.ts` | 8h | Production |
| Add withAuth wrappers | `customers.ts`, `jobs.ts` | 4h | API security |
| Create RLS migration | `drizzle/migrations/` | 4h | DB security |

**Week 1 Deliverable:** Secure, building codebase

### Week 2: P1 - Technical Debt

| Task | File(s) | Est | Blocks |
|------|---------|-----|--------|
| Fix test infrastructure | `vitest.config.ts`, setup | 4h | CI/CD |
| Add auth + multi-tenant tests | `tests/integration/` | 8h | Confidence |
| Decide disabled files | `*.disabled` (3 files) | 2h | Clarity |
| Split customer-wizard | `customer-wizard.tsx` → 5 files | 4h | Maintainability |
| Fix React anti-patterns | useEffect audit | 4h | Performance |
| Pagination audit | `src/lib/db/pagination.ts` | 4h | Scale |

**Week 2 Deliverable:** Clean, tested codebase

---

## Phase 2: Foundation Completion (Week 3)

### PRD: error-handling (8 stories)

| Story | Description | Dependencies |
|-------|-------------|--------------|
| FOUND-ERR-001 | Sentry integration | - |
| FOUND-ERR-002 | Error boundary components | - |
| FOUND-ERR-003 | API error standardization | - |
| FOUND-ERR-004 | User-facing error messages | ERR-002 |
| FOUND-ERR-005 | Error logging pipeline | ERR-001 |
| FOUND-ERR-006 | Retry mechanisms | ERR-003 |
| FOUND-ERR-007 | Offline error queuing | ERR-006 |
| FOUND-ERR-008 | Error analytics dashboard | ERR-001, ERR-005 |

### PRD: notifications (9 stories)

| Story | Description | Dependencies |
|-------|-------------|--------------|
| FOUND-NOT-001 | Notification data model | - |
| FOUND-NOT-002 | In-app notification center | NOT-001 |
| FOUND-NOT-003 | Push notification setup | NOT-001 |
| FOUND-NOT-004 | Email notification triggers | NOT-001 |
| FOUND-NOT-005 | Notification preferences | NOT-002 |
| FOUND-NOT-006 | Batch notification sending | NOT-004 |
| FOUND-NOT-007 | Read/unread state management | NOT-002 |
| FOUND-NOT-008 | Notification templates | NOT-004 |
| FOUND-NOT-009 | Real-time notification delivery | realtime-webhooks |

### PRD: realtime-webhooks (11 stories)

| Story | Description | Dependencies |
|-------|-------------|--------------|
| FOUND-RT-001 | Supabase Realtime setup | - |
| FOUND-RT-002 | Webhook endpoint infrastructure | - |
| FOUND-RT-003 | Event subscription patterns | RT-001 |
| FOUND-RT-004 | Webhook signature verification | RT-002 |
| FOUND-RT-005 | Real-time UI updates | RT-003 |
| FOUND-RT-006 | Webhook retry logic | RT-002 |
| FOUND-RT-007 | Event logging | RT-001, RT-002 |
| FOUND-RT-008 | Connection state management | RT-001 |
| FOUND-RT-009 | Webhook management UI | RT-002 |
| FOUND-RT-010 | Rate limiting | RT-002 |
| FOUND-RT-011 | Dead letter queue | RT-006 |

**Week 3 Deliverable:** Production infrastructure complete

---

## Phase 3: Domain Expansion (Weeks 4+)

### Tier 1: Revenue Domains (Week 4-5)

#### PRD: financial (21 stories)
- Invoicing, AR aging, payment tracking
- Credit management, refunds
- Financial reporting, tax handling
- **Depends on:** orders, customers

#### PRD: suppliers (12 stories)
- Vendor management, purchase orders
- Receiving, cost tracking
- Supplier portal
- **Depends on:** products, inventory

### Tier 2: Operations Domains (Week 6-7)

#### PRD: jobs (19 stories)
- Project/job tracking
- Scheduling, crew assignment
- Job costing, materials tracking
- **Depends on:** orders, products, inventory, customers

#### PRD: support (17 stories)
- Ticket management, SLAs
- Knowledge base
- Customer portal
- **Depends on:** customers, orders

### Tier 3: Enhancement Domains (Week 8+)

#### PRD: reports
- Custom report builder
- Scheduled reports
- Export formats

#### PRD: documents
- Document storage
- Version control
- Templates

#### PRD: portal
- Customer self-service
- Order tracking
- Invoice payments

#### PRD: workflows
- Automation rules
- Approval processes
- Triggers

#### PRD: search
- Global search
- Filters, facets
- Recent/favorites

#### PRD: settings
- Organization settings
- User preferences
- System configuration

---

## Phase 4: Integrations (Parallel Track)

Can run in parallel once realtime-webhooks complete:

| Integration | Stories | Dependencies |
|-------------|---------|--------------|
| xero | 17 | financial, realtime-webhooks |
| stripe | 8 | orders, financial |
| resend | 15 | communications, realtime-webhooks |
| google-maps | 8 | jobs, customers |
| ai-infrastructure | 12 | - |
| analytics | 10 | all domains |

---

## Execution Strategy

### Parallel Tracks

```
Track A (Foundation):     P0 → P1 → error-handling → notifications
Track B (Infrastructure): ─────────→ realtime-webhooks → integrations
Track C (Domains):        ───────────────────────────→ financial → suppliers → jobs → support
```

### Agent Orchestration

| Phase | Primary Agent | Support Agents |
|-------|---------------|----------------|
| P0 Fixes | spark | debug-agent |
| P1 Debt | kraken | arbiter (tests) |
| PRD Execution | kraken | architect (planning) |
| Integration | kraken | oracle (API research) |

### Quality Gates

**Before moving to next phase:**
- [ ] TypeScript builds with 0 errors
- [ ] All tests pass
- [ ] Security audit clean
- [ ] Performance baseline met
- [ ] Documentation updated

---

## Success Metrics

| Metric | Current | Week 2 | Week 4 | Production |
|--------|---------|--------|--------|------------|
| TS Errors | 220 | 0 | 0 | 0 |
| Test Coverage | 0% | 40% | 60% | 80% |
| Security Issues | 4 P0 | 0 | 0 | 0 |
| PRDs Complete | 6/58 | 6/58 | 9/58 | 20+/58 |
| Domains Complete | 6/18 | 6/18 | 6/18 | 10+/18 |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Scope creep | Strict PRD sequencing, no scope additions mid-phase |
| Integration delays | Start integration research in parallel |
| Test debt | Enforce test coverage gates per phase |
| Burnout | 2-week sprints with clear deliverables |

---

## Commands Reference

```bash
# Daily checks
bun run typecheck && bun run test:vitest

# PRD execution
claude --prompt-file _Initiation/_prd/1-foundation/error-handling/PROMPT.md

# Progress tracking
cat progress.txt
```

---

## Next Action

**Start Phase 1, Week 1, Task 1:**
Fix SSR QueryClient leak in `src/routes/__root.tsx`

```bash
# Ready to execute?
```
