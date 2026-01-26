# Agent Architecture Patterns

## Source
- `_reference/.midday-reference/apps/api/src/ai/agents/config/shared.ts`
- `_reference/.midday-reference/apps/api/src/ai/agents/main.ts`
- `_reference/.midday-reference/apps/api/src/ai/agents/*.ts`

## 1. Agent Factory Pattern

Create agents using a factory function that applies standard configuration:

```typescript
// src/lib/ai/agents/config/shared.ts
import { Agent, type AgentConfig } from "@ai-sdk/agent";
import { anthropic } from "@ai-sdk/anthropic";
import type { AppContext } from "./types";
import { memoryProvider } from "../memory/redis-provider";
import { memoryTemplate } from "./memory-template";

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
    },
  });
};
```

## 2. Triage/Router Agent

The router agent uses **forced tool choice** to always handoff - never responds directly.

```typescript
// src/lib/ai/agents/triage.ts
export const triageAgent = createAgent({
  name: "triage",
  model: anthropic("claude-3-5-haiku-20241022"),
  temperature: 0.1,  // CRITICAL: Low for deterministic routing
  maxTurns: 1,       // CRITICAL: Single turn only
  modelSettings: {
    toolChoice: {
      type: "tool",
      toolName: "handoff_to_agent",  // FORCES tool use
    },
  },
  instructions: (ctx) => `Route user requests to the appropriate specialist.

<background-data>
${formatContextForLLM(ctx)}
</background-data>

<agent-capabilities>
customer: Customer lookups, contact management, relationship insights
order: Order queries, invoice status, quote creation
analytics: Reports, metrics, trends, forecasting
quote: Product configuration, pricing, system design
</agent-capabilities>

IMPORTANT: Always use handoff_to_agent. Never respond directly.`,
  handoffs: [customerAgent, orderAgent, analyticsAgent, quoteAgent],
});
```

### Key Design Decisions

1. **Forced Tool Choice**: `modelSettings.toolChoice` ensures router ALWAYS delegates
2. **Single Turn**: `maxTurns: 1` prevents router from continuing after handoff
3. **Low Temperature**: 0.1 for consistent, predictable routing
4. **Cheap Model**: Haiku for cost efficiency on simple routing task
5. **Clear Capabilities**: XML-formatted for reliable LLM parsing

## 3. Specialist Agent Pattern

Domain agents handle specific capabilities with higher autonomy.

```typescript
// src/lib/ai/agents/customer.ts
export const customerAgent = createAgent({
  name: "customer",
  model: anthropic("claude-sonnet-4-20250514"),
  temperature: 0.3,  // Balanced precision for data work
  maxTurns: 10,      // Allow multi-step conversations
  instructions: (ctx) => `You are a customer specialist for ${ctx.companyName}.

<background-data>
${formatContextForLLM(ctx)}
</background-data>

${COMMON_AGENT_RULES}

<agent-specific-rules>
- For direct queries: lead with results, add context after
- For customer lookup: include recent activity summary
- For relationship insights: provide churn risk and suggested actions
</agent-specific-rules>`,
  tools: {
    getCustomer: getCustomerTool,
    searchCustomers: searchCustomersTool,
    updateCustomerNotes: updateCustomerNotesTool,
    getCustomerHistory: getCustomerHistoryTool,
  },
});
```

## 4. Temperature Strategy

| Agent Role | Temperature | Use Case |
|------------|-------------|----------|
| Triage/Router | 0.1 | Deterministic routing decisions |
| Data Agents | 0.3 | Accurate data retrieval and formatting |
| Analytics | 0.5 | Balanced insights and recommendations |
| Creative | 0.7-0.8 | Email drafts, descriptions, content |

```typescript
// Temperature by agent type
const TEMPERATURES = {
  triage: 0.1,
  customer: 0.3,
  order: 0.3,
  analytics: 0.5,
  quote: 0.3,
  // For creative tasks within agents:
  emailDraft: 0.7,
  description: 0.8,
} as const;
```

## 5. Model Selection

| Use Case | Model | Rationale |
|----------|-------|-----------|
| Routing | claude-3-5-haiku | Fast, cheap, sufficient for routing |
| Specialists | claude-sonnet-4 | Quality/cost balance for domain work |
| Background Tasks | claude-sonnet-4 | Reliability for autonomous workflows |

## 6. Handoff Configuration

Agents can handoff to each other for cross-domain queries:

```typescript
// Analytics can handoff to reports for detailed data
export const analyticsAgent = createAgent({
  // ...
  handoffs: [reportsAgent],
});

// General agent has broad handoff network
export const generalAgent = createAgent({
  // ...
  handoffs: [
    customerAgent,
    orderAgent,
    analyticsAgent,
    quoteAgent,
  ],
});
```

### Handoff Rules
- Handoff happens when current agent's tools can't answer
- Agent self-selects based on capability description
- `maxTurns` prevents infinite loops
- Bidirectional handoffs are allowed (analytics ↔ reports)

## 7. Agent Registry

Export all agents from a central registry:

```typescript
// src/lib/ai/agents/index.ts
export { triageAgent } from "./triage";
export { customerAgent } from "./customer";
export { orderAgent } from "./order";
export { analyticsAgent } from "./analytics";
export { quoteAgent } from "./quote";

export function getAgentByName(name: string) {
  const agents = {
    triage: triageAgent,
    customer: customerAgent,
    order: orderAgent,
    analytics: analyticsAgent,
    quote: quoteAgent,
  };
  return agents[name];
}
```

## Usage in PRD Stories

- **AI-INFRA-005**: Haiku Triage Router - Use triage pattern
- **AI-INFRA-006**: Specialist Agent Configuration - Use specialist pattern
