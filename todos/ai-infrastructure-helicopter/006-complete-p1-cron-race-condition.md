---
status: complete
priority: p1
issue_id: "DATA-002"
tags: [helicopter-review, data-integrity, ai-infrastructure, race-condition]
dependencies: []
---

# DATA-002: Expiration Cron Race Condition

## Problem Statement

The approval expiration cron job uses a SELECT-then-UPDATE pattern that creates a race condition. Between fetching expired approvals and updating them, another process could approve one, leading to incorrect status transitions.

This is a CRITICAL data integrity issue that could expire already-approved items.

## Findings

**Source:** Data Integrity Guardian Agent + Helicopter Review

**Location:** `src/trigger/jobs/expire-ai-approvals.ts:52-92`

**Current state (problematic):**
```typescript
// Step 1: SELECT expired approvals
const expiredApprovals = await db.query.aiApprovals.findMany({
  where: and(
    eq(aiApprovals.status, 'pending'),
    lt(aiApprovals.expiresAt, new Date())
  ),
});

// Race window: approval could be approved here by another process

// Step 2: UPDATE each one
for (const approval of expiredApprovals) {
  await db.update(aiApprovals)
    .set({ status: 'expired' })
    .where(eq(aiApprovals.id, approval.id)); // No status check!
}
```

**Pattern requirement:**
```typescript
// Atomic UPDATE...WHERE...RETURNING
const expired = await db.update(aiApprovals)
  .set({
    status: 'expired',
    version: sql`${aiApprovals.version} + 1`
  })
  .where(and(
    eq(aiApprovals.status, 'pending'), // Status check in WHERE
    lt(aiApprovals.expiresAt, new Date())
  ))
  .returning();
```

**Risk:**
- Cron expires an approval that user just approved
- Approved action never executes
- User confusion and data inconsistency

## Proposed Solutions

### Option A: Atomic UPDATE...WHERE...RETURNING (Recommended)
- **Pros:** Eliminates race condition completely, single query
- **Cons:** None
- **Effort:** Small (30 minutes)
- **Risk:** Low

### Option B: SELECT FOR UPDATE with Transaction
- **Pros:** Locks rows during update
- **Cons:** More complex, holds locks
- **Effort:** Small (1 hour)
- **Risk:** Low

### Option C: Two-Phase with Status Check
- **Pros:** Keeps loop structure
- **Cons:** Still has small race window
- **Effort:** Small (30 minutes)
- **Risk:** Medium - race still possible

## Recommended Action

Option A - Use atomic `UPDATE...WHERE...RETURNING` pattern.

## Technical Details

**Files to modify:**
- `src/trigger/jobs/expire-ai-approvals.ts`

**Fixed implementation:**
```typescript
import { lt, eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { aiApprovals } from 'drizzle/schema/ai/approvals';

export async function expireApprovals() {
  // Atomic: only expires approvals that are STILL pending
  const expired = await db.update(aiApprovals)
    .set({
      status: 'expired',
      version: sql`${aiApprovals.version} + 1`,
      executedAt: new Date(),
    })
    .where(and(
      eq(aiApprovals.status, 'pending'),
      lt(aiApprovals.expiresAt, new Date())
    ))
    .returning({ id: aiApprovals.id });

  console.log(`Expired ${expired.length} approvals`);

  return { expiredCount: expired.length, expiredIds: expired.map(a => a.id) };
}
```

**Verification query:**
```sql
-- Check for any approvals that were expired after being approved
SELECT * FROM ai_approvals
WHERE status = 'expired'
AND executed_at IS NOT NULL
AND executed_at < expires_at;
-- Should return 0 rows
```

## Acceptance Criteria

- [ ] Cron uses atomic UPDATE...WHERE...RETURNING pattern
- [ ] WHERE clause includes status = 'pending' check
- [ ] No SELECT-then-UPDATE pattern
- [ ] Version column incremented on expiration
- [ ] Unit test verifies race condition is prevented
- [ ] Logging shows count of actually expired items

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-26 | Created from helicopter review | SELECT-then-UPDATE is always a race condition |
| 2026-01-26 | **FIXED** - Rewrote src/trigger/jobs/expire-ai-approvals.ts: replaced SELECT-then-UPDATE loop with atomic UPDATE...WHERE(status='pending' AND expiresAt<now)...RETURNING pattern. Version column incremented. Applied to both scheduled job and manual trigger task. | Atomic UPDATE with status in WHERE clause eliminates race window entirely |

## Resources

- PostgreSQL atomic UPDATE patterns
- Drizzle ORM returning() method
- `src/trigger/jobs/expire-ai-approvals.ts` - Current implementation
