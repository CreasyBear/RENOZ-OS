# Ralph Loop: Unified Activity Timeline (CROSS-TIMELINE)

## Objective
Build a cross-domain activity timeline that aggregates all customer touchpoints (emails, calls, notes, status changes, support tickets) into a single unified view. Enable sales, support, and operations teams to see complete customer interaction history with minimal context-switching.

## Required Reading

Before implementing any story, review these critical resources:

### Frontend Components
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

### Pattern Files

> **IMPORTANT:** These patterns are MANDATORY for all story implementations in this domain.

| Pattern | File | Applies To | Key Requirements |
|---------|------|------------|------------------|
| Testing Standards | `_Initiation/_meta/patterns/testing-standards.md` | All stories | TDD flow, 80% server coverage, story-level tests |
| Error Recovery | `_Initiation/_meta/patterns/error-recovery.md` | Email Event Capture | Idempotent Resend webhook processing |
| Performance | `_Initiation/_meta/patterns/performance-benchmarks.md` | Schema, API, UI | Timeline <500ms, handle 500K activities |
| 3-Click Rule | `_Initiation/_meta/patterns/ux-3-click-rule.md` | Quick Actions, Customer 360 | Cmd+L call log (2 clicks), hover for last contact |

## Current State
Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with CROSS-TIMELINE-001.

## Context

### PRD Files (in execution order)
1. `_Initiation/_prd/5-cross-domain/timeline/timeline.prd.json` - Unified timeline stories

### Reference Files
- Project root: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/renoz-v3/`
- Stack: TanStack Start + Bun + React 19 + Supabase + Drizzle ORM + shadcn/ui

### Tech Stack
- **Runtime**: Bun
- **Framework**: TanStack Start (file-router)
- **Auth**: Supabase Auth
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS
- **Forms**: React Hook Form + Zod
- **Email**: Resend (webhook integration for email events)
- **Background Jobs**: Trigger.dev

## Process

1. **Read progress.txt** to find current story
2. **Read the PRD** for story acceptance criteria
3. **Implement the acceptance criteria** completely
4. **Run verification**:
   ```bash
   cd renoz-v3 && bun run typecheck && bun run test
   ```
5. **If all criteria pass**:
   - Mark story `[x]` in progress.txt
   - Output `<promise>[STORY_COMPLETION_PROMISE]</promise>`
   - Move to next story
6. **If criteria fail**:
   - Debug and fix
   - Stay on current story (max 3 iterations per fix attempt)

## Story Execution Order

### Phase: Cross-Domain Timeline (CROSS-TIMELINE)
Execute stories in priority order from timeline.prd.json:

1. CROSS-TIMELINE-001: Activity Aggregation Schema
2. CROSS-TIMELINE-002: Activity Feed API
3. CROSS-TIMELINE-003: Auto-Capture Email Events
4. CROSS-TIMELINE-004: Timeline UI Component
5. CROSS-TIMELINE-005: Activity Logging Quick Action
6. CROSS-TIMELINE-006: Customer 360 Integration

## Completion

When ALL timeline stories pass:
```xml
<promise>CROSS_TIMELINE_PHASE_COMPLETE</promise>
```

## Constraints

### DO
- Follow TanStack Start file-router conventions
- Use `src/` directory structure (NOT `app/`)
- Create Drizzle migrations for schema changes
- Use Zod for all validation schemas
- Follow shadcn/ui patterns for components
- Write TypeScript with strict types
- Run `bun run typecheck` after each story
- Use polymorphic association (entityType + entityId) for flexible entity references
- Denormalize customerId for efficient customer-centric queries
- Implement cursor-based pagination for timeline
- Use optimistic updates for quick actions
- Respect existing activity tracking patterns

### DO NOT
- Modify files outside cross-timeline scope
- Skip acceptance criteria
- Use client-side checks alone (always server-side first)
- Create components that duplicate shadcn/ui primitives
- Create WebSocket connections (use polling for v1)
- Implement AI-generated summaries
- Make timeline loading slow (target < 500ms)
- Break existing activity tracking functionality

## File Structure

```
renoz-v3/
├── src/
│   ├── routes/
│   │   ├── _authed/
│   │   │   ├── customers/
│   │   │   │   └── $customerId/
│   │   │   │       └── activity.tsx         # Customer activity tab route
│   │   │   └── api/
│   │   │       └── webhooks/
│   │   │           └── resend.ts            # Resend webhook handler
│   ├── components/
│   │   ├── timeline/                        # Timeline components
│   │   │   ├── UnifiedTimeline.tsx
│   │   │   ├── TimelineItem.tsx
│   │   │   ├── TimelineFilters.tsx
│   │   │   ├── TimelineSkeleton.tsx
│   │   │   ├── MiniTimeline.tsx
│   │   │   ├── QuickActionBar.tsx
│   │   │   ├── LogCallDialog.tsx
│   │   │   ├── AddNoteDialog.tsx
│   │   │   └── LastContactBadge.tsx
│   │   ├── customers/
│   │   │   └── CustomerHoverCard.tsx        # Enhanced with mini-timeline
│   │   └── shared/
│   └── lib/
│       ├── schema/
│       │   └── unified-activities.ts        # Schema
│       ├── server/
│       │   └── functions/
│       │       └── timeline.ts              # Server functions
│       └── schemas/
│           └── timeline.ts                  # Zod schemas
├── drizzle/
│   └── migrations/
└── tests/
    └── unit/
        └── timeline/
```

## Key Patterns

### Polymorphic Entity Reference
```typescript
// entityType + entityId pattern allows linking to any entity
{
  entityType: 'opportunity' | 'order' | 'job' | 'support_ticket' | ...,
  entityId: uuid,
  customerId: uuid  // Denormalized for fast customer queries
}
```

### Activity Type Mapping
```typescript
const activityIcons = {
  email_sent: Mail,
  email_opened: MailOpen,
  call_logged: Phone,
  note_added: MessageSquare,
  status_change: RefreshCw,
  quote_created: FileText,
  order_placed: ShoppingCart,
  // ...
};
```

### Cursor-Based Pagination
```typescript
// Server function signature
getCustomerTimeline(
  customerId: string,
  filters?: { types?: ActivityType[], dateRange?: DateRange },
  cursor?: string  // Base64 encoded (createdAt, id) tuple
)
```

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - TypeScript type inference -> Check Drizzle $inferSelect patterns
  - Polymorphic queries -> Use union types and type guards
  - Webhook idempotency -> Store Resend event IDs to deduplicate
  - Timeline performance -> Verify indexes exist on query patterns
  - Optimistic updates -> Use TanStack Query mutation patterns

## Progress Template

```markdown
# Unified Activity Timeline Progress
# PRD: timeline.prd.json
# Started: [DATE]
# Updated: [DATE]

## Stories (6 total)

- [ ] CROSS-TIMELINE-001: Activity Aggregation Schema
- [ ] CROSS-TIMELINE-002: Activity Feed API
- [ ] CROSS-TIMELINE-003: Auto-Capture Email Events
- [ ] CROSS-TIMELINE-004: Timeline UI Component
- [ ] CROSS-TIMELINE-005: Activity Logging Quick Action
- [ ] CROSS-TIMELINE-006: Customer 360 Integration

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
**Created:** 2026-01-17
**Target:** renoz-v3 Cross-Domain Timeline Phase
**Completion Promise:** CROSS_TIMELINE_PHASE_COMPLETE
