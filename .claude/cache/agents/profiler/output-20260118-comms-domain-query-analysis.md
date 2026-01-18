# Communications Domain Query Analysis
Generated: 2026-01-18

## Executive Summary
- **Files Analyzed:** 4 (activity-bridge.ts, quick-log.ts, activities.ts, activities schema)
- **Total Queries Found:** 18
- **Critical Issues:** 2
- **High Issues:** 3
- **Medium Issues:** 4
- **Low Issues:** 2

## Query Summary Table

| Query | Location | Issue | Severity | Fix |
|-------|----------|-------|----------|-----|
| INSERT activities (email_sent) | activity-bridge.ts:107 | Missing transaction with email insert | MEDIUM | Wrap in transaction with email send |
| INSERT activities (email_opened) | activity-bridge.ts:152 | No idempotency check | LOW | Add unique constraint on sourceRef |
| INSERT activities (email_clicked) | activity-bridge.ts:199 | No idempotency check | LOW | Add unique constraint on sourceRef |
| INSERT activities (call_logged) | activity-bridge.ts:254 | Not in transaction | MEDIUM | Wrap with related call record creation |
| INSERT activities (note_added) | activity-bridge.ts:307 | entityId can be noteId (invalid UUID ref) | MEDIUM | Require customerId OR opportunityId |
| INSERT activities (quick_log) | quick-log.ts:93 | Two inserts not in transaction | HIGH | Wrap both inserts in db.transaction |
| INSERT scheduled_calls | quick-log.ts:109 | Missing organizationId index filter | CRITICAL | Schema has orgStatusIdx but query doesn't use org filter |
| SELECT activities (feed) | activities.ts:54-89 | JOIN on users table without org filter | HIGH | Add users.organizationId check or trust FK |
| SELECT activities (entity) | activities.ts:103-135 | No entity existence check | MEDIUM | Consider checking entity exists first |
| SELECT activities (user) | activities.ts:149-175 | No user existence check | LOW | No major issue |
| SELECT activities (single) | activities.ts:188-208 | Correct - has org filter | OK | N/A |
| SELECT count (stats) | activities.ts:220-280 | Multiple separate queries | MEDIUM | Consider single query with CASE |
| SELECT count (leaderboard) | activities.ts:298-340 | N+1 for user details | HIGH | Already optimized with inArray |
| SELECT count (recent) | activities.ts:372-390 | Correct - has org filter | OK | N/A |

## Detailed Analysis

---

### CRITICAL: Missing Organization Filter on scheduled_calls Insert

**Location:** `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/server/quick-log.ts:109-120`

**Query:**
```typescript
await db.insert(scheduledCalls).values({
  organizationId: ctx.organizationId,  // Correctly includes org
  userId: ctx.user.id,
  customerId,
  contactId: null,
  scheduledAt: new Date(),
  purpose: "logged_call",
  notes,
  status: "completed",
  completedAt: new Date(),
  outcome: "completed",
  outcomeNotes: notes,
  duration: duration ?? null,
  createdBy: ctx.user.id,
});
```

**Issue:** The scheduled_calls schema (line 45) has `assigneeId` as a required field with `notNull()`, but the insert uses `userId` which doesn't exist in the schema. This will cause a runtime error.

**Schema Definition:**
```typescript
// From scheduled-calls.ts
assigneeId: uuid("assignee_id")
  .notNull()
  .references(() => users.id, { onDelete: "cascade" }),
```

**Evidence:** The insert attempts to set `userId`, `contactId`, `createdBy` which are NOT in the schema. The correct fields are `assigneeId`, `customerId`, `scheduledAt`, etc.

**Fix:**
```typescript
await db.insert(scheduledCalls).values({
  organizationId: ctx.organizationId,
  customerId,
  assigneeId: ctx.user.id,  // Use assigneeId, not userId
  scheduledAt: new Date(),
  purpose: "logged_call" as const,  // Type cast needed
  notes,
  status: "completed",
  completedAt: new Date(),
  outcome: "completed",
  outcomeNotes: notes,
  // duration field doesn't exist in schema - remove or add to schema
});
```

