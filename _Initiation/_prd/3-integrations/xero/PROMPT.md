# Ralph Loop: Xero Accounting Integration

## Objective
Implement comprehensive Xero accounting integration providing bidirectional contact sync, invoice synchronization, credit note management, webhook handling, sync error management, history tracking, bulk operations, and accounting dashboard for financial data consistency.

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

## Current State
Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with INT-XERO-001-A.

## Required Reading

> **IMPORTANT:** These patterns are MANDATORY for all story implementations in this domain.

| Pattern | File | Applies To | Key Requirements |
|---------|------|------------|------------------|
| Testing Standards | `_Initiation/_meta/patterns/testing-standards.md` | All stories | TDD flow, 80% server coverage, mock Xero API |
| Error Recovery | `_Initiation/_meta/patterns/error-recovery.md` | **ALL stories (PRIMARY)** | Pattern 1: Exponential backoff, dead letter queue, 5 retries. Pattern 5: Payment idempotency |
| Performance | `_Initiation/_meta/patterns/performance-benchmarks.md` | Bulk ops, Dashboard UI | Handle Year 3 volumes (6000 invoices), dashboard <1s |
| 3-Click Rule | `_Initiation/_meta/patterns/ux-3-click-rule.md` | Dashboard, Error UI | Sync Now (1 click), error retry accessible |

## Context

### PRD File
- `opc/_Initiation/_prd/3-integrations/xero.prd.json` - Complete Xero integration specification (note: at integrations root, not xero/ subdirectory)

