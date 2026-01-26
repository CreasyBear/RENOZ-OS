---
status: complete
priority: p2
issue_id: "DATA-005"
tags: [helicopter-review, data-integrity, ai-infrastructure, retry, group-4]
dependencies: []
completed_at: "2026-01-26"
---

# DATA-005: Retry Count Tracking

## Problem Statement

The AI approvals system doesn't track retry counts. If an approval execution fails and is retried, there's no way to know how many attempts have been made. This makes it difficult to implement circuit breakers or alert on repeatedly failing approvals.

## Findings

**Source:** Data Integrity Guardian Agent + Helicopter Review

**Current state:**
- `ai_approvals` table has no `retry_count` column
- Failed executions update status but don't track attempts
- No way to identify "stuck" approvals that keep failing

**Desired state:**
```sql
ALTER TABLE ai_approvals ADD COLUMN retry_count integer NOT NULL DEFAULT 0;
ALTER TABLE ai_approvals ADD COLUMN last_error text;
ALTER TABLE ai_approvals ADD COLUMN last_attempt_at timestamp;
```

**Impact:**
- Cannot implement max-retry limits
- No alerting on repeatedly failing approvals
- Difficult to debug stuck approvals
- No visibility into execution reliability

## Proposed Solutions

### Option A: Add Columns to ai_approvals (Recommended)
- **Pros:** Simple, direct tracking
- **Cons:** Requires migration
- **Effort:** Small (1 hour)
- **Risk:** Low

### Option B: Separate Execution Log Table
- **Pros:** Full history of all attempts
- **Cons:** More complex, more storage
- **Effort:** Medium (2 hours)
- **Risk:** Low

## Recommended Action

Option A - Add retry tracking columns to `ai_approvals` table.

## Technical Details

**Files to modify:**
- `drizzle/schema/_ai/ai-approvals.ts` - Add columns
- `src/lib/ai/approvals/executor.ts` - Increment retry count on failure

**Migration:**
```sql
-- drizzle/migrations/XXXX_add_approval_retry_tracking.sql
ALTER TABLE ai_approvals ADD COLUMN retry_count integer NOT NULL DEFAULT 0;
ALTER TABLE ai_approvals ADD COLUMN last_error text;
ALTER TABLE ai_approvals ADD COLUMN last_attempt_at timestamp;

-- Index for finding stuck approvals
CREATE INDEX ai_approvals_retry_idx ON ai_approvals (status, retry_count)
  WHERE status = 'pending' AND retry_count > 0;
```

**Schema update:**
```typescript
// drizzle/schema/_ai/ai-approvals.ts
export const aiApprovals = pgTable('ai_approvals', {
  // ... existing columns ...

  // Retry tracking
  retryCount: integer('retry_count').notNull().default(0),
  lastError: text('last_error'),
  lastAttemptAt: timestamp('last_attempt_at'),
});
```

**Executor update:**
```typescript
// src/lib/ai/approvals/executor.ts
export async function executeAction(
  approvalId: string,
  userId: string,
  organizationId: string,
  expectedVersion?: number
): Promise<ExecuteActionResult> {
  const MAX_RETRIES = 3;

  try {
    // Fetch approval
    const [approval] = await db.select().from(aiApprovals)
      .where(eq(aiApprovals.id, approvalId));

    if (!approval) {
      return { success: false, error: 'Approval not found', code: 'NOT_FOUND' };
    }

    // Check retry limit
    if (approval.retryCount >= MAX_RETRIES) {
      return {
        success: false,
        error: `Maximum retries (${MAX_RETRIES}) exceeded`,
        code: 'MAX_RETRIES_EXCEEDED',
      };
    }

    // Attempt execution
    const result = await handler(approval.actionData.draft);

    // Success - update status
    await db.update(aiApprovals)
      .set({
        status: 'approved',
        executedAt: new Date(),
        lastAttemptAt: new Date(),
        executionResult: result,
        version: sql`${aiApprovals.version} + 1`,
      })
      .where(eq(aiApprovals.id, approvalId));

    return { success: true, result };
  } catch (error) {
    // Failure - increment retry count and record error
    await db.update(aiApprovals)
      .set({
        retryCount: sql`${aiApprovals.retryCount} + 1`,
        lastError: error instanceof Error ? error.message : String(error),
        lastAttemptAt: new Date(),
        version: sql`${aiApprovals.version} + 1`,
      })
      .where(eq(aiApprovals.id, approvalId));

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'EXECUTION_FAILED',
    };
  }
}
```

**Query for stuck approvals:**
```typescript
// Find approvals that have failed multiple times
export async function getStuckApprovals(minRetries = 2): Promise<Approval[]> {
  return db.select()
    .from(aiApprovals)
    .where(
      and(
        eq(aiApprovals.status, 'pending'),
        gte(aiApprovals.retryCount, minRetries)
      )
    )
    .orderBy(desc(aiApprovals.retryCount));
}
```

## Acceptance Criteria

- [x] `retry_count` column added to ai_approvals
- [x] `last_error` column added to ai_approvals
- [x] `last_attempt_at` column added to ai_approvals
- [x] Migration file generated
- [x] Executor increments retry_count on failure
- [x] Executor records last_error on failure
- [x] Max retry limit enforced (default: 3)
- [x] Query helper for finding stuck approvals
- [x] TypeScript compiles without errors

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-26 | Created from helicopter review | Retry tracking essential for operational visibility |
| 2026-01-26 | Implemented retry tracking | Added columns to schema, MAX_RETRIES check in executor, getStuckApprovals helper function |

## Resources

- `drizzle/schema/_ai/ai-approvals.ts` - Current schema
- `src/lib/ai/approvals/executor.ts` - Current executor
