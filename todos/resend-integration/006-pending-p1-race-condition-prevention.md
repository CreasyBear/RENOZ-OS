---
status: pending
priority: p1
issue_id: DI-003
tags: [code-review, data-integrity, resend, race-conditions]
dependencies: [DI-001, DI-002]
---

# DI-003: Race Condition Prevention for Opens/Clicks

## Problem Statement

Multiple webhooks for the same email (e.g., opened multiple times by different email clients) could arrive simultaneously. Without proper handling:
- Open/click counts could be incorrect
- First-open timestamp could be overwritten
- Link click arrays could lose entries

**Why it matters**: Accurate metrics require atomic, race-safe database operations.

## Findings

### Discovery 1: Current Click Tracking Pattern
- **Location**: `src/lib/server/email-tracking.ts:150-241`
- **Evidence**: Uses read-modify-write pattern for linkClicks JSONB
- **Problem**: Not atomic - concurrent writes could lose data

### Discovery 2: Timestamp Handling
- **Location**: `src/lib/server/email-tracking.ts:119-122`
- **Evidence**: Checks `openedAt` in application code, then updates
- **Problem**: TOCTOU race between check and update

## Proposed Solutions

### Solution A: Conditional UPDATEs (Recommended)
Use database-level conditions to prevent race conditions

**Pros**:
- Atomic at database level
- No locks needed
- Simple pattern

**Cons**:
- Need to handle "no rows updated" case

**Effort**: Small (2-3 hours)
**Risk**: Low

### Solution B: Advisory Locks
Use PostgreSQL advisory locks for concurrent processing

**Pros**:
- Full control over concurrency
- Can do complex operations safely

**Cons**:
- More complex
- Lock management overhead
- Potential deadlocks

**Effort**: Medium (4-5 hours)
**Risk**: Medium

### Solution C: Serializable Transactions
Use SERIALIZABLE isolation level

**Pros**:
- Database handles all conflicts
- Simple code

**Cons**:
- Higher contention
- May need retries
- Performance impact

**Effort**: Medium (3-4 hours)
**Risk**: Medium

## Recommended Action
[To be filled during triage]

## Technical Details

### Affected Files
- `src/trigger/jobs/process-resend-webhook.ts` - USE conditional updates
- `src/lib/server/email-tracking.ts` - MODIFY or DEPRECATE for Resend

### Implementation Pattern
```typescript
// Race-safe first open recording
const result = await db
  .update(emailHistory)
  .set({
    openedAt: new Date(),
    openCount: sql`COALESCE(${emailHistory.openCount}, 0) + 1`
  })
  .where(
    and(
      eq(emailHistory.id, emailId),
      isNull(emailHistory.openedAt) // Atomic check
    )
  )
  .returning({
    id: emailHistory.id,
    wasFirstOpen: sql<boolean>`${emailHistory.openedAt} IS NULL`
  });

const wasFirstOpen = result.length > 0;

// For click tracking with JSONB array append (atomic)
await db
  .update(emailHistory)
  .set({
    clickedAt: sql`COALESCE(${emailHistory.clickedAt}, NOW())`,
    linkClicks: sql`
      COALESCE(${emailHistory.linkClicks}, '{"clicks":[],"totalClicks":0}'::jsonb)
      || jsonb_build_object(
        'clicks',
        (COALESCE(${emailHistory.linkClicks}->'clicks', '[]'::jsonb) || ${JSON.stringify(newClick)}::jsonb),
        'totalClicks',
        (COALESCE((${emailHistory.linkClicks}->>'totalClicks')::int, 0) + 1)
      )
    `
  })
  .where(eq(emailHistory.id, emailId));
```

## Acceptance Criteria

- [ ] Concurrent open events don't corrupt first-open timestamp
- [ ] Concurrent click events don't lose click data
- [ ] Open/click counts are accurate even under high concurrency
- [ ] No application-level locks or mutexes needed
- [ ] Pattern works across multiple Trigger.dev workers

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-25 | Created from multi-agent review | Current pattern has TOCTOU race condition |

## Resources

- PRD: `_Initiation/_prd/3-integrations/resend/PROMPT.md` (DI-003 section)
- Existing code: `src/lib/server/email-tracking.ts`
- Story: INT-RES-002 (Webhook Event Processing)
