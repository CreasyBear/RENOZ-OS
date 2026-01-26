---
status: complete
priority: p3
issue_id: "018"
tags: [prd-review, conventions, server-functions, ai-infrastructure]
dependencies: []
---

# Use createServerFn Pattern for AI Server Functions

## Problem Statement

The PRD references direct API route handlers but does not use the project's `createServerFn` pattern for server functions, which provides:
- Input validation with Zod
- Auth middleware integration
- Consistent error handling
- Type safety

## Findings

**Source:** Pattern Recognition Specialist Agent

**Location:** PRD throughout (API route descriptions)

**Current PRD approach:**
```typescript
// Implied in PRD
export async function POST(request: Request) {
  const body = await request.json();
  // Manual validation
  // Manual auth check
  // ...
}
```

**Project standard (from CLAUDE.md):**
```typescript
import { createServerFn } from '@tanstack/react-start';
import { withAuth } from '@/lib/server/protected';

export const getAiApprovals = createServerFn({ method: 'GET' })
  .inputValidator(aiApprovalsQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.ai.read });
    // ...
  });
```

## Proposed Solutions

### Option A: Update PRD to Use createServerFn (Recommended)
- **Pros:** Consistent with existing patterns
- **Cons:** PRD restructure needed
- **Effort:** Medium
- **Risk:** Low

### Option B: Document as Implementation Guidance
- **Pros:** Simpler PRD
- **Cons:** May be missed during implementation
- **Effort:** Small
- **Risk:** Medium

## Recommended Action

Option A - Update PRD to specify `createServerFn` pattern and add server functions to `src/server/functions/ai/`.

## Technical Details

**Proposed file structure:**
```
src/server/functions/ai/
├── get-approvals.ts
├── approve-action.ts
├── reject-action.ts
├── get-conversations.ts
├── get-cost-usage.ts
├── get-budget-status.ts
├── dispatch-agent-task.ts
├── get-task-status.ts
├── cancel-task.ts
└── index.ts
```

**Example implementation:**
```typescript
// src/server/functions/ai/get-approvals.ts
import { createServerFn } from '@tanstack/react-start';
import { withAuth } from '@/lib/server/protected';
import { aiApprovalsQuerySchema } from '@/lib/schemas/ai/approvals';

export const getAiApprovals = createServerFn({ method: 'GET' })
  .inputValidator(aiApprovalsQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.ai.read });

    const conditions = [
      eq(aiApprovals.organizationId, ctx.organizationId),
      sql`${aiApprovals.deletedAt} IS NULL`,
    ];

    if (data.status) {
      conditions.push(eq(aiApprovals.status, data.status));
    }

    return db.select()
      .from(aiApprovals)
      .where(and(...conditions))
      .orderBy(desc(aiApprovals.createdAt))
      .limit(data.limit ?? 20);
  });
```

**Update PRD acceptance criteria to reference:**
- Server function file path
- Zod schema requirement
- withAuth middleware usage
- organizationId filtering

## Acceptance Criteria

- [ ] PRD stories reference createServerFn pattern
- [ ] Server functions organized in src/server/functions/ai/
- [ ] Zod schemas defined in src/lib/schemas/ai/
- [ ] withAuth middleware used consistently

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-25 | Created from pattern review | AI should follow existing server function conventions |

## Resources

- CLAUDE.md Server Function Pattern
- Existing functions in src/server/functions/