---

### CRITICAL: Schema Mismatch - Multiple Missing Fields

**Location:** `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/server/quick-log.ts:109-120`

**Fields in Insert but NOT in Schema:**
- `userId` - should be `assigneeId`
- `contactId` - not in schema
- `duration` - not in schema
- `createdBy` - not in schema (uses timestampColumns pattern)

**Fields in Schema but MISSING from Insert:**
- `assigneeId` - REQUIRED (notNull)

**Impact:** This query will fail at runtime with a Drizzle/Postgres error.

---

### HIGH: Two Inserts Not In Transaction

**Location:** `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/server/quick-log.ts:84-120`

**Current Code:**
```typescript
// Create the activity record
const [activity] = await db
  .insert(activities)
  .values({...})
  .returning();

// For calls, also create a scheduled_calls record
if (type === "call" && customerId) {
  await db.insert(scheduledCalls).values({...});
}
```

**Issue:** If the second insert fails, the first insert has already committed, leaving inconsistent state (activity exists but no scheduled_call record).

**Fix:**
```typescript
return await db.transaction(async (tx) => {
  const [activity] = await tx
    .insert(activities)
    .values({...})
    .returning();

  if (type === "call" && customerId) {
    await tx.insert(scheduledCalls).values({...});
  }

  return { success: true, activityId: activity.id, type };
});
```

---

### HIGH: User JOIN Without Org Filter Could Leak Data

**Location:** `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/server/functions/activities.ts:79-89`

**Query:**
```typescript
const results = await db
  .select({
    activity: activities,
    user: {
      id: users.id,
      name: users.name,
      email: users.email,
    },
  })
  .from(activities)
  .leftJoin(users, eq(activities.userId, users.id))
  .where(whereClause)
  .orderBy(desc(activities.createdAt), desc(activities.id))
  .limit(pageSize + 1);
```

**Issue:** The JOIN on users table doesn't include an organizationId filter. If a userId from another organization somehow got into the activities table, the user's details would be leaked.

**Current Safety:** The activities table is correctly filtered by `organizationId`, so in practice this is unlikely. However, defense-in-depth would add the org filter.

**Risk Assessment:** LOW in practice because:
1. Activities are always created with ctx.organizationId
2. userId references are validated on insert

**Recommended Fix (defense-in-depth):**
```typescript
.leftJoin(users, and(
  eq(activities.userId, users.id),
  eq(users.organizationId, ctx.organizationId)  // Add this
))
```

---

### HIGH: Leaderboard Two-Query Pattern Could Have Race Condition

**Location:** `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/server/functions/activities.ts:310-340`

**Current Code:**
```typescript
// Query 1: Get top users with counts
const results = await db
  .select({
    userId: activities.userId,
    activityCount: count(),
  })
  .from(activities)
  .where(whereClause)
  .groupBy(activities.userId)
  .orderBy(desc(count()))
  .limit(10);

// Query 2: Get user details
const userDetails = userIds.length > 0
  ? await db
      .select({...})
      .from(users)
      .where(inArray(users.id, userIds))
  : [];
```

**Issue:** Between the two queries, a user could be deleted, causing a mismatch. The code handles this gracefully (returns "Unknown" for missing users), so this is acceptable.

**Better Approach:** Single query with JOIN:
```typescript
const results = await db
  .select({
    userId: activities.userId,
    activityCount: count(),
    userName: users.name,
    userEmail: users.email,
  })
  .from(activities)
  .leftJoin(users, eq(activities.userId, users.id))
  .where(whereClause)
  .groupBy(activities.userId, users.name, users.email)
  .orderBy(desc(count()))
  .limit(10);
```

---

