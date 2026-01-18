# Ralph Loop: Resend Email Integration

## Objective
Implement comprehensive Resend email service integration providing webhook handling, bounce/complaint management, email analytics, domain verification, batch sending, email testing, suppression list management, and status dashboards for reliable email communications.

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

## Current State
Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with INT-RES-001-A.

## Context

### PRD File
- `opc/_Initiation/_prd/3-integrations/resend/resend.prd.json` - Complete Resend integration specification

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
- **External**: Resend Email API, Trigger.dev for batch processing

## Process

1. **Read progress.txt** to find current story
2. **Read the PRD** for story acceptance criteria
3. **Reference wireframes** from `opc/_Initiation/_prd/_wireframes/integrations/INT-RES-*` (if available)
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

Execute stories in dependency order from resend.prd.json:

### Phase 1: Webhooks & Event Handling (INT-RES-WEBHOOKS)
1. **INT-RES-001-A** - Resend Webhook Endpoint and Schema
   - Creates: Webhook endpoint, event log schema
   - Promise: `INT_RES_001_A_COMPLETE`

2. **INT-RES-001-B** - Resend Webhook Event Processing
   - Creates: Event processing logic, queue integration
   - Promise: `INT_RES_001_B_COMPLETE`

### Phase 2: Delivery & Suppression (INT-RES-DELIVERY)
3. **INT-RES-002-A** - Email Suppression Schema
   - Creates: Suppression list schema, management functions
   - Promise: `INT_RES_002_A_COMPLETE`

4. **INT-RES-002-B** - Bounce and Complaint Handling Logic
   - Creates: Bounce/complaint processing, list updates
   - Promise: `INT_RES_002_B_COMPLETE`

5. **INT-RES-002-C** - Bounce Report UI and Admin Notifications
   - Creates: Bounce dashboard, notification system
   - Promise: `INT_RES_002_C_COMPLETE`

### Phase 3: Analytics & Reporting (INT-RES-ANALYTICS)
6. **INT-RES-003-A** - Email Analytics Server Functions
   - Creates: Analytics calculation functions, data aggregation
   - Promise: `INT_RES_003_A_COMPLETE`

7. **INT-RES-003-B** - Email Analytics Dashboard Page
   - Creates: Analytics dashboard, visualization components
   - Promise: `INT_RES_003_B_COMPLETE`

### Phase 4: Domain & Configuration (INT-RES-CONFIG)
8. **INT-RES-004** - Domain Verification Status
   - Creates: Domain status checking, verification UI
   - Promise: `INT_RES_004_COMPLETE`

### Phase 5: Batch Operations (INT-RES-BATCH)
9. **INT-RES-005-A** - Batch Email Schema and Queue
   - Creates: Batch email schema, queue management
   - Promise: `INT_RES_005_A_COMPLETE`

10. **INT-RES-005-B** - Batch Email Progress UI
    - Creates: Progress tracking UI, batch monitoring
    - Promise: `INT_RES_005_B_COMPLETE`

### Phase 6: Testing & Preview (INT-RES-TESTING)
11. **INT-RES-006-A** - Email Preview API
    - Creates: Preview server functions, rendering
    - Promise: `INT_RES_006_A_COMPLETE`

12. **INT-RES-006-B** - Email Testing and Preview UI
    - Creates: Testing interface, preview components
    - Promise: `INT_RES_006_B_COMPLETE`

### Phase 7: Management & Status (INT-RES-MANAGEMENT)
13. **INT-RES-007** - Suppression List Management UI
    - Creates: List management interface, bulk operations
    - Promise: `INT_RES_007_COMPLETE`

14. **INT-RES-008** - Email Status Dashboard Widget
    - Creates: Status widget, real-time metrics
    - Promise: `INT_RES_008_COMPLETE`

15. **INT-RES-009** - Unsubscribe Management Flow
    - Creates: Unsubscribe handling, preference management
    - Promise: `INT_RES_009_COMPLETE`

