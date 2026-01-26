---
status: pending
priority: p2
issue_id: "014"
tags: [prd-review, api, agent-native, ai-infrastructure]
dependencies: []
---

# Add Task Cancellation API Endpoint

## Problem Statement

The PRD mentions "Job cancellable via Trigger.dev dashboard or API" but does not define a CRM API endpoint for cancellation. Long-running agent tasks cannot be cancelled programmatically through the CRM.

## Findings

**Source:** Agent-Native Reviewer Agent

**Location:** PRD story AI-INFRA-011, line 661

**Current state:**
- `GET /api/ai/agent/:taskId/status` - exists (monitoring)
- `DELETE /api/ai/agent/:taskId` - NOT defined (cancellation)

**Gap:** External agents or CRM UI cannot cancel tasks without accessing Trigger.dev directly.

## Proposed Solutions

### Option A: Add DELETE Endpoint (Recommended)
- **Pros:** Standard REST pattern, programmatic access
- **Cons:** Additional API route
- **Effort:** Small
- **Risk:** Low

### Option B: Add Cancel Action to Status Endpoint
- **Pros:** Single endpoint
- **Cons:** Non-standard pattern
- **Effort:** Small
- **Risk:** Low

## Recommended Action

Option A - Add `DELETE /api/ai/agent/:taskId` endpoint.

## Technical Details

**Add to PRD api_endpoints.agent:**
```json
"cancel": {
  "method": "DELETE",
  "path": "/api/ai/agent/:taskId",
  "response": {
    "success": "boolean",
    "task": "AiAgentTask"
  },
  "description": "Cancel a queued or running agent task"
}
```

**Add to story AI-INFRA-011 acceptance criteria:**
```json
"File src/routes/api/ai/agent.$taskId.ts exports DELETE handler",
"Validates task belongs to user's organization",
"Updates task status to 'cancelled' if queued",
"Signals Trigger.dev to abort if running",
"Returns 404 if task not found",
"Returns 409 if task already completed/failed"
```

**Implementation:**
```typescript
// src/routes/api/ai/agent.$taskId.ts
import { createAPIFileRoute } from '@tanstack/react-start/api';
import { withAuth } from '@/lib/server/protected';

export const Route = createAPIFileRoute('/api/ai/agent/$taskId')({
  DELETE: async ({ params }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.ai.manage });
    const { taskId } = params;

    const [task] = await db
      .select()
      .from(aiAgentTasks)
      .where(and(
        eq(aiAgentTasks.id, taskId),
        eq(aiAgentTasks.organizationId, ctx.organizationId)
      ));

    if (!task) {
      return new Response(JSON.stringify({ error: 'Task not found' }), { status: 404 });
    }

    if (['completed', 'failed', 'cancelled'].includes(task.status)) {
      return new Response(JSON.stringify({ error: 'Task already finished' }), { status: 409 });
    }

    // Cancel in Trigger.dev if running
    if (task.status === 'running') {
      await triggerClient.cancelRun(task.triggerRunId);
    }

    // Update status
    const [updated] = await db
      .update(aiAgentTasks)
      .set({
        status: 'cancelled',
        cancelledAt: sql`NOW()`,
        cancelledBy: ctx.userId,
      })
      .where(eq(aiAgentTasks.id, taskId))
      .returning();

    return Response.json({ success: true, task: updated });
  },
});
```

**Schema update needed:**
Add `cancelled` to status enum, add `cancelledAt`, `cancelledBy` columns.

## Acceptance Criteria

- [ ] DELETE endpoint added to PRD api_endpoints
- [ ] `cancelled` added to task status enum
- [ ] `cancelled_at`, `cancelled_by` columns added to schema
- [ ] Story AI-INFRA-011 acceptance criteria updated

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-25 | Created from agent-native review | Task lifecycle needs full programmatic control |

## Resources

- Trigger.dev cancellation API
- REST API design patterns
