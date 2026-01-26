---
status: pending
priority: p2
issue_id: "DATA-004"
tags: [helicopter-review, data-integrity, ai-infrastructure, references, group-4]
dependencies: ["DATA-003"]
---

# DATA-004: Entity to Approval Back-Reference

## Problem Statement

When an approval creates or modifies an entity (customer, order), there's no back-reference from the entity to the approval that created/modified it. This makes auditing difficult - we can't easily see which approvals affected which entities.

## Findings

**Source:** Data Integrity Guardian Agent + Helicopter Review

**Current state:**
- Approval record stores `actionData.draft.customerId` (forward reference)
- Customer/Order records don't store `lastApprovalId` or similar (no back-reference)
- Can't easily query "what approvals affected this customer?"

**Desired state:**
```sql
-- Entity table has approval tracking
ALTER TABLE customers ADD COLUMN last_approval_id uuid REFERENCES ai_approvals(id);
ALTER TABLE orders ADD COLUMN last_approval_id uuid REFERENCES ai_approvals(id);

-- Or use a junction table for many-to-many
CREATE TABLE ai_approval_entities (
  approval_id uuid REFERENCES ai_approvals(id),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  created_at timestamp DEFAULT NOW()
);
```

**Impact:**
- Cannot audit which AI approvals modified an entity
- Difficult to trace AI-driven changes
- Compliance/audit requirements may not be met
- No "undo" capability for AI changes

## Proposed Solutions

### Option A: Junction Table (Recommended)
- **Pros:** Flexible, supports many-to-many, no schema changes to entities
- **Cons:** Extra table, extra queries
- **Effort:** Medium (1-2 hours)
- **Risk:** Low

### Option B: Column on Entity Tables
- **Pros:** Simple, fast lookups
- **Cons:** Only tracks last approval, requires many migrations
- **Effort:** Medium (2-3 hours)
- **Risk:** Low

### Option C: Store in Approval actionData
- **Pros:** No schema changes
- **Cons:** Already done, but need reverse index
- **Effort:** Small (1 hour)
- **Risk:** Low

## Recommended Action

Option A - Create `ai_approval_entities` junction table.

## Technical Details

**Files to create:**
- `drizzle/schema/_ai/ai-approval-entities.ts`
- `drizzle/migrations/XXXX_add_ai_approval_entities.sql`

**Files to modify:**
- `src/lib/ai/approvals/executor.ts` - Record entity links on execution
- `src/lib/ai/approvals/handlers.ts` - Record entity links in handlers

**Schema:**
```typescript
// drizzle/schema/_ai/ai-approval-entities.ts
import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { aiApprovals } from './ai-approvals';

export const aiApprovalEntities = pgTable('ai_approval_entities', {
  id: uuid('id').primaryKey().defaultRandom(),
  approvalId: uuid('approval_id')
    .notNull()
    .references(() => aiApprovals.id, { onDelete: 'cascade' }),
  entityType: text('entity_type').notNull(), // 'customer', 'order', 'quote', etc.
  entityId: uuid('entity_id').notNull(),
  action: text('action').notNull(), // 'created', 'updated', 'deleted'
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  approvalIdx: index('ai_approval_entities_approval_idx').on(table.approvalId),
  entityIdx: index('ai_approval_entities_entity_idx').on(table.entityType, table.entityId),
}));
```

**Usage in executor:**
```typescript
// src/lib/ai/approvals/executor.ts
export async function executeAction(
  approvalId: string,
  userId: string,
  organizationId: string,
  expectedVersion?: number
): Promise<ExecuteActionResult> {
  return db.transaction(async (tx) => {
    // ... existing approval update logic ...

    // Execute the handler
    const result = await handler(approval.actionData.draft, tx);

    // Record entity links
    if (result.entityId && result.entityType) {
      await tx.insert(aiApprovalEntities).values({
        approvalId,
        entityType: result.entityType,
        entityId: result.entityId,
        action: approval.action.startsWith('create') ? 'created' : 'updated',
      });
    }

    return result;
  });
}
```

**Query helpers:**
```typescript
// Get all approvals that affected an entity
export async function getApprovalsForEntity(
  entityType: string,
  entityId: string
): Promise<ApprovalWithEntity[]> {
  return db
    .select()
    .from(aiApprovalEntities)
    .innerJoin(aiApprovals, eq(aiApprovalEntities.approvalId, aiApprovals.id))
    .where(
      and(
        eq(aiApprovalEntities.entityType, entityType),
        eq(aiApprovalEntities.entityId, entityId)
      )
    )
    .orderBy(desc(aiApprovalEntities.createdAt));
}

// Get all entities affected by an approval
export async function getEntitiesForApproval(
  approvalId: string
): Promise<ApprovalEntity[]> {
  return db
    .select()
    .from(aiApprovalEntities)
    .where(eq(aiApprovalEntities.approvalId, approvalId));
}
```

## Acceptance Criteria

- [ ] `ai_approval_entities` table created
- [ ] Migration file generated
- [ ] Indexes on approvalId and (entityType, entityId)
- [ ] Executor records entity links on execution
- [ ] Query helpers for bidirectional lookup
- [ ] TypeScript compiles without errors

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-26 | Created from helicopter review | Junction table provides flexibility for audit trails |

## Resources

- `src/lib/ai/approvals/executor.ts` - Current implementation
- `drizzle/schema/_ai/` - Existing AI schema files
