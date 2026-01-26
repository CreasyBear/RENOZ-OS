---
status: pending
priority: p2
issue_id: "DATA-003"
tags: [helicopter-review, data-integrity, ai-infrastructure, transactions, group-4]
dependencies: []
---

# DATA-003: Transactional Approval Creation

## Problem Statement

When tools create approval records, they insert into `ai_approvals` without wrapping in a transaction. If subsequent operations fail, orphaned approval records may remain, leading to inconsistent state.

## Findings

**Source:** Data Integrity Guardian Agent + Helicopter Review

**Location:** `src/lib/ai/tools/customer-tools.ts:335-357`

**Current state (no transaction):**
```typescript
// Insert approval - not in transaction
const [approval] = await db
  .insert(aiApprovals)
  .values({
    userId: _context.userId,
    organizationId: _context.organizationId,
    action: 'update_customer_notes',
    // ...
  })
  .returning({ id: aiApprovals.id });

// If something fails after this, orphaned approval exists
return createApprovalResult(...);
```

**Required pattern:**
```typescript
// Wrap in transaction
const result = await db.transaction(async (tx) => {
  // Insert approval
  const [approval] = await tx.insert(aiApprovals).values({...}).returning();

  // Any related inserts (e.g., audit log)
  await tx.insert(aiAuditLogs).values({
    approvalId: approval.id,
    action: 'created',
    // ...
  });

  return approval;
});
```

**Risk:**
- Orphaned approval records on partial failures
- Inconsistent state between approval and related data
- Difficult to debug/clean up orphans
- Potential for approval execution without proper setup

## Proposed Solutions

### Option A: Wrap in Transaction (Recommended)
- **Pros:** Atomic operations, no orphans
- **Cons:** Slightly more complex code
- **Effort:** Small (30 minutes per tool)
- **Risk:** Low

### Option B: Add Cleanup Job
- **Pros:** No code changes to tools
- **Cons:** Eventually consistent, orphans exist temporarily
- **Effort:** Medium (1-2 hours)
- **Risk:** Low but not ideal

## Recommended Action

Option A - Wrap approval creation in database transaction.

## Technical Details

**Files to modify:**
- `src/lib/ai/tools/customer-tools.ts` - updateCustomerNotesTool
- `src/lib/ai/tools/order-tools.ts` - createOrderDraftTool, createQuoteDraftTool
- `src/lib/ai/tools/analytics-tools.ts` - any approval-creating tools

**Implementation:**
```typescript
// src/lib/ai/tools/customer-tools.ts
execute: async ({ customerId, notes, appendMode, _context }) => {
  try {
    // Verify customer exists
    const [customer] = await db.select({...}).from(customers).where(...);

    if (!customer) {
      return createErrorResult('Customer not found', ...);
    }

    // Transaction for approval creation
    const approval = await db.transaction(async (tx) => {
      // Create approval record
      const [approvalRecord] = await tx
        .insert(aiApprovals)
        .values({
          userId: _context.userId,
          organizationId: _context.organizationId,
          conversationId: _context.conversationId || null,
          action: 'update_customer_notes',
          agent: 'customer',
          actionData: {
            actionType: 'update_customer_notes',
            draft: { customerId, customFields: { internalNotes: newNotes } },
            availableActions: ['approve', 'edit', 'discard'],
            diff: { before: { internalNotes: existingNotes }, after: { internalNotes: newNotes } },
          },
          expiresAt,
        })
        .returning({ id: aiApprovals.id, version: aiApprovals.version });

      // Could add audit log in same transaction
      // await tx.insert(aiAuditLogs).values({...});

      return approvalRecord;
    });

    return createApprovalResult(
      'update_customer_notes',
      { customerId, customFields: { internalNotes: newNotes } },
      approval.id,
      `Update notes for customer "${customer.name}"`,
      { before: { internalNotes: existingNotes }, after: { internalNotes: newNotes } }
    );
  } catch (error) {
    // Transaction rolled back on error
    console.error('Error in updateCustomerNotesTool:', error);
    return createErrorResult('Failed to create notes update draft', ...);
  }
}
```

## Acceptance Criteria

- [ ] updateCustomerNotesTool uses transaction
- [ ] createOrderDraftTool uses transaction
- [ ] createQuoteDraftTool uses transaction
- [ ] All approval-creating tools wrapped in transactions
- [ ] Rollback on any failure
- [ ] No orphaned approval records possible
- [ ] TypeScript compiles without errors

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-26 | Created from helicopter review | Transactions essential for multi-table consistency |

## Resources

- `src/lib/ai/tools/customer-tools.ts` - Current implementation
- Drizzle ORM transaction documentation
- PostgreSQL transaction isolation patterns