### MEDIUM: Activity Bridge Functions Don't Validate Entity Exists

**Location:** All functions in `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/server/activity-bridge.ts`

**Issue:** The bridge functions accept customerId, opportunityId, etc. but don't verify these entities exist before creating the activity. If an invalid ID is passed, the activity will be created with a dangling reference.

**Impact:** The activities table uses polymorphic references (entityType + entityId) without foreign key constraints, so invalid IDs won't be caught by the database.

**Mitigation:** These functions are typically called right after creating the entity (e.g., after sending an email), so the entity should exist. However, adding validation would be safer.

**Fix (for high-value entities):**
```typescript
// Before creating activity
if (customerId) {
  const customer = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(
      eq(customers.id, customerId),
      eq(customers.organizationId, organizationId)
    ))
    .limit(1);
  
  if (!customer.length) {
    throw new Error(`Customer ${customerId} not found`);
  }
}
```

---

### MEDIUM: Stats Queries Execute Multiple Separate Queries

**Location:** `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/server/functions/activities.ts:228-280`

**Issue:** The stats function runs multiple queries sequentially (total count, then grouped stats), which could be combined.

**Current Pattern:**
```typescript
// Query 1: Total count
const totalResult = await db.select({ count: count() })...

// Query 2: Grouped stats (based on groupBy)
const actionStats = await db.select({ key: activities.action, count: count() })...
```

**Better Approach:** Single query with window function:
```typescript
const stats = await db
  .select({
    key: activities.action,
    groupCount: count(),
    totalCount: sql<number>`count(*) over ()`,
  })
  .from(activities)
  .where(whereClause)
  .groupBy(activities.action);
```

---

## Index Analysis

### Activities Table Indexes (VERIFIED)

| Index | Columns | Query Support |
|-------|---------|---------------|
| idx_activities_org_entity | organizationId, entityType, entityId | getEntityActivities |
| idx_activities_org_created | organizationId, createdAt | getActivityFeed (base) |
| idx_activities_user | userId, createdAt | getUserActivities |
| idx_activities_action | organizationId, action, createdAt | Filter by action |
| idx_activities_entity_type | organizationId, entityType, createdAt | Filter by entity type |
| idx_activities_source | organizationId, source, createdAt | Filter by source |

**Assessment:** Indexes are well-designed and cover all query patterns.

### Scheduled Calls Table Indexes (VERIFIED)

| Index | Columns | Query Support |
|-------|---------|---------------|
| idx_scheduled_calls_assignee | assigneeId | By user queries |
| idx_scheduled_calls_scheduled_at | scheduledAt | Upcoming calls |
| idx_scheduled_calls_status | status | Status filtering |
| idx_scheduled_calls_assignee_status | assigneeId, status | Composite queries |
| idx_scheduled_calls_customer | customerId | Customer lookup |
| idx_scheduled_calls_org_status | organizationId, status | Multi-tenant + status |

**Assessment:** Indexes are appropriate.

---

## Multi-Tenant Safety Analysis

### Verified Safe (org filter present)

1. **getActivityFeed** - `eq(activities.organizationId, ctx.organizationId)` at line 54
2. **getEntityActivities** - `eq(activities.organizationId, ctx.organizationId)` at line 108
3. **getUserActivities** - `eq(activities.organizationId, ctx.organizationId)` at line 153
4. **getActivity** - `eq(activities.organizationId, ctx.organizationId)` at line 199
5. **getActivityStats** - `eq(activities.organizationId, ctx.organizationId)` at line 224
6. **getActivityLeaderboard** - `eq(activities.organizationId, ctx.organizationId)` at line 302
7. **getRecentActivityCount** - `eq(activities.organizationId, ctx.organizationId)` at line 382
8. **createQuickLog** - Uses `ctx.organizationId` for insert at line 86

### Activity Bridge Functions

