# Triage Router Agent Example

## Source
- `_reference/.midday-reference/apps/api/src/ai/agents/main.ts`

## Complete Implementation

```typescript
// src/lib/ai/agents/triage.ts
import { Agent } from "@ai-sdk/agent";
import { anthropic } from "@ai-sdk/anthropic";
import type { AppContext } from "../context/types";
import { formatContextForLLM } from "../prompts/format-context";
import { SECURITY_INSTRUCTIONS } from "../prompts/security";

// Define specialist agents for handoff
const SPECIALIST_AGENTS = [
  "customer",
  "order",
  "quote",
  "analytics",
] as const;

type SpecialistAgent = typeof SPECIALIST_AGENTS[number];

// Routing tool for agent selection
const routeToAgentTool = {
  name: "routeToAgent",
  description: "Route the user's request to the appropriate specialist agent",
  parameters: {
    type: "object",
    properties: {
      agent: {
        type: "string",
        enum: SPECIALIST_AGENTS,
        description: "The specialist agent to handle this request",
      },
      reason: {
        type: "string",
        description: "Brief reason for this routing decision",
      },
    },
    required: ["agent", "reason"],
  },
};

// Triage agent instructions
function getTriageInstructions(ctx: AppContext): string {
  return `You are a triage router for ${ctx.companyName}'s CRM assistant.

${formatContextForLLM(ctx)}

${SECURITY_INSTRUCTIONS}

<routing_rules>
Your ONLY job is to route requests to the correct specialist agent.

CRITICAL: You MUST call the routeToAgent tool for EVERY request.
Never respond directly to the user - always route to a specialist.

Route to:
- "customer" → Customer lookups, contact info, history, notes, churn risk
- "order" → Orders, invoices, payments, fulfillment, shipping
- "quote" → Quotes, pricing, product configuration, estimates
- "analytics" → Reports, metrics, trends, revenue, performance data

Examples:
- "Find John Smith" → customer (direct lookup)
- "Show recent orders" → order (order listing)
- "How much for 10 windows?" → quote (pricing request)
- "Revenue this month" → analytics (metrics request)
- "Customer's payment history" → order (payment is order domain)

If genuinely ambiguous, default to "customer" agent.
</routing_rules>`;
}

// Create the triage agent
export function createTriageAgent(ctx: AppContext) {
  return new Agent({
    name: "triage",
    model: anthropic("claude-3-5-haiku-20241022"), // Fast, cheap for routing
    temperature: 0.1, // Near-deterministic for consistent routing
    maxTurns: 1, // Single turn - just route and done
    instructions: getTriageInstructions(ctx),
    tools: {
      routeToAgent: routeToAgentTool,
    },
    // Force tool call - agent MUST use routeToAgent
    toolChoice: {
      type: "tool",
      toolName: "routeToAgent",
    },
    // Define handoff targets
    handoffs: SPECIALIST_AGENTS.map((agent) => ({
      name: agent,
      description: getAgentDescription(agent),
    })),
  });
}

function getAgentDescription(agent: SpecialistAgent): string {
  const descriptions: Record<SpecialistAgent, string> = {
    customer: "Handles customer lookups, contact management, notes, and relationship insights",
    order: "Handles orders, invoices, payments, fulfillment, and shipping",
    quote: "Handles quotes, pricing, product configuration, and estimates",
    analytics: "Handles reports, metrics, trends, and performance analysis",
  };
  return descriptions[agent];
}
```

## Usage in Chat API

```typescript
// src/routes/api/ai/chat.ts
import { createTriageAgent } from "@/lib/ai/agents/triage";
import { getSpecialistAgent } from "@/lib/ai/agents/specialists";
import { buildAppContext } from "@/lib/ai/context/builder";

export const chatHandler = createServerFn({ method: "POST" })
  .inputValidator(chatInputSchema)
  .handler(async ({ data }) => {
    const ctx = await buildAppContext(data);

    // Start with triage
    const triageAgent = createTriageAgent(ctx);
    const triageResult = await triageAgent.run(data.message);

    // Extract routing decision
    const routeCall = triageResult.toolCalls.find(
      (tc) => tc.name === "routeToAgent"
    );

    if (!routeCall) {
      throw new Error("Triage failed to route request");
    }

    const { agent: targetAgent, reason } = routeCall.arguments;

    // Hand off to specialist
    const specialistAgent = getSpecialistAgent(targetAgent, ctx);
    const result = await specialistAgent.run(data.message);

    return {
      response: result.text,
      agent: targetAgent,
      routingReason: reason,
    };
  });
```

## Key Patterns

### 1. Forced Tool Choice
```typescript
toolChoice: {
  type: "tool",
  toolName: "routeToAgent",
}
```
This ensures the agent ALWAYS calls the routing tool, never responds directly.

### 2. Haiku Model
```typescript
model: anthropic("claude-3-5-haiku-20241022")
```
Use Haiku for routing - it's fast and cheap, perfect for simple classification.

### 3. Low Temperature
```typescript
temperature: 0.1
```
Near-deterministic routing for consistent behavior.

### 4. Single Turn
```typescript
maxTurns: 1
```
Routing should complete in one turn - no back-and-forth needed.

### 5. Handoff Array
```typescript
handoffs: SPECIALIST_AGENTS.map((agent) => ({
  name: agent,
  description: getAgentDescription(agent),
}))
```
Explicit handoff definitions enable the AI SDK to manage agent transitions.

## Testing

```typescript
// tests/ai/agents/triage.test.ts
import { describe, it, expect } from "vitest";
import { createTriageAgent } from "@/lib/ai/agents/triage";

describe("Triage Agent", () => {
  const mockCtx = {
    organizationId: "org-123",
    userId: "user-456",
    companyName: "Test Company",
    // ... other context
  };

  it("routes customer queries to customer agent", async () => {
    const agent = createTriageAgent(mockCtx);
    const result = await agent.run("Find customer John Smith");

    const routeCall = result.toolCalls[0];
    expect(routeCall.name).toBe("routeToAgent");
    expect(routeCall.arguments.agent).toBe("customer");
  });

  it("routes order queries to order agent", async () => {
    const agent = createTriageAgent(mockCtx);
    const result = await agent.run("Show me recent orders");

    const routeCall = result.toolCalls[0];
    expect(routeCall.arguments.agent).toBe("order");
  });

  it("routes analytics queries to analytics agent", async () => {
    const agent = createTriageAgent(mockCtx);
    const result = await agent.run("What was revenue last month?");

    const routeCall = result.toolCalls[0];
    expect(routeCall.arguments.agent).toBe("analytics");
  });
});
```
