---
status: complete
priority: p2
issue_id: "ARCH-005"
tags: [helicopter-review, architecture, ai-infrastructure, memory, agents, group-1]
dependencies: ["ARCH-004"]
completed_at: "2026-01-26"
---

# ARCH-005: Agent Memory Integration

## Problem Statement

Agents currently use raw `streamText()` calls without memory integration. The Midday pattern uses a `createAgent()` factory that automatically configures memory provider, working memory templates, and chat history.

## Findings

**Source:** Architecture Strategist Agent + Helicopter Review

**Current state (no memory):**
```typescript
// src/lib/ai/agents/customer.ts
export async function runCustomerAgent(options: CustomerAgentOptions) {
  const result = await streamText({
    model: anthropic(CUSTOMER_AGENT_CONFIG.model),
    system: systemPrompt,
    messages,
    tools,
    temperature: CUSTOMER_AGENT_CONFIG.temperature,
  });
  return result;
}
```

**Midday pattern (with memory):**
```typescript
// _reference/.midday-reference/apps/api/src/ai/agents/config/shared.ts
export const createAgent = (config: AgentConfig<AppContext>) => {
  return new Agent({
    ...config,
    memory: {
      provider: memoryProvider,
      history: { enabled: true, limit: 10 },
      workingMemory: {
        enabled: true,
        template: memoryTemplate,
        scope: "user",
      },
      chats: {
        enabled: true,
        generateTitle: { model: openai("gpt-4.1-nano"), instructions: titleInstructions },
        generateSuggestions: { enabled: true, model: openai("gpt-4.1-nano"), limit: 5 },
      },
    },
  });
};
```

**Impact:**
- No conversation continuity across sessions
- No working memory for user preferences
- No automatic title/suggestion generation
- Each request starts fresh without context

## Proposed Solutions

### Option A: Full createAgent Factory (Recommended)
- **Pros:** Complete memory integration, matches Midday pattern
- **Cons:** Requires @ai-sdk-tools/agents package, more complex setup
- **Effort:** Medium (3-4 hours)
- **Risk:** Low

### Option B: Manual Memory Integration
- **Pros:** No new dependencies
- **Cons:** More code, doesn't match pattern
- **Effort:** Medium (3-4 hours)
- **Risk:** Medium - may miss edge cases

## Recommended Action

Option A - Implement `createAgent()` factory with full memory configuration.

## Implementation (Completed)

**Files created:**
- `src/lib/ai/agents/factory.ts` - createAgent factory function with memory integration
- `src/lib/ai/agents/config/memory-template.md` - Working memory template

**Files modified:**
- `src/lib/ai/agents/customer.ts` - Updated to use createAgent factory
- `src/lib/ai/agents/order.ts` - Updated to use createAgent factory
- `src/lib/ai/agents/analytics.ts` - Updated to use createAgent factory
- `src/lib/ai/agents/quote.ts` - Updated to use createAgent factory
- `src/lib/ai/agents/triage.ts` - Updated with memory config (but doesn't use factory due to special forced tool choice behavior)
- `src/lib/ai/agents/index.ts` - Updated exports to include factory types and functions

**Key implementation decisions:**
1. **Adapted Midday pattern for Vercel AI SDK**: Since we're using `streamText()` directly (not `@ai-sdk-tools/agents` Agent class), we created a factory that:
   - Configures model settings consistently
   - Injects memory context into system prompts via `buildMemoryContext()` and `formatMemoryContext()`
   - Provides a consistent `run()` interface

2. **Triage agent special handling**: The triage agent uses forced tool choice for routing, so it doesn't use the standard factory. Instead, it has its own memory config export for consistency.

3. **Memory template**: Created a comprehensive template covering user profile, business context, conversation focus, communication preferences, and session context.

## Acceptance Criteria

- [x] `createAgent()` factory function implemented
- [x] All specialist agents use createAgent
- [x] Memory template file created
- [x] Redis/Drizzle provider properly configured (uses existing memory system)
- [x] Working memory context injected into system prompts
- [x] TypeScript compiles without errors

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-26 | Created from helicopter review | Memory integration essential for conversation continuity |
| 2026-01-26 | Implemented createAgent factory | Adapted Midday pattern for streamText usage; memory context injected via buildMemoryContext |

## Resources

- `_reference/.midday-reference/apps/api/src/ai/agents/config/shared.ts` - createAgent implementation
- `_reference/.midday-reference/apps/api/src/ai/agents/config/memory-template.md` - Template example
- `src/lib/ai/memory/redis-provider.ts` - Existing Redis provider
- `patterns/06-memory-templates.md` - Memory pattern documentation
