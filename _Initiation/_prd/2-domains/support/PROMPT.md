# Ralph Loop: Support Domain

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. Do NOT create local formatCurrency functions or duplicate UI patterns.

### Pattern Files

| Pattern | Path | When to Apply |
|---------|------|---------------|
| Testing Standards | `_meta/patterns/testing-standards.md` | All stories |
| Mobile UI Patterns | `_meta/patterns/mobile-ui-patterns.md` | All UI stories - AlertDialog for confirmations, loading skeletons, label associations |

**IMPORTANT**: Pattern compliance is part of acceptance criteria.

## Objective

Build the Support/Issues domain for Renoz CRM - a comprehensive battery system issue tracking and technical support module. This domain manages support workflow for battery performance, inverter errors, installation problems, and connectivity issues from creation through resolution.

## Premortem Remediation: Unified SLA Engine

**Source:** `_meta/remediation-sla-engine.md`

This domain MUST use the unified SLA calculation engine instead of implementing domain-specific SLA logic.

### Key Changes from Remediation

1. **NO `sla_policies` table** - Use unified `sla_configurations` table with `domain='support'`
2. **NO inline SLA columns on issues** - Use `sla_tracking_id` FK to reference unified tracking
3. **Unified pause/resume** - Use SLA State Manager, not custom `slaWaitingOnCustomerSince` field

### Required Tables (from unified engine)

| Table | Purpose |
|-------|---------|
| `sla_configurations` | Replaces `sla_policies` - configurable response/resolution targets |
| `sla_tracking` | One row per tracked issue - stores timing, pause state, breach status |
| `sla_events` | Audit log for SLA state changes (started, paused, resumed, breached) |
| `business_hours_config` | Organization business hours (for business_hours SLA calculations) |
| `organization_holidays` | Holiday calendar for excluding from SLA time |

### Implementation Pattern

```typescript
// Starting SLA tracking when issue is created
import { SlaStateManager } from '@/lib/sla/state-manager';

const tracking = await SlaStateManager.startTracking({
  organizationId,
  domain: 'support',
  entityType: 'issue',
  entityId: issue.id,
  configId: slaConfigurationId,
});

// Pausing when status changes to 'on_hold' with reason 'waiting_on_customer'
await SlaStateManager.pause(tracking.id, 'waiting_on_customer', userId);

// Resuming when status changes from 'on_hold'
await SlaStateManager.resume(tracking.id, userId);
```

### DO NOT Implement

- Domain-specific SLA calculation logic
- Custom pause/resume timestamp handling
- Inline SLA fields on issues table
- Separate SLA breach detection jobs (use unified breach detector)

## Current State

Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with DOM-SUP-001a.

## Context

### PRD File
- `opc/_Initiation/_prd/2-domains/support/support.prd.json`

### Wireframe Files
| Wireframe | Stories Covered | Path |
|-----------|----------------|------|
| SLA Tracking | DOM-SUP-001a, DOM-SUP-001b, DOM-SUP-001c | `./wireframes/support-sla-tracking.wireframe.md` |
| Escalation | DOM-SUP-002a, DOM-SUP-002b | `./wireframes/support-escalation.wireframe.md` |
| RMA Workflow | DOM-SUP-003a, DOM-SUP-003b, DOM-SUP-003c | `./wireframes/support-rma-workflow.wireframe.md` |
| Issue Templates | DOM-SUP-004 | `./wireframes/support-issue-templates.wireframe.md` |
| CSAT Feedback | DOM-SUP-005a, DOM-SUP-005b, DOM-SUP-005c | `./wireframes/support-csat-feedback.wireframe.md` |
| Dashboard | DOM-SUP-006 | `./wireframes/support-dashboard.wireframe.md` |
| Knowledge Base | DOM-SUP-007a, DOM-SUP-007b, DOM-SUP-007c | `./wireframes/support-knowledge-base.wireframe.md` |
| Issue Kanban | DOM-SUP-008 | `./wireframes/support-issue-kanban.wireframe.md` |
| Index | All | `./wireframes/index.md` |

### Reference Files
- Project root: `renoz-v3/`
- Existing issue schema: `renoz-v2/lib/schema/issues.ts`
- Stack: TanStack Start + Bun + React 19 + Supabase + Drizzle ORM + shadcn/ui

### Tech Stack
- **Runtime**: Bun
- **Framework**: TanStack Start (file-router)
- **Auth**: Supabase Auth
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack Table
- **AI**: Vercel AI SDK + Anthropic

## Blockers

**This domain has significant backend dependencies that must be completed before UI work.**

