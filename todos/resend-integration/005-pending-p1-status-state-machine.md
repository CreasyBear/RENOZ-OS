---
status: pending
priority: p1
issue_id: DI-002
tags: [code-review, data-integrity, resend, state-machine]
dependencies: [DI-001]
---

# DI-002: Email Status State Machine Required

## Problem Statement

Email status transitions must follow a valid sequence. Without enforcement, out-of-order webhook delivery could corrupt status:
- A "delivered" event arriving after "opened" shouldn't overwrite opened status
- A "bounced" email shouldn't later show as "delivered"
- Timestamps must be preserved correctly

**Why it matters**: Accurate email status is critical for analytics, suppression logic, and customer communication history.

## Findings

### Discovery 1: Valid State Transitions
```
pending → sent → delivered → opened → clicked
                          ↘ bounced
                          ↘ complained
```

### Discovery 2: Current Email History Schema
- **Location**: `drizzle/schema/communications/email-history.ts`
- **Evidence**: Has individual timestamp columns (openedAt, clickedAt, etc.)
- **Recommendation**: Use conditional updates that respect state order

## Proposed Solutions

### Solution A: Conditional UPDATE Queries (Recommended)
Use SQL conditions to only update if transition is valid

**Pros**:
- No schema changes
- Database enforces correctness
- Works with concurrent updates

**Cons**:
- Logic spread across update queries

**Effort**: Small (2-3 hours)
**Risk**: Low

### Solution B: Status Enum with Trigger
Add status enum column with database trigger to enforce transitions

**Pros**:
- Centralized enforcement
- Clear status field

**Cons**:
- Database triggers harder to test
- Migration complexity

**Effort**: Medium (4-5 hours)
**Risk**: Medium

## Recommended Action
[To be filled during triage]

## Technical Details

### Affected Files
- `src/trigger/jobs/process-resend-webhook.ts` - ADD conditional updates
- `src/lib/server/email-status.ts` - NEW (optional, for state machine logic)

### Implementation Pattern
```typescript
// Only set openedAt if not already set (first open wins)
const openResult = await db
  .update(emailHistory)
  .set({ openedAt: new Date() })
  .where(
    and(
      eq(emailHistory.resendMessageId, event.data.email_id),
      isNull(emailHistory.openedAt) // Only if not already opened
    )
  )
  .returning({ id: emailHistory.id });

const wasFirstOpen = openResult.length > 0;

// Only set deliveredAt if not bounced/complained
const deliverResult = await db
  .update(emailHistory)
  .set({ deliveredAt: new Date() })
  .where(
    and(
      eq(emailHistory.resendMessageId, event.data.email_id),
      isNull(emailHistory.bouncedAt),
      isNull(emailHistory.complainedAt)
    )
  )
  .returning({ id: emailHistory.id });

// Bounce/complaint are terminal - always set
const bounceResult = await db
  .update(emailHistory)
  .set({
    bouncedAt: new Date(),
    bounceType: event.data.bounce?.type === 'Permanent' ? 'hard' : 'soft',
    bounceReason: event.data.bounce?.message,
  })
  .where(eq(emailHistory.resendMessageId, event.data.email_id))
  .returning({ id: emailHistory.id });
```

### State Transition Rules
| Current State | Allowed Transitions |
|--------------|---------------------|
| pending | sent |
| sent | delivered, bounced, complained |
| delivered | opened, bounced, complained |
| opened | clicked |
| bounced | (terminal) |
| complained | (terminal) |
| clicked | (terminal for click tracking) |

## Acceptance Criteria

- [ ] Out-of-order events don't corrupt status
- [ ] First open/click timestamp is preserved
- [ ] Bounced/complained emails can't transition to delivered/opened
- [ ] State transitions are logged for debugging
- [ ] Analytics accurately reflect email status

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-25 | Created from multi-agent review | Use conditional UPDATEs with isNull checks |

## Resources

- PRD: `_Initiation/_prd/3-integrations/resend/PROMPT.md` (DI-002 section)
- Story: INT-RES-002 (Webhook Event Processing)
