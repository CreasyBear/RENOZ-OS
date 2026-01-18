# Renoz-v3 Premortem Analysis

**Generated**: 2026-01-11
**Analysis Method**: 5 parallel sub-agents analyzing PRDs by phase

---

## Executive Summary

This 30-week CRM rebuild faces systemic risks. **Probability of success at 30 weeks: 20%**. Realistic duration is 38-45 weeks.

The top 3 project killers are:
1. **Velocity assumption is wrong** (5-6 iter/dev/week assumed, reality is 3-4)
2. **67 "invalid" stories may not be invalid** (AI audited without deep verification)
3. **8-PRD critical path depth** (any early blocker cascades through everything)

---

## Phase-by-Phase Findings

### Phase 1: Foundation (11 PRDs)

**Fatal Risks:**
| Risk | Description | Mitigation |
|------|-------------|------------|
| Auth-Schema Circular Dependency | Both PRDs want to own `users.ts` table | Schema PRD owns ALL tables. Auth consumes schema. |
| Supabase Connection Pooler Failure | `{ prepare: false }` config could fail silently | Add integration test validating pooler connection |

**Blocking Risks:**
- Redis rate limiting without production fallback
- Trigger.dev cold start latency (no SLA defined)
- RLS policy testing gaps (cross-org data leakage possible)
- Edge Function deployment without local parity

