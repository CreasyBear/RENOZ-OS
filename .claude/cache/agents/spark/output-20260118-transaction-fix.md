# Quick Fix: Wrap quick-log Database Operations in Transaction
Generated: 2026-01-18

## Change Made
- File: `src/lib/server/quick-log.ts`
- Lines: 92-131
- Change: Wrapped activity insert and scheduledCalls insert in a single database transaction

## Verification
- Syntax check: PASS (TypeScript compiles)
- Pattern followed: db.transaction pattern from product-inventory.ts and other server functions

## Problem Solved
**Before:** The activity insert (line 95-108) and scheduledCalls insert (line 111-123) were separate operations. If the scheduledCalls insert failed, we'd have an orphaned activity record in the database, leading to inconsistent state.

**After:** Both operations now run inside `db.transaction(async (tx) => {...})`, ensuring atomicity. Either both inserts succeed or both roll back.

## Code Changes

### Before (Lines 92-125)
```typescript
    // Create the activity record
    const [activity] = await db
      .insert(activities)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        entityType: entityType as "customer" | "opportunity",
        entityId,
        action,
        description,
        metadata,
        source: "manual" as ActivitySource,
        createdBy: ctx.user.id,
      })
      .returning();

    // For calls, also create a scheduled_calls record (as completed)
    if (type === "call" && customerId) {
      await db.insert(scheduledCalls).values({
        organizationId: ctx.organizationId,
        assigneeId: ctx.user.id,
        customerId,
        scheduledAt: new Date(),
        purpose: "general",
        notes,
        status: "completed",
        completedAt: new Date(),
        outcome: "completed",
        outcomeNotes: notes,
      });
    }

    return {
      success: true,
      activityId: activity.id,
      type,
    };
```

### After (Lines 92-131)
```typescript
    // Wrap both inserts in a transaction to ensure consistency
    return await db.transaction(async (tx) => {
      // Create the activity record
      const [activity] = await tx
        .insert(activities)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.user.id,
          entityType: entityType as "customer" | "opportunity",
          entityId,
          action,
          description,
          metadata,
          source: "manual" as ActivitySource,
          createdBy: ctx.user.id,
        })
        .returning();

      // For calls, also create a scheduled_calls record (as completed)
      if (type === "call" && customerId) {
        await tx.insert(scheduledCalls).values({
          organizationId: ctx.organizationId,
          assigneeId: ctx.user.id,
          customerId,
          scheduledAt: new Date(),
          purpose: "general",
          notes,
          status: "completed",
          completedAt: new Date(),
          outcome: "completed",
          outcomeNotes: notes,
        });
      }

      return {
        success: true,
        activityId: activity.id,
        type,
      };
    });
```

## Key Changes
1. Changed `db.insert()` to `tx.insert()` (using transaction parameter)
2. Wrapped entire operation block in `db.transaction(async (tx) => {...})`
3. Moved the return statement inside the transaction block
4. Added explanatory comment about transaction purpose

## Files Modified
1. `src/lib/server/quick-log.ts` - Added database transaction wrapper to ensure atomic operations

## Notes
- This follows the established pattern used throughout the codebase (see product-inventory.ts, orders.ts, inventory.ts)
- Transaction automatically rolls back if any operation throws an error
- No changes needed to the function signature or return type
- The fix addresses the HIGH priority issue from the premortem analysis (COMMS-AUTO-003)