### Reference Files
- Project root: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/renoz-v3/`
- Stack: TanStack Start + Bun + React 19 + Supabase + Drizzle ORM + shadcn/ui
- Foundation PROMPT: `opc/_Initiation/_prd/foundation/PROMPT.md`

### Tech Stack
- **Runtime**: Bun
- **Framework**: TanStack Start (file-router)
- **Auth**: Supabase Auth
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack Table
- **State Management**: TanStack Query
- **External**: Xero Accounting API, Trigger.dev for background jobs

## Process

1. **Read progress.txt** to find current story
2. **Read the PRD** for story acceptance criteria
3. **Reference wireframes** from `opc/_Initiation/_prd/_wireframes/integrations/INT-XERO-*` (if available)
4. **Implement the acceptance criteria** completely
5. **Run verification**:
   ```bash
   cd renoz-v3 && bun run typecheck && bun run test
   ```
6. **If all criteria pass**:
   - Mark story `[x]` in progress.txt
   - Output `<promise>STORY_ID_COMPLETE</promise>`
   - Move to next story
7. **If criteria fail**:
   - Debug and fix
   - Stay on current story (max 3 iterations per fix attempt)

## Story Execution Order

Execute stories in dependency order from xero.prd.json:

### Phase 1: Contact Sync (INT-XERO-CONTACTS)
1. **INT-XERO-001-A** - Pull Contacts from Xero
   - Creates: Contact sync server functions, initial import logic
   - Promise: `INT_XERO_001_A_COMPLETE`

2. **INT-XERO-001-B** - Contact Matching and Import UI
   - Creates: Contact matching interface, import management UI
   - Promise: `INT_XERO_001_B_COMPLETE`

### Phase 2: Invoice Sync (INT-XERO-INVOICES)
3. **INT-XERO-002-A** - Automatic Invoice Push on Ship
   - Creates: Invoice creation trigger, push automation
   - Promise: `INT_XERO_002_A_COMPLETE`

4. **INT-XERO-002-B** - Partial Payment and Invoice UI Polish
   - Creates: Payment tracking, invoice management UI
   - Promise: `INT_XERO_002_B_COMPLETE`

### Phase 3: Credit Notes (INT-XERO-CREDIT)
5. **INT-XERO-003-A** - Credit Notes Schema
   - Creates: Credit note database schema
   - Promise: `INT_XERO_003_A_COMPLETE`

6. **INT-XERO-003-B** - Credit Note Xero Sync
   - Creates: Credit note sync logic
   - Promise: `INT_XERO_003_B_COMPLETE`

7. **INT-XERO-003-C** - Credit Note Sync UI
   - Creates: Credit note management interface
   - Promise: `INT_XERO_003_C_COMPLETE`

### Phase 4: Webhooks & Logging (INT-XERO-WEBHOOKS)
8. **INT-XERO-004-A** - Webhook Logs Schema and Capture
   - Creates: Webhook event logging schema
   - Promise: `INT_XERO_004_A_COMPLETE`

9. **INT-XERO-004-B** - Webhook Logs UI and Retry
   - Creates: Webhook logs dashboard, retry functionality
   - Promise: `INT_XERO_004_B_COMPLETE`

### Phase 5: Error Management (INT-XERO-ERRORS)
10. **INT-XERO-005-A** - Sync Errors Schema and Capture
    - Creates: Error tracking schema
    - Promise: `INT_XERO_005_A_COMPLETE`

11. **INT-XERO-005-B** - Sync Errors UI
    - Creates: Error dashboard, resolution interface
    - Promise: `INT_XERO_005_B_COMPLETE`

### Phase 6: Sync History (INT-XERO-HISTORY)
12. **INT-XERO-006-A** - Sync Logs Schema and Capture
    - Creates: Sync history schema
    - Promise: `INT_XERO_006_A_COMPLETE`

13. **INT-XERO-006-B** - Sync History UI
    - Creates: History dashboard, activity tracking
    - Promise: `INT_XERO_006_B_COMPLETE`

### Phase 7: Bulk Operations (INT-XERO-BULK)
14. **INT-XERO-007-A** - Bulk Sync Progress Tracking Server
    - Creates: Progress tracking functions, job management
    - Promise: `INT_XERO_007_A_COMPLETE`

15. **INT-XERO-007-B** - Bulk Sync Progress UI
    - Creates: Progress dashboard, batch operation UI
    - Promise: `INT_XERO_007_B_COMPLETE`

### Phase 8: Dashboard & Management (INT-XERO-DASHBOARD)
16. **INT-XERO-008** - Xero Dashboard Widget
    - Creates: Dashboard widget, status summary
    - Promise: `INT_XERO_008_COMPLETE`

17. **INT-XERO-009** - Xero Rate Limit Management
    - Creates: Rate limit tracking, throttling logic
    - Promise: `INT_XERO_009_COMPLETE`

## Wireframe References

Integration wireframes follow the naming pattern `INT-XERO-*`:

| Wireframe | Story | Purpose |
|-----------|-------|---------|
| INT-XERO-001 | INT-XERO-001-B | Contact matching interface |
| INT-XERO-002 | INT-XERO-002-B | Invoice management UI |
| INT-XERO-003 | INT-XERO-003-C | Credit note management |
| INT-XERO-004 | INT-XERO-004-B | Webhook logs dashboard |
| INT-XERO-005 | INT-XERO-005-B | Sync errors dashboard |
| INT-XERO-006 | INT-XERO-006-B | Sync history dashboard |
| INT-XERO-007 | INT-XERO-007-B | Bulk sync progress |
| INT-XERO-008 | INT-XERO-008 | Dashboard widget |
| INT-XERO-009 | INT-XERO-009 | Rate limit management |

Wireframes are located in: `opc/_Initiation/_prd/_wireframes/integrations/`

## Completion Promise

When ALL Xero integration stories pass successfully:
```xml
<promise>INT_XERO_COMPLETE</promise>
```

## Constraints

### DO
- Follow TanStack Start file-router conventions
- Use `src/` directory structure for all files
- Create Drizzle migrations for all schema changes
- Use Zod for all validation schemas
- Follow shadcn/ui patterns for components
- Write TypeScript with strict types
- Implement RLS policies for organization isolation
- Run `bun run typecheck` after each story
- Reference wireframes for UI/UX compliance
- Use Xero SDK for API interactions
- Implement rate limit awareness (60 calls/minute)
- Use Trigger.dev for background job scheduling

### DO NOT
- Modify files outside Xero integration scope
- Skip acceptance criteria from PRD
- Use client-side validation alone (always server-side)
- Create components that duplicate shadcn/ui
- Hardcode API keys or configuration values
- Create database tables without migrations
- Bypass RLS policies for performance
- Exceed Xero rate limits without throttling

## File Structure

Xero integration files follow this structure:

```
renoz-v3/
├── src/
│   ├── lib/
│   │   ├── schema/
│   │   │   ├── xero-contacts.ts
│   │   │   ├── xero-invoices.ts
│   │   │   ├── xero-credit-notes.ts
│   │   │   ├── xero-sync-logs.ts
│   │   │   ├── xero-errors.ts
│   │   │   ├── xero-webhooks.ts
│   │   │   └── index.ts
│   │   └── server/
│   │       ├── functions/
│   │       │   ├── xero-contacts.ts
│   │       │   ├── xero-invoices.ts
│   │       │   ├── xero-credit-notes.ts
│   │       │   ├── xero-sync.ts
│   │       │   ├── xero-webhooks.ts
│   │       │   ├── xero-errors.ts
│   │       │   ├── xero-rate-limits.ts
│   │       │   └── index.ts
│   │       └── schemas/
│   │           └── xero.ts
│   ├── contexts/
│   │   └── xero-context.tsx
│   ├── hooks/
│   │   ├── use-xero-sync.ts
│   │   ├── use-xero-contacts.ts
│   │   ├── use-xero-invoices.ts
│   │   ├── use-xero-errors.ts
│   │   └── use-xero-rate-limits.ts
│   ├── components/
│   │   └── integrations/
│   │       └── xero/
│   │           ├── contact-sync-manager.tsx
│   │           ├── contact-matching.tsx
│   │           ├── invoice-sync-manager.tsx
│   │           ├── credit-note-manager.tsx
│   │           ├── webhook-logs-dashboard.tsx
│   │           ├── sync-errors-dashboard.tsx
│   │           ├── sync-history-dashboard.tsx
│   │           ├── bulk-sync-progress.tsx
│   │           ├── xero-dashboard-widget.tsx
│   │           ├── rate-limit-manager.tsx
│   │           └── ... (other components)
│   └── routes/
│       └── _authed/
│           └── xero/
│               ├── contacts.tsx
│               ├── invoices.tsx
│               ├── credit-notes.tsx
│               ├── webhooks.tsx
│               ├── errors.tsx
│               ├── history.tsx
│               ├── bulk-sync.tsx
│               └── settings.tsx
└── drizzle/
    └── migrations/
        └── 022_xero-integration.ts
