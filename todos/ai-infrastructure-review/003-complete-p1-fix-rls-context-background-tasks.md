---
status: complete
priority: p1
issue_id: "003"
tags: [prd-review, security, rls, multi-tenant, ai-infrastructure]
dependencies: []
---

# Fix RLS Context Setting in Background Tasks

## Problem Statement

If AI agent tasks running in Trigger.dev do not properly set RLS context before executing database queries, they could access data across organizations, violating multi-tenant isolation.

The PRD specifies RLS policies with generic descriptions but does not specify HOW RLS context is set for background tasks.

## Findings

**Source:** Security Sentinel Agent

**Severity:** CRITICAL

**Location:** PRD lines 389, 413, 437, 462 (all AI tables mention RLS but not the implementation)

**Risk Scenario:**
1. User A in Org X triggers an AI agent task
2. Task runs in Trigger.dev with service role connection
3. Agent executes `SELECT * FROM customers WHERE ...` without org filter
4. Returns customers from ALL organizations

**Current Implementation Pattern:** The existing `withAuth()` function sets RLS context via:
```typescript
await db.execute(
  sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, true)`
)
```

But Trigger.dev jobs may not have auth context available in the same way.

## Proposed Solutions

### Option A: Explicit Context Setting in Each Job (Recommended)
- **Pros:** Explicit, easy to audit, fails-closed if forgotten
- **Cons:** Requires discipline to call in every job
- **Effort:** Small
- **Risk:** Low if consistently applied

```typescript
// src/trigger/jobs/ai-agent-task.ts
export const aiAgentTaskJob = client.defineJob({
  run: async (payload, io) => {
    const { organizationId, userId } = payload;

    // REQUIRED: Set RLS context before any DB operations
    await setRLSContext(organizationId, userId);

    // Now safe to query
    const agent = await getAgentByType(payload.agent);
    // ...
  }
});
```

### Option B: Middleware Wrapper for All AI Jobs
- **Pros:** Automatic, can't be forgotten
- **Cons:** More infrastructure code
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

Option A with a mandatory code review checklist item: "Does this Trigger.dev job set RLS context?"

Also add integration tests that verify RLS enforcement by attempting cross-tenant queries.

## Technical Details

**Add to PRD story AI-INFRA-011 acceptance criteria:**
```json
"Job handler calls setRLSContext(organizationId, userId) before any database operations",
"Integration test verifies cross-tenant query returns 0 results"
```

**Create helper function:**
```typescript
// src/lib/server/rls-context.ts
export async function setRLSContext(organizationId: string, userId?: string) {
  await db.execute(sql`SELECT set_config('app.organization_id', ${organizationId}, true)`);
  if (userId) {
    await db.execute(sql`SELECT set_config('app.user_id', ${userId}, true)`);
  }
}
```

## Acceptance Criteria

- [ ] All AI Trigger.dev jobs call `setRLSContext()` before DB operations
- [ ] Integration test exists that verifies cross-tenant isolation
- [ ] PRD acceptance criteria updated for AI-INFRA-011
- [ ] Code review checklist includes RLS verification

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-25 | Created from security review | RLS context must be explicitly set in background jobs |

## Resources

- `src/lib/server/protected.ts` - existing withAuth pattern
- Supabase RLS documentation