### Schema Dependencies (Must Create)
| Table | Created By Story | Status | Notes |
|-------|-----------------|--------|-------|
| `sla_configurations` | DOM-SUP-001a | NOT CREATED | Unified engine table - creates domain='support' entries |
| `escalation_rules` | DOM-SUP-002a | NOT CREATED | |
| `return_authorizations` | DOM-SUP-003a | NOT CREATED | |
| `issue_templates` | DOM-SUP-004 | NOT CREATED | |
| `issue_feedback` | DOM-SUP-005a | NOT CREATED | |
| `kb_articles` | DOM-SUP-007a | NOT CREATED | |
| `kb_categories` | DOM-SUP-007a | NOT CREATED | |

### Unified SLA Engine Tables (Created by SLA Engine Foundation)
| Table | Purpose |
|-------|---------|
| `sla_configurations` | Unified SLA configs across all domains |
| `sla_tracking` | Per-entity SLA state tracking |
| `sla_events` | Audit trail for SLA state changes |
| `business_hours_config` | Org business hours |
| `organization_holidays` | Holiday calendar |

### External PRD Dependencies
| PRD | Status | Reason |
|-----|--------|--------|
| schema-foundation | REQUIRED | Base schema must exist (organizations, users, customers, issues) |
| DOM-ORD (Orders) | REQUIRED | RMA workflow links to order line items |
| DOM-WARRANTY | OPTIONAL | Warranty claims may create issues |

### Existing Schema Available
- `issues` in `renoz-v2/lib/schema/issues.ts`
- `issueAttachments` in `renoz-v2/lib/schema/issues.ts`
- `organizations`, `users`, `customers`, `activities`, `notifications`, `orders`

## Story Execution Order

Stories must be executed in dependency order. Each story creates schema/functions needed by later stories.

### Phase 1: SLA Tracking (Priority 1-3)
1. **DOM-SUP-001a** - SLA Schema and Basic Tracking
   - Creates `sla_policies` table
   - Adds SLA columns to issues
   - Server functions: `createSlaPolicy`, `getSlaPolicy`, `calculateSlaDueDates`
   - **No UI dependencies** - foundation story

2. **DOM-SUP-001b** - SLA Breach Detection and Warnings
   - Depends on: DOM-SUP-001a
   - UI: Badge indicators, SLA status section
   - Wireframe: `support-sla-tracking.wireframe.md`

3. **DOM-SUP-001c** - SLA Dashboard and Pause Feature
   - Depends on: DOM-SUP-001b
   - Server functions: `pauseSla`, `resumeSla`
   - UI: Dashboard widgets, pause/resume buttons

### Phase 2: Escalation (Priority 4-5)
4. **DOM-SUP-002a** - Escalation Schema and Manual Improvements
   - Creates `escalation_rules` table
   - Server functions: `createEscalationRule`, `escalateIssue`, `deescalateIssue`
   - Wireframe: `support-escalation.wireframe.md`

5. **DOM-SUP-002b** - Automatic Escalation Engine
   - Depends on: DOM-SUP-002a, DOM-SUP-001a
   - Trigger.dev background job
   - Auto-escalation rules

### Phase 3: RMA Workflow (Priority 6-8)
6. **DOM-SUP-003a** - RMA Schema and Basic CRUD
   - Creates `return_authorizations` table
   - Server functions: `createRMA`, `getRMA`
   - Wireframe: `support-rma-workflow.wireframe.md`

7. **DOM-SUP-003b** - RMA Workflow and Status Transitions
   - Depends on: DOM-SUP-003a
   - Server functions: `approveRMA`, `receiveRMA`, `processRMA`

8. **DOM-SUP-003c** - RMA UI and Issue Integration
   - Depends on: DOM-SUP-003b
   - Full UI implementation

### Phase 4: Issue Templates (Priority 9)
9. **DOM-SUP-004** - Add Issue Templates
   - Creates `issue_templates` table
   - Server functions: `createIssueTemplate`
   - Wireframe: `support-issue-templates.wireframe.md`

### Phase 5: CSAT Feedback (Priority 10-12)
10. **DOM-SUP-005a** - CSAT Schema and Internal Entry
    - Creates `issue_feedback` table
    - Server functions: `submitFeedback`
    - Wireframe: `support-csat-feedback.wireframe.md`

11. **DOM-SUP-005b** - CSAT Email and Public Form
    - Depends on: DOM-SUP-005a
    - Token-based public rating form

12. **DOM-SUP-005c** - CSAT Dashboard and Follow-up
    - Depends on: DOM-SUP-005b, DOM-SUP-006
    - Dashboard widgets, low rating alerts