## Wireframe References

Integration wireframes follow the naming pattern `INT-RES-*`:

| Wireframe | Story | Purpose |
|-----------|-------|---------|
| INT-RES-001 | INT-RES-001-B | Webhook event processing visualization |
| INT-RES-002 | INT-RES-002-C | Bounce/complaint dashboard layout |
| INT-RES-003 | INT-RES-003-B | Email analytics dashboard design |
| INT-RES-004 | INT-RES-004 | Domain verification status interface |
| INT-RES-005 | INT-RES-005-B | Batch email progress tracking UI |
| INT-RES-006 | INT-RES-006-B | Email preview/testing interface |
| INT-RES-007 | INT-RES-007 | Suppression list management |
| INT-RES-008 | INT-RES-008 | Status dashboard widget design |
| INT-RES-009 | INT-RES-009 | Unsubscribe preference center |

Wireframes are located in: `opc/_Initiation/_prd/_wireframes/integrations/`

## Completion Promise

When ALL Resend integration stories pass successfully:
```xml
<promise>INT_RESEND_COMPLETE</promise>
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
- Use Resend SDK for API interactions
- Verify webhook signatures securely
- Implement idempotency for webhook processing

### DO NOT
- Modify files outside Resend integration scope
- Skip acceptance criteria from PRD
- Use client-side validation alone (always server-side)
- Create components that duplicate shadcn/ui
- Hardcode API keys or configuration values
- Create database tables without migrations
- Bypass RLS policies for performance
- Store unencrypted sensitive data

## File Structure

Resend integration files follow this structure:

```
renoz-v3/
├── src/
│   ├── lib/
│   │   ├── schema/
│   │   │   ├── email-logs.ts
│   │   │   ├── email-webhooks.ts
│   │   │   ├── email-suppression.ts
│   │   │   ├── email-bounce.ts
│   │   │   ├── email-batch.ts
│   │   │   ├── email-analytics.ts
│   │   │   └── index.ts
│   │   └── server/
│   │       ├── functions/
│   │       │   ├── resend-webhooks.ts
│   │       │   ├── email-suppression.ts
│   │       │   ├── email-bounce.ts
│   │       │   ├── email-analytics.ts
│   │       │   ├── email-batch.ts
│   │       │   ├── email-preview.ts
│   │       │   ├── email-domain.ts
│   │       │   └── index.ts
│   │       └── schemas/
│   │           └── email.ts
│   ├── contexts/
│   │   └── email-context.tsx
│   ├── hooks/
│   │   ├── use-email-logs.ts
│   │   ├── use-email-bounce.ts
│   │   ├── use-email-analytics.ts
│   │   └── use-email-batch.ts
│   ├── components/
│   │   └── integrations/
│   │       └── resend/
│   │           ├── email-webhook-logs.tsx
│   │           ├── bounce-dashboard.tsx
│   │           ├── email-analytics-dashboard.tsx
│   │           ├── domain-verification.tsx
│   │           ├── batch-email-progress.tsx
│   │           ├── email-preview.tsx
│   │           ├── suppression-list-manager.tsx
│   │           ├── email-status-widget.tsx
│   │           ├── unsubscribe-manager.tsx
│   │           └── ... (other components)
│   └── routes/
│       └── _authed/
│           └── email/
│               ├── logs.tsx
│               ├── bounces.tsx
│               ├── analytics.tsx
│               ├── domain.tsx
│               ├── batch.tsx
│               ├── preview.tsx
│               ├── suppression.tsx
│               └── settings.tsx
└── drizzle/
    └── migrations/
        └── 021_email-integration.ts
