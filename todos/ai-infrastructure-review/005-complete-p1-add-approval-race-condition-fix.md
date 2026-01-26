---
status: pending
priority: p1
issue_id: "005"
tags: [prd-review, data-integrity, transactions, ai-infrastructure]
dependencies: []
---

# Fix Approval Execution Race Condition

## Problem Statement

The approval execution flow described in the PRD has a check-then-act race condition that could lead to:
- Double execution of approved actions
- Conflicting states (executedAt set but status='rejected')
- Lost updates when multiple users process the same approval

## Findings

**Source:** Data Integrity Guardian Agent

**Severity:** CRITICAL

**Location:** PRD story AI-INFRA-015, lines 771-801

**Vulnerable Pattern Described:**
```typescript
// VULNERABLE:
const approval = await db.select().from(aiApprovals).where(eq(id, approvalId));
if (approval.status !== 'pending') throw new Error('Already processed');

await db.transaction(async (tx) => {
  await handler.execute(approval.actionData);
  await tx.update(aiApprovals).set({ status: 'approved' });
});
```

**Race Condition Scenario:**
1. User A loads approval #123 (status='pending')
2. User B loads approval #123 (status='pending')
3. User A approves -> status='approved', approvedBy=A, executedAt=NOW()
4. User B rejects -> status='rejected', rejectionReason='...'
5. Result: Action was executed but status shows 'rejected'

## Proposed Solutions

### Option A: SELECT FOR UPDATE + Optimistic Locking (Recommended)
- **Pros:** Prevents race conditions completely
- **Cons:** Requires version column addition
- **Effort:** Medium
- **Risk:** Low

```typescript
await db.transaction(async (tx) => {
  const [approval] = await tx
    .select()
    .from(aiApprovals)
    .where(and(
      eq(aiApprovals.id, approvalId),
      eq(aiApprovals.status, 'pending'),
      sql`expires_at > NOW()`
    ))
    .for('update')  // Row-level lock
    .limit(1);

  if (!approval) throw new Error('Not found, already processed, or expired');

  const result = await handler.execute(approval.actionData, tx);

  await tx.update(aiApprovals)
    .set({
      status: 'approved',
      approvedBy: userId,
      approvedAt: sql`NOW()`,
      executedAt: sql`NOW()`,
      executionResult: result,
      version: sql`${aiApprovals.version} + 1`
    })
    .where(and(
      eq(aiApprovals.id, approvalId),
      eq(aiApprovals.version, approval.version)
    ));
});
```

### Option B: Status Check Only (No Locking)
- **Pros:** Simpler
- **Cons:** Still has small race window
- **Effort:** Small
- **Risk:** Medium

## Recommended Action

Option A - Use SELECT FOR UPDATE with optimistic locking.

## Technical Details

**Schema changes required:**
1. Add `version` column to `ai_approvals` table (default 1)
2. Add CHECK constraints for status/field consistency

**Update PRD story AI-INFRA-002 acceptance criteria:**
```json
"version integer NOT NULL DEFAULT 1 for optimistic locking"
```

**Update PRD story AI-INFRA-015 acceptance criteria:**
```json
"executeAction uses SELECT FOR UPDATE to prevent race conditions",
"Optimistic lock check on version column before update"
```

## Acceptance Criteria

- [ ] `version` column added to ai_approvals schema
- [ ] executeAction uses SELECT FOR UPDATE
- [ ] Version check prevents concurrent updates
- [ ] Handler receives transaction object for nested operations
- [ ] Concurrent approval test exists

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-25 | Created from data integrity review | Check-then-act patterns need row-level locking |

## Resources

- PostgreSQL SELECT FOR UPDATE documentation
- Drizzle ORM transaction patterns
