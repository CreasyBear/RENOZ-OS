---
status: complete
priority: p2
issue_id: "009"
tags: [prd-review, tanstack-query, conventions, ai-infrastructure]
dependencies: []
---

# Add TanStack Query Keys for AI Domain

## Problem Statement

The PRD does not specify adding AI query keys to `src/lib/query-keys.ts`, which is MANDATORY per project standards. All server data must use centralized query keys for cache invalidation.

## Findings

**Source:** Pattern Recognition Specialist Agent, Architecture Strategist Agent

**Location:** `src/lib/query-keys.ts` (needs additions)

**Current state:** No AI query keys defined

**Required by CLAUDE.md:**
> "Query Keys: Always use centralized keys from `@/lib/query-keys.ts`. Never define local query keys."

## Proposed Solutions

### Option A: Add AI Query Keys to PRD Requirements (Recommended)
- **Pros:** Ensures consistency from start
- **Cons:** PRD modification needed
- **Effort:** Small
- **Risk:** Low

## Recommended Action

Add query keys definition to PRD acceptance criteria for relevant stories.

## Technical Details

**Add to `src/lib/query-keys.ts`:**
```typescript
ai: {
  all: ['ai'] as const,
  conversations: {
    all: () => [...queryKeys.ai.all, 'conversations'] as const,
    lists: () => [...queryKeys.ai.conversations.all(), 'list'] as const,
    list: (filters?: AiConversationFilters) =>
      [...queryKeys.ai.conversations.lists(), filters ?? {}] as const,
    detail: (id: string) =>
      [...queryKeys.ai.conversations.all(), 'detail', id] as const,
  },
  approvals: {
    all: () => [...queryKeys.ai.all, 'approvals'] as const,
    lists: () => [...queryKeys.ai.approvals.all(), 'list'] as const,
    list: (status?: string) =>
      [...queryKeys.ai.approvals.lists(), { status }] as const,
    detail: (id: string) =>
      [...queryKeys.ai.approvals.all(), 'detail', id] as const,
    pending: () => [...queryKeys.ai.approvals.all(), 'pending'] as const,
  },
  tasks: {
    all: () => [...queryKeys.ai.all, 'tasks'] as const,
    detail: (id: string) =>
      [...queryKeys.ai.tasks.all(), 'detail', id] as const,
    status: (id: string) =>
      [...queryKeys.ai.tasks.all(), 'status', id] as const,
  },
  cost: {
    all: () => [...queryKeys.ai.all, 'cost'] as const,
    usage: (filters?: AiCostFilters) =>
      [...queryKeys.ai.cost.all(), 'usage', filters ?? {}] as const,
    budget: () => [...queryKeys.ai.cost.all(), 'budget'] as const,
  },
  artifacts: {
    all: () => [...queryKeys.ai.all, 'artifacts'] as const,
    detail: (id: string) =>
      [...queryKeys.ai.artifacts.all(), 'detail', id] as const,
  },
},
```

**Add to PRD (possibly new story AI-INFRA-022):**
```json
{
  "id": "AI-INFRA-022",
  "name": "TanStack Query Key Integration",
  "acceptance_criteria": [
    "Query keys for ai domain added to src/lib/query-keys.ts",
    "Keys cover conversations, approvals, tasks, cost, artifacts",
    "Hooks in src/hooks/ai/ use these query keys"
  ]
}
```

## Acceptance Criteria

- [ ] Query keys added to `src/lib/query-keys.ts`
- [ ] PRD updated to reference query key requirements
- [ ] All AI hooks use centralized query keys

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-25 | Created from pattern review | All domains must have centralized query keys |

## Resources

- `src/lib/query-keys.ts`
- CLAUDE.md Data Fetching Rules
- STANDARDS.md Hook Patterns
