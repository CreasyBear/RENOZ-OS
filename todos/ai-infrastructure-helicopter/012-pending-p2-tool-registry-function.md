---
status: complete
priority: p2
issue_id: "ARCH-007"
tags: [helicopter-review, architecture, ai-infrastructure, tools, registry, group-2]
dependencies: []
---

# ARCH-007: Tool Registry Function

## Problem Statement

Tools are exported as bundled objects but there's no `getToolsForAgent()` function to dynamically retrieve tools by agent name. This makes it harder to configure agents and creates tight coupling.

## Findings

**Source:** Architecture Strategist Agent + Helicopter Review

**Current state:**
```typescript
// src/lib/ai/tools/index.ts
export { customerTools } from './customer-tools';
export { orderTools } from './order-tools';
// ... individual exports, no registry function
```

**Midday pattern:**
```typescript
// Pattern from patterns/04-tool-patterns.md
export function getToolsForAgent(agentName: string) {
  const toolRegistry = {
    customer: {
      getCustomer: getCustomerTool,
      searchCustomers: searchCustomersTool,
      updateCustomerNotes: updateCustomerNotesTool,
    },
    order: {
      getOrders: getOrdersTool,
      getInvoices: getInvoicesTool,
      createOrderDraft: createOrderDraftTool,
    },
    analytics: { ... },
    quote: { ... },
  };
  return toolRegistry[agentName] ?? {};
}
```

**Impact:**
- Agents must manually import specific tool bundles
- No central place to see agent→tool mappings
- Harder to add/remove tools from agents
- No validation that agent has required tools

## Proposed Solutions

### Option A: Registry Function (Recommended)
- **Pros:** Central mapping, dynamic lookup, easy to modify
- **Cons:** Slight indirection
- **Effort:** Small (30 minutes)
- **Risk:** Low

### Option B: Keep Current Pattern
- **Pros:** No changes
- **Cons:** Scattered tool configuration
- **Effort:** None
- **Risk:** Low but less maintainable

## Recommended Action

Option A - Add `getToolsForAgent()` to tools/index.ts.

## Technical Details

**Files to modify:**
- `src/lib/ai/tools/index.ts`

**Implementation:**
```typescript
// src/lib/ai/tools/index.ts

import { customerTools } from './customer-tools';
import { orderTools } from './order-tools';
import { analyticsTools } from './analytics-tools';
import { quoteTools } from './quote-tools';
import { triageTools } from './handoff';

/**
 * Tool registry mapping agent names to their available tools.
 */
const toolRegistry = {
  triage: triageTools,
  customer: customerTools,
  order: orderTools,
  analytics: analyticsTools,
  quote: quoteTools,
} as const;

export type AgentWithTools = keyof typeof toolRegistry;

/**
 * Get tools for a specific agent by name.
 * Returns empty object if agent not found.
 */
export function getToolsForAgent(agentName: string): Record<string, unknown> {
  return toolRegistry[agentName as AgentWithTools] ?? {};
}

/**
 * Check if an agent has a specific tool.
 */
export function agentHasTool(agentName: string, toolName: string): boolean {
  const tools = getToolsForAgent(agentName);
  return toolName in tools;
}

/**
 * Get all tool names for an agent.
 */
export function getToolNamesForAgent(agentName: string): string[] {
  const tools = getToolsForAgent(agentName);
  return Object.keys(tools);
}

/**
 * Get all agents that have a specific tool.
 */
export function getAgentsWithTool(toolName: string): string[] {
  return Object.entries(toolRegistry)
    .filter(([_, tools]) => toolName in tools)
    .map(([agent]) => agent);
}
```

**Usage in agents:**
```typescript
// src/lib/ai/agents/customer.ts
import { getToolsForAgent } from '../tools';

export const customerAgent = createAgent({
  name: 'customer',
  tools: getToolsForAgent('customer'),
  // ...
});
```

## Acceptance Criteria

- [x] `getToolsForAgent()` function implemented
- [x] Returns empty object for unknown agents
- [x] Helper functions for tool introspection: `agentHasTool`, `getToolNamesForAgent`, `getAgentsWithTool`
- [ ] All agents use registry function (optional, agents can still import directly)
- [x] TypeScript compiles without errors (no new errors introduced)
- [x] Type safety for agent names via `AgentWithTools` type

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-26 | Created from helicopter review | Registry pattern enables dynamic tool configuration |
| 2026-01-26 | Implemented tool registry and helper functions | Added imports at top, registry constant, 4 helper functions, and AgentWithTools type export |

## Resources

- `patterns/04-tool-patterns.md` - Tool registry pattern
- `src/lib/ai/tools/index.ts` - Current exports