### Phase 6: Support Dashboard (Priority 13)
13. **DOM-SUP-006** - Create Support Dashboard
    - Depends on: DOM-SUP-001c
    - Wireframe: `support-dashboard.wireframe.md`
    - Aggregate metrics, charts, team performance

### Phase 7: Knowledge Base (Priority 14-16)
14. **DOM-SUP-007a** - Knowledge Base Schema and Basic CRUD
    - Creates `kb_articles`, `kb_categories` tables
    - Server functions: `createKbArticle`
    - Wireframe: `support-knowledge-base.wireframe.md`

15. **DOM-SUP-007b** - Knowledge Base Search and Categories
    - Depends on: DOM-SUP-007a
    - Server functions: `searchKbArticles`
    - Full-text search

16. **DOM-SUP-007c** - Knowledge Base Issue Integration
    - Depends on: DOM-SUP-007b
    - Article suggestions in issue form

### Phase 8: Issue Workflow Enhancement (Priority 17)
17. **DOM-SUP-008** - Enhance Issue Workflow
    - Depends on: DOM-SUP-001b
    - Wireframe: `support-issue-kanban.wireframe.md`
    - Kanban board, bulk actions, duplicate detection

## Process

1. **Read progress.txt** to find current story
2. **Read the PRD** for story acceptance criteria
3. **Read the wireframe** for UI specifications (if applicable)
4. **Check dependencies** - ensure prerequisite stories are complete
5. **Implement the acceptance criteria** completely
6. **Run verification**:
   ```bash
   cd renoz-v3 && bun run typecheck && bun run test
   ```
7. **If all criteria pass**:
   - Mark story `[x]` in progress.txt
   - Output `<promise>STORY_ID_COMPLETE</promise>`
   - Move to next story
8. **If criteria fail**:
   - Debug and fix
   - Stay on current story (max 3 iterations per fix attempt)

## Domain-Specific Constraints

### DO
- Follow existing issue schema patterns
- Use priority enum: `low`, `normal`, `high`, `urgent`
- Use issue types: `hardware_fault`, `software_firmware`, `installation_defect`, `performance_degradation`, `connectivity`, `other`
- Use issue status including `escalated`
- Implement all wireframe UI patterns using RE-UI components
- Add proper ARIA roles and keyboard navigation
- Track SLA with both response and resolution times

### DO NOT
- Modify existing issue CRUD operations
- Change current issue status workflow
- Skip schema migrations for new tables
- Implement public customer portal features
- Add live chat integration
- Build AI-powered issue routing
- Use `window.confirm()` - always use `AlertDialog`

### UI Implementation Patterns (from Inventory Domain)

These patterns are MANDATORY for all UI stories. Apply to both desktop and mobile views.

#### Confirmations & Dialogs
| Pattern | Correct | Wrong | Why |
|---------|---------|-------|-----|
| Destructive actions | `<AlertDialog>` from shadcn/ui | `window.confirm()` | Native dialogs block JS, break SSR, inconsistent UX |
| Confirmation flow | `handleXClick` → show dialog → `handleConfirmedX` | Direct action | Separates trigger from execution |