```

## Key Success Metrics

- Contacts syncing bidirectionally
- Invoices automatically pushing on shipment
- Credit notes creating and syncing correctly
- Webhooks receiving and processing events
- Sync errors tracking and surfacing
- Sync history recording all activity
- Bulk operations executing reliably
- Dashboard widget displaying status
- Rate limit management preventing overages
- Zero TypeScript errors
- All tests passing
- Performance targets met:
  - Contact sync < 5s per contact
  - Invoice push < 2s per invoice
  - Credit note sync < 2s per note
  - Webhook processing < 1s
  - Bulk operations < 30s for 100 items

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - Xero API authentication → Verify OAuth flow configuration
  - Rate limiting → Check Xero API limit headers and throttling
  - TypeScript type inference → Check Drizzle $inferSelect patterns
  - RLS policy conflicts → Verify policy SQL syntax
  - Webhook signature verification → Check Xero SDK implementation
  - Trigger.dev job scheduling → Verify job configuration

## Progress Template

```markdown
# Xero Accounting Integration Progress
# Started: [DATE]
# Updated: [DATE]

## Stories
- [ ] INT-XERO-001-A: Pull Contacts from Xero
- [ ] INT-XERO-001-B: Contact Matching and Import UI
- [ ] INT-XERO-002-A: Automatic Invoice Push on Ship
- [ ] INT-XERO-002-B: Partial Payment and Invoice UI Polish
- [ ] INT-XERO-003-A: Credit Notes Schema
- [ ] INT-XERO-003-B: Credit Note Xero Sync
- [ ] INT-XERO-003-C: Credit Note Sync UI
- [ ] INT-XERO-004-A: Webhook Logs Schema and Capture
- [ ] INT-XERO-004-B: Webhook Logs UI and Retry
- [ ] INT-XERO-005-A: Sync Errors Schema and Capture
- [ ] INT-XERO-005-B: Sync Errors UI
- [ ] INT-XERO-006-A: Sync Logs Schema and Capture
- [ ] INT-XERO-006-B: Sync History UI
- [ ] INT-XERO-007-A: Bulk Sync Progress Tracking Server
- [ ] INT-XERO-007-B: Bulk Sync Progress UI
- [ ] INT-XERO-008: Xero Dashboard Widget
- [ ] INT-XERO-009: Xero Rate Limit Management

## Current Story
[STORY-ID]: [Story Name]

## Iteration Count
Total: 0
Current Story: 0

## Blockers
None

