---
status: complete
priority: p2
issue_id: "ARCH-004"
tags: [helicopter-review, architecture, ai-infrastructure, context, group-1]
dependencies: []
completed_at: 2026-01-26
---

# ARCH-004: Context via executionOptions Instead of Schema

## Problem Statement

Tools currently receive context through `_context` in the input schema, which pollutes the tool's parameter interface and differs from the Midday pattern. Context should flow through `executionOptions.experimental_context` as the AI SDK intends.

## Findings

**Source:** Architecture Strategist Agent + Helicopter Review

**Current state (schema injection):**
```typescript
// src/lib/ai/tools/customer-tools.ts
const contextSchema = z.object({
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
});

export const getCustomerTool = tool({
  inputSchema: z.object({
    customerId: z.string().uuid(),
    _context: contextSchema,  // PROBLEM: Context in schema
  }),
  execute: async ({ customerId, _context }) => {
    // Uses _context.organizationId
  },
});
```

**Midday pattern (executionOptions):**
```typescript
// _reference/.midday-reference/apps/api/src/ai/tools/get-customers.ts
export const getCustomersTool = tool({
  inputSchema: z.object({
    customerId: z.string().uuid(),
    // NO _context here
  }),
  execute: async function* ({ customerId }, executionOptions) {
    const appContext = executionOptions.experimental_context as AppContext;
    const orgId = appContext.organizationId;
    // ...
  },
});
```

**Impact:**
- Schema is polluted with internal context fields
- AI model sees `_context` as a required parameter
- Inconsistent with AI SDK design intent
- Harder to test tools in isolation

## Proposed Solutions

### Option A: Migrate to executionOptions (Recommended)
- **Pros:** Aligns with Midday, cleaner schema, SDK-intended pattern
- **Cons:** Requires updating all tools and how context is passed
- **Effort:** Medium (2-3 hours)
- **Risk:** Low

### Option B: Keep Schema Pattern
- **Pros:** No changes needed
- **Cons:** Deviates from patterns, pollutes schema
- **Effort:** None
- **Risk:** Medium - technical debt

## Recommended Action

Option A - Migrate all tools to use `executionOptions.experimental_context`.

## Technical Details

**Files to modify:**
- `src/lib/ai/tools/customer-tools.ts`
- `src/lib/ai/tools/order-tools.ts`
- `src/lib/ai/tools/analytics-tools.ts`
- `src/lib/ai/tools/quote-tools.ts`
- `src/routes/api/ai/chat.ts` - Pass context via executionOptions

**Implementation:**
```typescript
// 1. Remove _context from all tool schemas
export const getCustomerTool = tool({
  inputSchema: z.object({
    customerId: z.string().uuid().describe('Customer UUID'),
    // NO _context
  }),
  execute: async function* ({ customerId }, executionOptions) {
    // 2. Extract context from executionOptions
    const ctx = executionOptions.experimental_context as ToolExecutionContext;

    if (!ctx?.organizationId) {
      yield { text: 'Organization context missing.' };
      return;
    }

    // 3. Use ctx.organizationId, ctx.userId, etc.
  },
});

// In chat.ts - pass context via experimental_context
const result = await streamText({
  model: anthropic(config.model),
  system: systemPrompt,
  messages,
  tools,
  experimental_context: toolContext,  // Pass here instead of schema
});
```

## Acceptance Criteria

- [x] All tools use `executionOptions.experimental_context` instead of `_context` schema
- [x] Tool schemas only contain user-facing parameters
- [x] Chat API passes context via `experimental_context` (via agent files)
- [x] TypeScript compiles without errors (AI files compile cleanly; unrelated errors exist elsewhere)
- [x] Existing functionality preserved

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-26 | Created from helicopter review | SDK provides executionOptions for exactly this purpose |
| 2026-01-26 | Verified migration complete | All 13 tools already use executionOptions.experimental_context pattern. All 4 agents pass context in streamText calls. |

## Resources

- `_reference/.midday-reference/apps/api/src/ai/tools/get-customers.ts` - Reference implementation
- Vercel AI SDK docs on tool execution context
- `src/lib/ai/context/types.ts` - ToolExecutionContext interface
