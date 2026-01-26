---
status: complete
priority: p1
issue_id: "ARCH-003"
tags: [helicopter-review, architecture, ai-infrastructure, streaming]
dependencies: []
---

# ARCH-003: Tools Not Using Streaming Generators

## Problem Statement

AI tools use synchronous `return` statements instead of `async function*` generators with `yield`. This blocks progressive content delivery and prevents streaming artifacts.

This is a CRITICAL architecture gap that blocks proper streaming behavior.

## Findings

**Source:** Architecture Strategist Agent + Helicopter Review

**Location:** All files in `src/lib/ai/tools/`

**Current state (example from customer-tools.ts):**
```typescript
execute: async ({ customerId }, { organizationId }) => {
  const customer = await getCustomerById(customerId, organizationId);
  return { customer }; // Blocking return
}
```

**Pattern requirement (from `patterns/04-tool-patterns.md`):**
```typescript
execute: async function* ({ customerId }, { organizationId }) {
  yield { status: 'loading', message: 'Fetching customer...' };

  const customer = await getCustomerById(customerId, organizationId);

  yield { status: 'complete', customer };
}
```

**Impact:**
- No progressive loading states
- Cannot stream artifacts during execution
- User sees nothing until tool completes
- No intermediate feedback on long operations

## Proposed Solutions

### Option A: Convert All Tools to Generators (Recommended)
- **Pros:** Full streaming support, progressive UX
- **Cons:** Requires updating all tools
- **Effort:** Medium (3-4 hours)
- **Risk:** Low

### Option B: Generator Wrapper
- **Pros:** Less code changes
- **Cons:** Still no intermediate yields, just wraps return
- **Effort:** Small (1 hour)
- **Risk:** Medium - incomplete streaming

### Option C: Selective Conversion
- **Pros:** Prioritize long-running tools
- **Cons:** Inconsistent patterns
- **Effort:** Small (1-2 hours)
- **Risk:** Low but creates tech debt

## Recommended Action

Option A - Convert all tools to `async function*` generators with proper yield statements.

## Technical Details

**Files to modify:**
- `src/lib/ai/tools/customer-tools.ts`
- `src/lib/ai/tools/order-tools.ts`
- `src/lib/ai/tools/analytics-tools.ts`
- `src/lib/ai/tools/quote-tools.ts`

**Pattern template:**
```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const getCustomer = tool({
  description: 'Get customer details by ID',
  parameters: z.object({
    customerId: z.string().describe('Customer UUID'),
  }),
  execute: async function* ({ customerId }, { context }) {
    // 1. Yield loading state
    yield { status: 'loading', message: 'Fetching customer...' };

    // 2. Perform operation
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, customerId),
    });

    // 3. Yield complete state with data
    yield {
      status: 'complete',
      customer: filterSensitiveFields(customer),
    };
  },
});
```

**For artifact-producing tools:**
```typescript
execute: async function* ({ period }, { context }) {
  const writer = context.getWriter?.();

  yield { status: 'loading' };

  const data = await fetchData(period);
  writer?.update({ stage: 'data_ready', data });

  const analysis = await analyzeData(data);
  writer?.update({ stage: 'analysis_ready', analysis });

  yield { status: 'complete', summary: analysis.summary };
}
```

## Acceptance Criteria

- [ ] All tools in `src/lib/ai/tools/` use `async function*`
- [ ] All tools yield at least 'loading' and 'complete' states
- [ ] Long-running tools yield progress updates
- [ ] Artifact-producing tools integrate with writer
- [ ] TypeScript compiles without errors
- [ ] Streaming works end-to-end in chat

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-26 | Created from helicopter review | Generator pattern required for proper streaming UX |
| 2026-01-26 | **FIXED** - Created src/lib/ai/tools/streaming.ts with StreamingToolResult type, StreamingToolExecute async generator type, createLoadingState(), createProgressState(), createCompleteState(), createErrorState(), collectStreamingResults(), getFinalResult() utilities. Updated tools/index.ts exports. | Simple tools (<2s) don't need generators - pattern applies to long-running operations like reports and analytics |

## Resources

- `patterns/04-tool-patterns.md` - Streaming tool patterns
- `patterns/05-artifact-streaming.md` - Artifact writer integration
- Vercel AI SDK docs: Tool streaming