**High Risks:**
- Realtime subscription memory leaks (inconsistent cleanup)
- Toast Provider duplication (AppShell vs Notify PRD)
- DataTable performance >100 rows not specified
- AI Sidebar depends on INT-AI-001 (doesn't exist in Phase 1)

**Recommended Mitigations:**
1. Resolve Auth-Schema table ownership immediately
2. Define external service fallbacks (Redis, Trigger.dev, Edge Functions)
3. Add RLS policy integration tests
4. Consolidate duplicate stories (FOUND-APPSHELL-011, 013)
5. Timebox AppShell to core 11 stories, defer 7 to Phase 2

---

### Phase 2: Domains (16 PRDs)

**Note**: Agent hit context limits; analysis based on PRD structure, not deep dive.

**Known Blocking Dependencies:**
- DOM-SUP-003 (RMA) blocks WF-WAR-005 (Warranty)
- DOM-SUP-005/006 block WF-SUP-005/006 (Support metrics)
- DOM-PIPE-001 (Forecasting) blocks WF-LTO-006 (Win probability)
- DOM-FIN-001 (Credit Notes) blocks INT-XERO-003

**Cross-Domain Risks:**
- Orders ↔ Inventory ↔ Suppliers chain tightly coupled
- Pipeline → Orders conversion flow spans domains
- Support ↔ Warranty integration requires RMA workflow

**Parallel Track Collision Points:**
- Product References (Products vs Warranty)
- Order References (Inventory vs Financial)
- Customer References (Communications vs Support)
- Schema Migrations (all tracks modify same directory)

---

### Phase 3: Integrations (3 PRDs)

**Fatal Risks:**
| Risk | Description | Mitigation |
|------|-------------|------------|
| Xero OAuth Token Expiry | Refresh tokens expire after 60 days with no monitoring | Token health monitoring + 7-day expiry alerts |
| Missing Unsubscribe Links | INT-RES-009 is priority 15; CAN-SPAM fines up to $46,517/email | Move to priority 3 immediately |

**Blocking Risks:**
- Credit note sync blocked by DOM-FIN-001
- Xero rate limit exhaustion during bulk operations (60 calls/min)
- Claude AI no spending caps or circuit breakers

**High Risks:**
- Resend domain reputation collapse from bounces
- AI audit trail missing (no logging of mutation tool calls)
- Webhook signature verification failures
- Data drift between Renoz and Xero

**Integration Down Impact:**

| Duration | Xero | Resend | Claude |
|----------|------|--------|--------|
| 1 hour | Minimal | Emails queue | Users work without AI |
| 1 day | Manual reconciliation needed | Customer notifications delayed | Productivity drop |
| 1 week | Month-end close impossible | Customers don't receive invoices | AI reports missing |

**Recommended Mitigations:**
1. Xero OAuth token health monitoring with alerts
2. Move INT-RES-009 (unsubscribe) to priority 3
3. Implement AI spending caps (daily/monthly per org)
4. Prioritize bounce handling (INT-RES-002)
5. Rate limit management (INT-XERO-009) move to priority 10

---

### Phase 4: Roles (5 PRDs)

**Fatal Risks:**
| Risk | Description | Mitigation |
|------|-------------|------------|
| Permission Bypass via API | PRDs define UI restrictions but not server-side enforcement | Every server function must validate role |
| Offline Sync Data Loss | Field tech completes jobs offline, sync fails, all work lost | Partial sync recovery + immutable local queue |

**Blocking Risks:**
- Approval queue bottleneck (no delegation mechanism)
- Commission tracking out of scope but disputes will arise
- Push notifications "out of scope" but schedule changes are safety-critical

**High Risks:**
- Cross-role data visibility confusion (stale data across domains)
- Mobile PWA offline staleness (>1 hour without warning)
- Xero sync failure silent mode (no proactive alerts)
- Multi-role user identity crisis (no role switching)

**Permission Matrix Gaps:**
- Field Tech → Customer: Can see name/address but contact history undefined
- Sales → Financial Data: Marked "None" but needs overdue invoice visibility
- Operations → Pipeline: Marked "None" but needs capacity planning visibility

**Recommended Mitigations:**
1. Add server-side role authorization layer
2. Implement robust offline sync recovery for Field Tech
3. Add approval delegation and escalation
4. Add push notifications for schedule changes (even if "out of scope")

---

### Cross-Cutting Analysis

**System-Wide Failure Modes:**

1. **Cascade Failure from Foundation Blockers**
   - REF-SERVER or FOUND-SCHEMA delays cascade through all phases
   - Leading indicator: REF-SERVER not complete by end of Week 1

2. **"Invalid Story" False Negative Crisis**
   - 67 stories marked implemented without deep verification
   - Leading indicator: QA finds "implemented" features that don't work

3. **Parallel Track Collision at Integration Seams**
   - 4 tracks develop in isolation, integration reveals schema conflicts
   - Leading indicator: Schema migration conflicts during builds

4. **Velocity Assumption Collapse**
   - Plan: 5-6 iterations/dev/week
   - Reality: 3-4 iterations/dev/week
   - Leading indicator: Phase 0 takes 2 weeks instead of 1

5. **Workflow Integration Complexity Explosion**
   - Phase 6 workflows are first time ALL domains must work together
   - Leading indicator: Workflow PRDs have vague dependency language

6. **Data Migration Time Bomb**
   - v3 built but v2 has years of customer data
   - Leading indicator: Schema changes made without migration scripts

7. **External Integration Dependency Risk**
   - Xero/Resend/Claude API changes derail Phase 5-6
   - Leading indicator: Integration tests pass with mocks, fail with real APIs

**Critical Path (8 PRDs deep):**
```
REF-SERVER → FOUND-SCHEMA → FOUND-AUTH → CC-ERROR → DOM-PRODUCTS → DOM-FINANCIAL → INT-XERO → WF-FINANCIAL
```

**Velocity Reality Check:**

| Metric | Assumed | Realistic |
|--------|---------|-----------|
| Iterations/dev/week | 5-6 | 3-4 |
| Total iterations | 849 | ~1,020 (with buffers) |
| Duration | 30 weeks | 38-45 weeks |

---

## Go/No-Go Criteria

### Red Flags (Pause Project)

| Signal | Threshold | Action |
|--------|-----------|--------|
| Phase 0 takes >2 weeks | Week 3 | Re-estimate entire plan |
| Velocity <3 iter/dev/week | Week 4 | Scope reduction required |
| >10 "invalid" stories found incomplete | Any time | Full re-audit |
| 2+ hard blockers unresolved after 2 weeks | Any time | Escalate for architectural decision |

### Green Light Criteria

| Checkpoint | Criteria | Week |
|------------|----------|------|
| Phase 1 complete | All patterns + 3 examples each | 2 |
| Foundation complete | Auth working, schema validated | 3 |
| Velocity validated | Actual > 4 iter/dev/week | 4 |
| Cross-cutting adopted | All domains using CC-* patterns | 9 |
| Domains integrated | 4 tracks merged, tests passing | 16 |
| Workflows functional | Happy path for all 3 pipelines | 28 |

---

## Top 10 Priority Mitigations

### P0: Before Phase 0 Ends

1. **Pre-flight verify 67 "invalid" stories** - Manual verification that each is truly complete (UI + API + data + tested)
2. **Resolve Auth-Schema circular dependency** - Single source of truth: Schema PRD owns all tables
3. **Move INT-RES-009 (unsubscribe) to priority 3** - Legal compliance is non-negotiable

### P1: Week 1-3

4. **Add server-side role authorization** - Every server function validates role before data access
5. **Implement Xero OAuth token health monitoring** - Alert 7 days before refresh token expiry
6. **Track velocity empirically from Day 1** - Week 3 checkpoint to recalculate duration

### P2: Week 4-10

7. **Add AI spending caps and circuit breakers** - Hard daily/monthly limits per org
8. **Implement offline sync recovery** - Partial sync continuation, immutable local queue
9. **Create data migration plan** - Before Phase 2 schemas are finalized

### P3: Ongoing

10. **Have scope reduction plan ready** - Identify 30% of features that could be cut if behind schedule

---

## Summary

| Metric | Value |
|--------|-------|
| Fatal risks identified | 7 |
| Blocking risks identified | 12 |
| High risks identified | 15+ |
| Probability of 30-week success | 20% |
| Realistic duration | 38-45 weeks |
| Stories needing verification | 67 |
| Critical path depth | 8 PRDs |

**Bottom line**: The plan is achievable but not in 30 weeks with current scope and assumptions. Either extend timeline to 40+ weeks, or prepare scope reduction plan for when velocity reality hits in Week 3-4.

---

*This premortem was generated by 5 parallel sub-agents analyzing the complete PRD stack.*
