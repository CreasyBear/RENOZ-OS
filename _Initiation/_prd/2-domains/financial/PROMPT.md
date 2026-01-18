# Ralph Loop: Financial Domain Phase

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. Do NOT create local formatCurrency functions or duplicate UI patterns.

## Objective
Build the Financial domain for renoz-v3: credit notes, payment plans, AR aging reports, customer statements, Xero invoice sync, payment reminders, financial dashboard enhancements, and revenue recognition. This domain manages the financial lifecycle from invoice creation through payment reconciliation and accounting sync for Renoz Energy's Australian B2B battery sales business.

## Current State
Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with DOM-FIN-001a.

## Context

### PRD File
- `opc/_Initiation/_prd/2-domains/financial/financial.prd.json`

### Wireframe Index
- `./wireframes/index.md`

### Individual Wireframes (UI stories only)
| Story | Wireframe |
|-------|-----------|
| DOM-FIN-001c | `./wireframes/FIN-001c.wireframe.md` |
| DOM-FIN-002c | `./wireframes/FIN-002c.wireframe.md` |
| DOM-FIN-003b | `./wireframes/FIN-003b.wireframe.md` |
| DOM-FIN-004c | `./wireframes/FIN-004c.wireframe.md` |
| DOM-FIN-005b | `./wireframes/FIN-005b.wireframe.md` |
| DOM-FIN-006c | `./wireframes/FIN-006c.wireframe.md` |
| DOM-FIN-007b | `./wireframes/FIN-007b.wireframe.md` |
| DOM-FIN-008c | `./wireframes/FIN-008c.wireframe.md` |