## Notes
- [Story notes and learnings]
```

---

---

## Premortem Remediation

**Source:** `_meta/remediation-xero-integration.md`
**Applied:** 2026-01-17

### Critical Risks Addressed

The premortem analysis identified these risks that have been remediated with new stories:

#### 1. Rate Limiting (INT-XERO-009)
- **Risk:** Xero API rate limits (60 calls/minute) causing sync failures during bulk operations
- **Solution:** Redis-based rate limiter with proactive throttling at 55 calls and exponential backoff
- **Files Created:** `src/lib/xero/rate-limiter.ts`, `src/lib/xero/types.ts`

#### 2. Circuit Breaker (INT-XERO-010)
- **Risk:** Sync failure cascades affecting payment reconciliation when Xero is unavailable
- **Solution:** Circuit breaker pattern: CLOSED -> OPEN (5 failures) -> HALF_OPEN (30s) -> CLOSED
- **Files Created:** `src/lib/xero/circuit-breaker.ts`

#### 3. Job Queue (INT-XERO-011)
- **Risk:** Missing retry strategy and durable execution for sync operations
- **Solution:** Trigger.dev jobs with priority handling and rate limit awareness
- **Files Created:**
  - `src/lib/xero/queue.ts`
  - `trigger/jobs/xero/sync-invoice.ts`
  - `trigger/jobs/xero/sync-contact.ts`
  - `trigger/jobs/xero/batch-sync.ts`

#### 4. Webhook Security (INT-XERO-012)
- **Risk:** Webhook endpoint vulnerable to spoofed events
- **Solution:** HMAC-SHA256 signature verification with timing-safe comparison
- **Files Created:** `src/lib/xero/webhook-verifier.ts`

#### 5. Webhook Processing (INT-XERO-013)
- **Risk:** Revenue recognition timing conflicts with async Xero events
- **Solution:** Async event processing with INVOICE.PAID triggering revenue recognition
- **Files Created:** `src/server/api/webhooks/xero.ts`, `src/lib/xero/webhook-processor.ts`

### New Database Tables

From remediation:
- `xero_webhook_logs` - Webhook event logging for debugging (INT-XERO-004-A)
- `xero_sync_errors` - Sync error tracking and resolution (INT-XERO-005-A)
- `xero_sync_logs` - Sync operation history and audit trail (INT-XERO-006-A)

### Success Criteria (Updated)

Original criteria plus:
- **Rate Limit Compliance:** Zero 429 errors under normal load
- **Sync Reliability:** >99% sync success rate within 5 retries
- **Circuit Breaker Effectiveness:** Cascade failures prevented during Xero outages
- **Webhook Latency:** Payment status updates within 30 seconds of Xero event
- **Error Visibility:** All sync errors surfaced in UI within 1 minute
- **Recovery Time:** Manual resync restores consistency within 5 minutes

### Implementation Order

Execute remediation stories in this order (after core Xero stories):

1. **INT-XERO-009** - Rate Limiter Infrastructure (2 iterations)
2. **INT-XERO-010** - Circuit Breaker Pattern (2 iterations)
3. **INT-XERO-011** - Job Queue with Trigger.dev (4 iterations)
4. **INT-XERO-012** - Webhook Signature Verification (1 iteration)
5. **INT-XERO-013** - Webhook Endpoint and Processor (3 iterations)
6. **INT-XERO-014** - Resilience UI Dashboard (3 iterations)

**Total Additional Effort:** 15 iterations

### Coordination with Financial Domain

Revenue recognition timing is critical:
1. Milestone completed -> Local recognition record created (state: RECOGNIZED)
2. Xero sync queued (LOW priority) -> State: SYNCING
3. Xero confirms -> State: SYNCED
4. If sync fails 5x -> State: MANUAL_OVERRIDE -> Alert finance team

See `DOM-FIN-008b` (Recognition Engine) for the state machine implementation.

---

## Error Recovery Patterns

This integration uses patterns from the central error recovery documentation.

**Reference:** `opc/_Initiation/_meta/patterns/error-recovery.md`

### Applicable Patterns

#### Pattern 1: Sync Failure Recovery
Used for all Xero API synchronization operations (contacts, invoices, credit notes).

```
Retry Schedule:
- Attempt 1: Immediate
- Attempt 2: 30 seconds
- Attempt 3: 2 minutes
- Attempt 4: 15 minutes
- Attempt 5: 1 hour
- After 5 failures: Dead letter queue + alert finance team
```

Key implementations:
- Contact sync failures → `xero_sync_errors` table
- Invoice push failures → Retry via Trigger.dev jobs
- Credit note sync failures → Same retry pattern

UI states:
- "Sync pending" -> "Sync failed - retrying" -> "Manual intervention required"

#### Pattern 5: Payment Processing Failure
Used for Xero payment synchronization and reconciliation.

```
Strategy: Idempotent retry with payment_reference
- Generate reference BEFORE Xero API call
- Use reference as idempotency key
- On timeout: Check Xero for existing transaction
- Never create duplicate payments
```

Key implementations:
- Invoice payment sync uses unique reference
- Partial payment tracking with idempotent updates
- Payment status: pending -> processing -> completed/failed

### Integration with Resilience Infrastructure

The error recovery patterns work alongside:
- **INT-XERO-009**: Rate Limiter - Prevents 429 errors before retry needed
- **INT-XERO-010**: Circuit Breaker - Fails fast during Xero outages
- **INT-XERO-011**: Job Queue - Orchestrates retries via Trigger.dev

Dead letter items appear in:
- Sync Errors Dashboard (INT-XERO-005-B)
- With "Retry" and "Mark Resolved" actions

---

**Document Version:** 1.2
**Created:** 2026-01-11
**Updated:** 2026-01-17 (Premortem remediation applied, error recovery patterns added)
**Target:** renoz-v3 Xero Accounting Integration
**Completion Promise:** INT_XERO_COMPLETE