All activity bridge functions receive `organizationId` as a parameter and include it in the insert. These functions are internal helpers called by other server functions that should have already validated the organization context.

**Risk:** If called with an incorrect organizationId, activities could be created in the wrong tenant. However, since these are internal functions (not exposed as server functions), the risk is low.

---

## Recommendations

### Immediate Fixes Required

1. **FIX CRITICAL:** Update quick-log.ts scheduled_calls insert to use correct schema fields
2. **FIX HIGH:** Wrap quick-log.ts inserts in a transaction

### Recommended Improvements

3. Add defense-in-depth org filter to user JOINs
4. Consider adding entity existence validation in bridge functions
5. Combine stats queries into single query with window functions
6. Add idempotency checks (unique constraint on sourceRef) for webhook-style activities

### Schema Improvements

7. Add `duration` column to scheduled_calls if needed
8. Consider adding foreign key from activities.userId to users.id (currently unconstrained)
9. Consider adding composite unique index on (organizationId, sourceRef) for idempotency

---

## Query Performance Notes

### Will Use Indexes

- All SELECT queries include organizationId filter first, matching index prefix
- Cursor pagination uses (createdAt, id) which matches index order
- JOIN on users.id will use primary key index

### Potential Full Table Scans

- None identified - all queries use indexed columns appropriately

### N+1 Query Patterns

- Leaderboard function uses batched user lookup (inArray) - acceptable pattern
- No N+1 issues in loops


---

## Appendix: Schema Verification

### Verified scheduled_calls Schema (from migration 0014)

```sql
CREATE TABLE IF NOT EXISTS "scheduled_calls" (
  "id" uuid PRIMARY KEY,
  "organization_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,        -- EXISTS
  "assignee_id" uuid NOT NULL,        -- EXISTS (quick-log uses "userId" - WRONG)
  "scheduled_at" timestamp NOT NULL,  -- EXISTS
  "reminder_at" timestamp,            -- EXISTS
  "purpose" text NOT NULL,            -- EXISTS
  "notes" text,                       -- EXISTS
  "status" scheduled_call_status NOT NULL,
  "completed_at" timestamp,           -- EXISTS
  "cancelled_at" timestamp,           -- EXISTS
  "cancel_reason" text,               -- EXISTS
  "outcome" text,                     -- EXISTS
  "outcome_notes" text,               -- EXISTS
  "rescheduled_to_id" uuid,           -- EXISTS
  "created_at" timestamp NOT NULL,    -- EXISTS (from timestampColumns)
  "updated_at" timestamp NOT NULL     -- EXISTS (from timestampColumns)
);
```

### Fields in quick-log.ts INSERT that DO NOT EXIST:
- `userId` - should be `assigneeId`
- `contactId` - does not exist
- `duration` - does not exist
- `createdBy` - does not exist

### Required Fix for quick-log.ts:109-120

```typescript
// CURRENT (BROKEN):
await db.insert(scheduledCalls).values({
  organizationId: ctx.organizationId,
  userId: ctx.user.id,        // WRONG - field doesn't exist
  customerId,
  contactId: null,            // WRONG - field doesn't exist
  scheduledAt: new Date(),
  purpose: "logged_call",
  notes,
  status: "completed",
  completedAt: new Date(),
  outcome: "completed",
  outcomeNotes: notes,
  duration: duration ?? null, // WRONG - field doesn't exist
  createdBy: ctx.user.id,     // WRONG - field doesn't exist
});

// FIXED:
await db.insert(scheduledCalls).values({
  organizationId: ctx.organizationId,
  assigneeId: ctx.user.id,    // Correct field name
  customerId,
  scheduledAt: new Date(),
  purpose: "logged_call",
  notes,
  status: "completed",
  completedAt: new Date(),
  outcome: "completed",
  outcomeNotes: notes,
  // Note: duration not supported - add to schema if needed
});
```

This insert will fail at runtime with a Drizzle type error or PostgreSQL column not found error.