### Reference Files
- Project root: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/renoz-v3/`
- Stack: TanStack Start + Bun + React 19 + Supabase + Drizzle ORM + shadcn/ui

### Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD only with 10% GST
- **Payment Terms**: 30-day default
- **Customer Types**: Residential ($5K-$20K orders), Commercial ($50K-$500K orders with 50% deposit option)
- **Financial Truth**: Xero is source of truth for accounting

---

## Story Execution Order

### CRITICAL: Dependencies Must Be Respected

The Financial domain has a strict dependency chain. Each feature has three stories:
1. **Schema (a)**: Database table creation - NO dependencies on other Financial stories
2. **Server Functions (b)**: CRUD operations - DEPENDS ON corresponding schema story
3. **UI Components (c)**: User interface - DEPENDS ON corresponding server functions story

### Execution Phases

#### Phase 1: Schema Stories (Can Run in Parallel)
These 7 schema stories have NO dependencies on each other and can theoretically run in parallel:

| Story ID | Name | Creates Table(s) |
|----------|------|------------------|
| DOM-FIN-001a | Credit Notes Schema | `credit_notes` |
| DOM-FIN-002a | Payment Plans Schema | `payment_schedules` |
| DOM-FIN-004a | Customer Statements Schema | `statement_history` |
| DOM-FIN-006a | Payment Reminders Schema | `reminder_templates`, `reminder_history` |
| DOM-FIN-008a | Revenue Recognition Schema | `revenue_recognition`, `deferred_revenue` |

Note: DOM-FIN-003a (AR Aging) and DOM-FIN-005a (Xero Sync) and DOM-FIN-007a (Dashboard) do NOT create tables - they compute from existing data.

#### Phase 2: Server Function Stories (Sequential Dependencies)

| Story ID | Name | Depends On |
|----------|------|------------|
| DOM-FIN-001b | Credit Notes Server Functions | DOM-FIN-001a |
| DOM-FIN-002b | Payment Plans Server Functions | DOM-FIN-002a |
| DOM-FIN-003a | AR Aging Server Function | (no schema - uses orders) |
| DOM-FIN-004b | Customer Statements Server Functions | DOM-FIN-004a |
| DOM-FIN-005a | Xero Invoice Sync - Server | (no schema - uses orders) |
| DOM-FIN-006b | Auto Reminders Backend | DOM-FIN-006a |
| DOM-FIN-007a | Financial Dashboard - Server | DOM-FIN-003a |
| DOM-FIN-008b | Recognition Engine | DOM-FIN-008a |

**Note**: DOM-FIN-008a depends on DOM-FIN-005a (Xero sync needed for revenue recognition)

#### Phase 3: UI Component Stories (Each Depends on Server Functions)

| Story ID | Name | Depends On | Wireframe |
|----------|------|------------|-----------|
| DOM-FIN-001c | Credit Notes UI | DOM-FIN-001b | YES |
| DOM-FIN-002c | Payment Plans UI | DOM-FIN-002b | YES |
| DOM-FIN-003b | AR Aging Report UI | DOM-FIN-003a | YES |
| DOM-FIN-004c | Customer Statements UI | DOM-FIN-004b | YES |
| DOM-FIN-005b | Xero Invoice Sync - UI | DOM-FIN-005a | YES |
| DOM-FIN-006c | Reminders UI | DOM-FIN-006b | YES |
| DOM-FIN-007b | Financial Dashboard - UI | DOM-FIN-007a | YES |
| DOM-FIN-008c | Revenue Reports UI | DOM-FIN-008b | YES |

---

## Recommended Execution Order

**Execute stories in this order to respect all dependencies:**

```
1.  DOM-FIN-001a - Credit Notes Schema
2.  DOM-FIN-002a - Payment Plans Schema  
3.  DOM-FIN-004a - Customer Statements Schema
4.  DOM-FIN-006a - Payment Reminders Schema
5.  DOM-FIN-001b - Credit Notes Server Functions
6.  DOM-FIN-002b - Payment Plans Server Functions
7.  DOM-FIN-003a - AR Aging Server Function
8.  DOM-FIN-004b - Customer Statements Server Functions
9.  DOM-FIN-005a - Xero Invoice Sync - Server
10. DOM-FIN-006b - Auto Reminders Backend
11. DOM-FIN-007a - Financial Dashboard - Server (needs 003a)
12. DOM-FIN-008a - Revenue Recognition Schema (needs 005a)
13. DOM-FIN-008b - Recognition Engine
14. DOM-FIN-001c - Credit Notes UI (wireframe: DOM-FIN-001c.wireframe.md)
15. DOM-FIN-002c - Payment Plans UI (wireframe: DOM-FIN-002c.wireframe.md)
16. DOM-FIN-003b - AR Aging Report UI (wireframe: DOM-FIN-003b.wireframe.md)
17. DOM-FIN-004c - Customer Statements UI (wireframe: DOM-FIN-004c.wireframe.md)
18. DOM-FIN-005b - Xero Invoice Sync - UI (wireframe: DOM-FIN-005b.wireframe.md)
19. DOM-FIN-006c - Reminders UI (wireframe: DOM-FIN-006c.wireframe.md)
20. DOM-FIN-007b - Financial Dashboard - UI (wireframe: DOM-FIN-007b.wireframe.md)
21. DOM-FIN-008c - Revenue Reports UI (wireframe: DOM-FIN-008c.wireframe.md)
```

---

## Process

1. **Read progress.txt** to find current story
2. **Read the PRD** for story acceptance criteria
3. **For UI stories**: Read the corresponding wireframe file
4. **Implement the acceptance criteria** completely
5. **Run verification**:
   ```bash
   cd renoz-v3 && bun run typecheck && bun run test
   ```
6. **If all criteria pass**:
   - Mark story `[x]` in progress.txt
   - Output `<promise>STORY_ID_COMPLETE</promise>` (use the completion_promise from PRD)
   - Move to next story
7. **If criteria fail**:
   - Debug and fix
   - Stay on current story (max 3 iterations per fix attempt)

---

## Domain-Specific Constraints

### DO
- Store all monetary amounts in AUD cents (e.g., $1,500.00 = 150000)
- Apply 10% GST on all invoices
- Follow 30-day payment terms as default
- Use Xero as source of financial truth - sync TO Xero, not FROM
- Distinguish residential vs commercial accounts (commercial = $50K+ orders)
- Create Drizzle migrations for all schema changes
- Use Zod for all validation schemas
- Follow RE-UI and shadcn/ui patterns per wireframes
- Use DataGrid for list views, Dialog/Sheet for forms
- Implement proper loading skeletons and empty states
- Ensure WCAG 2.1 AA accessibility compliance

### DO NOT
- Use multi-currency (AUD only)
- Create complex tax calculations beyond 10% GST
- Modify files outside financial domain scope
- Skip acceptance criteria
- Implement bank reconciliation (Xero handles this)
- Create duplicate UI components - use existing patterns

### File Structure
```
renoz-v3/
├── src/
│   ├── routes/_authed/financial/
│   │   ├── index.tsx                    # Dashboard (DOM-FIN-007b)
│   │   ├── credit-notes/
│   │   │   ├── index.tsx                # Credit notes list (DOM-FIN-001c)
│   │   │   └── $creditNoteId.tsx        # Credit note detail
│   │   ├── invoices/
│   │   │   └── $invoiceId/
│   │   │       ├── schedule.tsx         # Payment schedule (DOM-FIN-002c)
│   │   │       ├── reminders.tsx        # Reminder history (DOM-FIN-006c)
│   │   │       └── xero.tsx             # Xero sync (DOM-FIN-005b)
│   │   ├── statements/
│   │   │   └── bulk.tsx                 # Bulk generation (DOM-FIN-004c)
│   │   └── reports/
│   │       ├── aging.tsx                # AR aging (DOM-FIN-003b)
│   │       ├── recognition.tsx          # Revenue recognition (DOM-FIN-008c)
│   │       └── deferred.tsx             # Deferred revenue (DOM-FIN-008c)
│   ├── components/domain/financial/
│   │   ├── credit-notes/
│   │   ├── payment-plans/
│   │   ├── reports/
│   │   ├── statements/
│   │   ├── xero/
│   │   ├── reminders/
│   │   ├── dashboard/
│   │   └── widgets/
│   ├── lib/
│   │   ├── schema/
│   │   │   └── financial.ts             # Credit notes, payment schedules, etc.
│   │   └── schemas/
│   │       └── financial.ts             # Zod validation schemas
│   └── server/functions/
│       └── financial.ts                 # Server functions
└── drizzle/
    └── schema/                          # Migration files
