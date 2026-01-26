---
status: complete
priority: p1
issue_id: "DATA-001"
tags: [helicopter-review, data-integrity, ai-infrastructure, optimistic-locking]
dependencies: []
---

# DATA-001: Version Column Not Used for Optimistic Locking

## Problem Statement

The `ai_approvals` table has a `version` column for optimistic locking, but the approval executor does not check or increment it. This allows race conditions where concurrent approval requests could corrupt data.

This is a CRITICAL data integrity issue that could lead to double-execution of approvals.

## Findings

**Source:** Data Integrity Guardian Agent + Helicopter Review

**Location:** `src/lib/ai/approvals/executor.ts`

**Current state:**
```typescript
// Does not check version
const approval = await db.query.aiApprovals.findFirst({
  where: eq(aiApprovals.id, approvalId),
});

// Updates without version check
await db.update(aiApprovals)
  .set({ status: 'executed' })
  .where(eq(aiApprovals.id, approvalId));
```

**Pattern requirement:**
```typescript
// Check expected version
const approval = await db.query.aiApprovals.findFirst({
  where: and(
    eq(aiApprovals.id, approvalId),
    eq(aiApprovals.version, expectedVersion)
  ),
});

if (!approval) {
  throw new ConcurrencyError('Approval was modified by another request');
}

// Increment version on update
await db.update(aiApprovals)
  .set({
    status: 'executed',
    version: sql`${aiApprovals.version} + 1`
  })
  .where(and(
    eq(aiApprovals.id, approvalId),
    eq(aiApprovals.version, expectedVersion)
  ));
```

**Risk:**
- Two concurrent approval requests could both succeed
- Approval actions could be executed twice
- Data corruption in downstream operations

## Proposed Solutions

### Option A: Full Optimistic Locking (Recommended)
- **Pros:** Standard pattern, prevents all race conditions
- **Cons:** Requires version in API requests
- **Effort:** Small (1-2 hours)
- **Risk:** Low

### Option B: SELECT FOR UPDATE
- **Pros:** Simpler implementation
- **Cons:** Holds locks, potential deadlocks
- **Effort:** Small (1 hour)
- **Risk:** Medium - lock contention

### Option C: Combine Both
- **Pros:** Defense in depth
- **Cons:** More complex
- **Effort:** Medium (2-3 hours)
- **Risk:** Low

## Recommended Action

Option A - Implement proper optimistic locking with version column.

## Technical Details

**Files to modify:**
- `src/lib/ai/approvals/executor.ts` - Add version checking
- `src/routes/api/ai/approve.ts` - Accept version in request

**Schema verification:**
```sql
-- Verify version column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'ai_approvals' AND column_name = 'version';
```

**Implementation:**
```typescript
export async function executeApproval(
  approvalId: string,
  action: 'approve' | 'reject',
  expectedVersion: number
): Promise<ApprovalResult> {
  // Atomic update with version check
  const [updated] = await db.update(aiApprovals)
    .set({
      status: action === 'approve' ? 'executed' : 'rejected',
      version: sql`${aiApprovals.version} + 1`,
      executedAt: new Date(),
    })
    .where(and(
      eq(aiApprovals.id, approvalId),
      eq(aiApprovals.version, expectedVersion),
      eq(aiApprovals.status, 'pending')
    ))
    .returning();

  if (!updated) {
    throw new ConcurrencyError('Approval was already processed or modified');
  }

  return updated;
}
```

## Acceptance Criteria

- [ ] Version column exists in ai_approvals table
- [ ] Executor checks expected version before update
- [ ] Executor increments version on successful update
- [ ] API accepts version parameter in request
- [ ] ConcurrencyError thrown on version mismatch
- [ ] Unit tests verify race condition handling

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-26 | Created from helicopter review | Optimistic locking essential for approval safety |
| 2026-01-26 | **FIXED** - Updated src/lib/ai/approvals/executor.ts: added expectedVersion parameter to executeAction() and rejectAction(), added version check before updates, increment version with sql\`version + 1\` on all status changes, return VERSION_CONFLICT error code on mismatch. | Optimistic locking provides better concurrency than SELECT FOR UPDATE with less lock contention |

## Resources

- `patterns/` - No specific pattern but referenced in PROMPT.md
- PostgreSQL optimistic locking patterns
- Drizzle ORM atomic updates