```typescript
// CORRECT: AlertDialog for RMA approval, ticket closure, etc.
const [showConfirmDialog, setShowConfirmDialog] = useState(false);

<Button onClick={() => setShowConfirmDialog(true)}>Close Ticket</Button>

<AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Close Ticket?</AlertDialogTitle>
      <AlertDialogDescription>This will mark the ticket as resolved.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleConfirmedClose}>Confirm</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

#### Forms & Accessibility
| Pattern | Correct | Wrong | Why |
|---------|---------|-------|-----|
| Label association | `<Label htmlFor="priority">` + `<Select id="priority">` | Missing id/htmlFor | WCAG 1.3.1 violation |
| Loading buttons | `<Loader2 className="animate-spin" /> + original label` | Hide label | User knows action is processing |

#### Loading States
| Pattern | Correct | Wrong | Why |
|---------|---------|-------|-----|
| Async data | `<Skeleton className="h-10 w-full" />` | Spinner or nothing | Prevents layout shift |
| Table rows | `<Skeleton className="h-8 w-full" />` repeated | Empty rows | Consistent loading UX |

#### Performance
| Pattern | Correct | Wrong | Why |
|---------|---------|-------|-----|
| List items | `const TicketRow = memo(function TicketRow() {...})` | Inline components | Prevents re-renders |
| Mock data | `import { MOCK_TICKETS } from "./__fixtures__"` | Inline in component | Separation of concerns |

### Battery Business Context
- Industry: Australian B2B battery manufacturer and installation services
- Products: LiFePO4 battery systems, inverters, BMS (Battery Management Systems)
- Issue Categories: Battery performance, inverter faults, installation defects, connectivity issues
- Data Points: Serial numbers, installation dates, SoH readings, inverter error logs

## Completion

When ALL support stories pass:
```xml
<promise>SUPPORT_DOMAIN_COMPLETE</promise>
```

## File Structure

```
renoz-v3/
├── src/
│   ├── routes/
│   │   └── _authed/
│   │       └── support/
│   │           ├── index.tsx              # Dashboard (DOM-SUP-006)
│   │           ├── issues/
│   │           │   ├── index.tsx          # Issue list
│   │           │   ├── board.tsx          # Kanban view (DOM-SUP-008)
│   │           │   └── [id].tsx           # Issue detail
│   │           ├── rma/
│   │           │   └── [id].tsx           # RMA detail (DOM-SUP-003c)
│   │           └── kb/
│   │               ├── index.tsx          # KB list (DOM-SUP-007a)
│   │               └── [id].tsx           # Article detail
│   ├── components/
│   │   └── support/
│   │       ├── sla-badge.tsx              # SLA status badge
│   │       ├── sla-status-card.tsx        # SLA detail card
│   │       ├── escalation-banner.tsx      # Escalated issue alert
│   │       ├── rma-workflow.tsx           # RMA stepper
│   │       ├── issue-template-picker.tsx  # Template selection
│   │       ├── csat-rating.tsx            # Star rating component
│   │       ├── kb-article-card.tsx        # KB article preview
│   │       └── kanban-board.tsx           # Issue board
│   └── lib/
│       ├── server/
│       │   └── support/
│       │       ├── sla.ts                 # SLA functions
│       │       ├── escalation.ts          # Escalation functions
│       │       ├── rma.ts                 # RMA functions
│       │       ├── templates.ts           # Template functions
│       │       ├── feedback.ts            # CSAT functions
│       │       └── knowledge-base.ts      # KB functions
│       └── schemas/
│           └── support/
│               ├── sla.ts                 # Zod schemas
│               ├── rma.ts
│               └── kb.ts
├── drizzle/
│   └── schema/
│       ├── sla-policies.ts
│       ├── escalation-rules.ts
│       ├── return-authorizations.ts
│       ├── issue-templates.ts
│       ├── issue-feedback.ts
│       └── knowledge-base.ts
└── tests/
    └── support/
        ├── sla.test.ts
        ├── rma.test.ts
        └── kb.test.ts
```

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - SLA calculation edge cases -> Check timezone handling
  - RMA status transitions -> Verify state machine logic
  - KB search not working -> Check full-text index configuration
  - Escalation rules not triggering -> Verify Trigger.dev job registration

## Progress Template

```markdown
# Support Domain Progress
# Started: [DATE]
# Updated: [DATE]

## Dependencies
- [ ] schema-foundation: PENDING
- [ ] DOM-ORD: PENDING

## Stories
### Phase 1: SLA Tracking
- [ ] DOM-SUP-001a: SLA Schema and Basic Tracking
- [ ] DOM-SUP-001b: SLA Breach Detection and Warnings
- [ ] DOM-SUP-001c: SLA Dashboard and Pause Feature

### Phase 2: Escalation
- [ ] DOM-SUP-002a: Escalation Schema and Manual Improvements
- [ ] DOM-SUP-002b: Automatic Escalation Engine

### Phase 3: RMA Workflow
- [ ] DOM-SUP-003a: RMA Schema and Basic CRUD
- [ ] DOM-SUP-003b: RMA Workflow and Status Transitions
- [ ] DOM-SUP-003c: RMA UI and Issue Integration

### Phase 4: Issue Templates
- [ ] DOM-SUP-004: Add Issue Templates

### Phase 5: CSAT Feedback
- [ ] DOM-SUP-005a: CSAT Schema and Internal Entry
- [ ] DOM-SUP-005b: CSAT Email and Public Form
- [ ] DOM-SUP-005c: CSAT Dashboard and Follow-up

### Phase 6: Dashboard
- [ ] DOM-SUP-006: Create Support Dashboard

### Phase 7: Knowledge Base
- [ ] DOM-SUP-007a: Knowledge Base Schema and Basic CRUD
- [ ] DOM-SUP-007b: Knowledge Base Search and Categories
- [ ] DOM-SUP-007c: Knowledge Base Issue Integration

### Phase 8: Workflow Enhancement
- [ ] DOM-SUP-008: Enhance Issue Workflow

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

**Document Version:** 1.0
**Created:** 2026-01-11
**Target:** renoz-v3 Support Domain
**Stories:** 17 total
**Estimated Effort:** Large (most work needed among domains)