```

---

## External Dependencies

### Required Before Financial Domain
- **schema-foundation**: Base tables (organizations, users, customers, orders)
- **DOM-ORD (Orders)**: Financial depends on orders for invoicing

### What Financial Enables
- **WF-INV (Invoicing Workflow)**: Uses credit notes and payment plans
- **DOM-REPORTS (Reports)**: Uses financial metrics and AR aging data

---

## Completion

When ALL financial stories pass:
```xml
<promise>FINANCIAL_DOMAIN_COMPLETE</promise>
```

---

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - TypeScript type inference issues -> Check Drizzle $inferSelect patterns
  - Supabase RLS conflicts -> Verify policy SQL syntax
  - Import errors -> Check TanStack Start path aliases
  - Wireframe mismatch -> Re-read wireframe file for exact component structure

---

## Progress Template

```markdown
# Financial Domain Progress
# Started: [DATE]
# Updated: [DATE]

## Stories
### Phase 1: Schema
- [ ] DOM-FIN-001a: Credit Notes Schema
- [ ] DOM-FIN-002a: Payment Plans Schema
- [ ] DOM-FIN-004a: Customer Statements Schema
- [ ] DOM-FIN-006a: Payment Reminders Schema

### Phase 2: Server Functions
- [ ] DOM-FIN-001b: Credit Notes Server Functions
- [ ] DOM-FIN-002b: Payment Plans Server Functions
- [ ] DOM-FIN-003a: AR Aging Server Function
- [ ] DOM-FIN-004b: Customer Statements Server Functions
- [ ] DOM-FIN-005a: Xero Invoice Sync - Server
- [ ] DOM-FIN-006b: Auto Reminders Backend
- [ ] DOM-FIN-007a: Financial Dashboard - Server
- [ ] DOM-FIN-008a: Revenue Recognition Schema
- [ ] DOM-FIN-008b: Recognition Engine

