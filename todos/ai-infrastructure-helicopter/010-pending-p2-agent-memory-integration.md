---
status: pending
priority: p2
issue_id: "ARCH-005"
tags: [helicopter-review, architecture, ai-infrastructure, memory, agents, group-1]
dependencies: ["ARCH-004"]
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

## Technical Details

**Files to create:**
- `src/lib/ai/agents/factory.ts` - createAgent factory function

**Files to modify:**
- `src/lib/ai/agents/customer.ts` - Use createAgent
- `src/lib/ai/agents/order.ts` - Use createAgent
- `src/lib/ai/agents/analytics.ts` - Use createAgent
- `src/lib/ai/agents/quote.ts` - Use createAgent
- `src/lib/ai/agents/triage.ts` - Use createAgent
- `package.json` - Add @ai-sdk-tools/agents if needed

**Memory template file:**
Create `src/lib/ai/agents/config/memory-template.md`:
```markdown
<user_profile>
Name: {{fullName}}
Role: {{role}}
</user_profile>

<business_context>
Organization: {{companyName}}
Active Customer: {{activeCustomer}}
Current Page: {{currentPage}}
</business_context>

<conversation_focus>
Topics discussed: {{topics}}
Key concerns: {{concerns}}
</conversation_focus>

<communication_preferences>
Preferred style: {{preferredStyle}}
Response format: {{responseFormat}}
</communication_preferences>
```

**Implementation:**
```typescript
// src/lib/ai/agents/factory.ts
import { Agent, type AgentConfig } from '@ai-sdk-tools/agents';
import { memoryProvider } from '../memory/redis-provider';
import { readFileSync } from 'fs';
import { join } from 'path';

const memoryTemplate = readFileSync(
  join(process.cwd(), 'src/lib/ai/agents/config/memory-template.md'),
  'utf-8'
);

export function createAgent<TContext extends AppContext>(
  config: AgentConfig<TContext>
) {
  return new Agent({
    ...config,
    memory: {
      provider: memoryProvider,
      history: { enabled: true, limit: 10 },
      workingMemory: {
        enabled: true,
        template: memoryTemplate,
        scope: 'user',
      },
    },
  });
}

// Usage in customer.ts
export const customerAgent = createAgent({
  name: 'customer',
  model: anthropic('claude-sonnet-4-20250514'),
  temperature: 0.3,
  maxTurns: 10,
  instructions: (ctx) => `...`,
  tools: customerTools,
});
```

## Acceptance Criteria

- [ ] `createAgent()` factory function implemented
- [ ] All specialist agents use createAgent
- [ ] Memory template file created
- [ ] Redis provider properly configured
- [ ] Conversation history persists across sessions
- [ ] Working memory updates during conversation
- [ ] TypeScript compiles without errors

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-26 | Created from helicopter review | Memory integration essential for conversation continuity |

## Resources

- `_reference/.midday-reference/apps/api/src/ai/agents/config/shared.ts` - createAgent implementation
- `_reference/.midday-reference/apps/api/src/ai/agents/config/memory-template.md` - Template example
- `src/lib/ai/memory/redis-provider.ts` - Existing Redis provider
- `patterns/06-memory-templates.md` - Memory pattern documentation