```

## Key Success Metrics

- Webhook endpoints receiving and processing events
- Bounce/complaint handling functioning correctly
- Email analytics tracking accurately
- Domain verification status displaying properly
- Batch operations executing reliably
- Email preview rendering correctly
- Suppression list management operational
- Status dashboards updating in real-time
- Unsubscribe flows working smoothly
- Zero TypeScript errors
- All tests passing
- Performance targets met:
  - Webhook processing < 1s
  - Analytics calculation < 2s
  - Batch operations < 5s per 100 emails
  - Preview generation < 500ms

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - Webhook signature verification → Check Resend SDK implementation
  - Idempotency handling → Verify request ID tracking
  - TypeScript type inference → Check Drizzle $inferSelect patterns
  - RLS policy conflicts → Verify policy SQL syntax
  - Rate limiting → Check Resend API limits and retry logic

## Progress Template

```markdown
# Resend Email Integration Progress
# Started: [DATE]
# Updated: [DATE]

## Stories
- [ ] INT-RES-001-A: Resend Webhook Endpoint and Schema
- [ ] INT-RES-001-B: Resend Webhook Event Processing
- [ ] INT-RES-002-A: Email Suppression Schema
- [ ] INT-RES-002-B: Bounce and Complaint Handling Logic
- [ ] INT-RES-002-C: Bounce Report UI and Admin Notifications
- [ ] INT-RES-003-A: Email Analytics Server Functions
- [ ] INT-RES-003-B: Email Analytics Dashboard Page
- [ ] INT-RES-004: Domain Verification Status
- [ ] INT-RES-005-A: Batch Email Schema and Queue
- [ ] INT-RES-005-B: Batch Email Progress UI
- [ ] INT-RES-006-A: Email Preview API
- [ ] INT-RES-006-B: Email Testing and Preview UI
- [ ] INT-RES-007: Suppression List Management UI
- [ ] INT-RES-008: Email Status Dashboard Widget
- [ ] INT-RES-009: Unsubscribe Management Flow

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

## Error Recovery Patterns

This integration uses patterns from the central error recovery documentation.

**Reference:** `opc/_Initiation/_meta/patterns/error-recovery.md`

### Applicable Pattern

#### Pattern 4: Email Send Failure
Used for all email sending operations via Resend.

```
Queue with Status Tracking:
- On send: Status = "queued"
- On API call: Status = "sending"
- On webhook success: Status = "delivered"
- On webhook bounce: Status = "bounced"
- On failure: Retry up to 4 times

Retry Schedule:
- Attempt 1: Immediate
- Attempt 2: 5 minutes
- Attempt 3: 30 minutes
- Attempt 4: 1 hour
- After 4 failures: Status = "failed_permanent", notify user
```

### Implementation by Story

| Story | Pattern Application |
|-------|---------------------|
| INT-RES-001-A | Webhook schema includes status tracking |
| INT-RES-001-B | Event processing updates status based on webhooks |
| INT-RES-002-B | Bounce handling triggers suppression + status update |
| INT-RES-005-A | Batch queue uses same status flow per email |
| INT-RES-008 | Dashboard widget shows status distribution |

### Status State Machine

```
queued -> sending -> delivered
              |           |
              v           v
           failed      opened
              |
              v
         retrying -> delivered
              |
              v
      failed_permanent
```

### UI States

| Status | Icon | Action Available |
|--------|------|------------------|
| queued | clock | Cancel |
| sending | spinner | none |
| delivered | green check | View details |
| opened | eye | View details |
| bounced | warning | Remove from list |
| failed | red X | Retry |
| failed_permanent | red X | Retry (resets count) |

### Suppression List Integration

Before queuing any email:
1. Check `email_suppression` table for recipient
2. If suppressed: Reject immediately with clear error
3. Log rejection reason for transparency

On bounce/complaint webhook:
1. Add to suppression list automatically
2. Update all queued emails to same recipient: status = "cancelled"
3. Notify user of suppression

---

**Document Version:** 1.1
**Created:** 2026-01-11
**Updated:** 2026-01-17 (Error recovery patterns added)
**Target:** renoz-v3 Resend Email Integration
**Completion Promise:** INT_RESEND_COMPLETE