### Phase 3: UI Components
- [ ] DOM-FIN-001c: Credit Notes UI
- [ ] DOM-FIN-002c: Payment Plans UI
- [ ] DOM-FIN-003b: AR Aging Report UI
- [ ] DOM-FIN-004c: Customer Statements UI
- [ ] DOM-FIN-005b: Xero Invoice Sync - UI
- [ ] DOM-FIN-006c: Reminders UI
- [ ] DOM-FIN-007b: Financial Dashboard - UI
- [ ] DOM-FIN-008c: Revenue Reports UI

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

## Premortem Remediation

**Source:** `_meta/remediation-xero-integration.md`
**Applied:** 2026-01-17

### Revenue Recognition Timing with Xero

The premortem analysis identified a critical timing risk: revenue recognition could conflict with Xero sync failures. This has been addressed by updating DOM-FIN-008a and DOM-FIN-008b.

#### State Machine for Revenue Recognition

Revenue recognition records now track Xero sync state:

```
PENDING ──> RECOGNIZED ──> SYNCING ──> SYNCED
                              │
                              ▼
                        SYNC_FAILED ──> (retry up to 5x)
                              │
                              ▼
                      MANUAL_OVERRIDE ──> Alert finance team
```

#### Updated Schema (DOM-FIN-008a)

The `revenue_recognition` table now includes:
- `state` - Recognition state enum (PENDING, RECOGNIZED, SYNCING, SYNCED, SYNC_FAILED, MANUAL_OVERRIDE)
- `xeroSyncAttempts` - Number of sync attempts (max 5)
- `xeroSyncError` - Last sync error message
- `lastXeroSyncAt` - Timestamp of last sync attempt

#### Updated Engine (DOM-FIN-008b)

The recognition engine now:
1. Creates local recognition record first (state: RECOGNIZED)
2. Updates deferred revenue balance locally
3. Queues Xero sync job with LOW priority (non-blocking)
4. Transitions to SYNCING while job is queued
5. `handleRecognitionSyncResult()` updates state based on job result
6. After 5 failures, transitions to MANUAL_OVERRIDE and notifies finance team

#### Integration with Xero Webhook

The Xero webhook handler (INT-XERO-013) triggers revenue recognition when:
- `INVOICE.PAID` event received
- Order has `recognitionType === 'milestone'`
- Calls `triggerRevenueRecognition()` from financial domain

#### New Dependency

DOM-FIN-008b now depends on INT-XERO-011 (Xero Job Queue) for:
- Queueing Xero sync jobs with proper priority
- Rate limiting and circuit breaker protection
- Retry with exponential backoff

### Coordination Points

| Financial Story | Xero Story | Coordination |
|-----------------|------------|--------------|
| DOM-FIN-008b | INT-XERO-011 | Uses job queue for recognition sync |
| DOM-FIN-008b | INT-XERO-013 | Webhook triggers recognition |
| DOM-FIN-005a | INT-XERO-009/010 | Invoice sync uses rate limiter + circuit breaker |

### Impact on Execution Order

DOM-FIN-008b now requires INT-XERO-011 to be complete first. Updated order:

```
Before: DOM-FIN-008a -> DOM-FIN-008b -> DOM-FIN-008c
After:  DOM-FIN-008a -> INT-XERO-011 -> DOM-FIN-008b -> DOM-FIN-008c
```

If INT-XERO-011 is not yet implemented, DOM-FIN-008b can be started but sync coordination code should be stubbed with TODO markers.

---

**Document Version:** 1.1
**Created:** 2026-01-11
**Updated:** 2026-01-17 (Premortem remediation applied)
**Target:** renoz-v3 Financial Domain Phase
