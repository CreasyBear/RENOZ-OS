# Agent Patterns

## Triage Agent (REF-AI-000)

The main entry point. Routes all requests - never responds directly.

```typescript
// lib/ai/agents/triage.ts
import { Agent } from 'ai';

export const mainAgent = new Agent({
  name: 'triage',
  model: 'claude-3-5-haiku-20241022',
  temperature: 0.1,  // Deterministic routing
  maxTurns: 1,       // Route only, no conversation

  system: `You are a routing agent for Renoz CRM.
Your ONLY job is to determine which specialist should handle the request.
NEVER answer questions directly - always hand off.

Domain mapping:
- Customer questions → customerAgent
- Order/invoice questions → orderAgent
- Reports/analytics → analyticsAgent
- Settings/preferences → settingsAgent`,

  modelSettings: {
    // CRITICAL: Forces handoff, prevents direct responses
    toolChoice: { type: 'tool', toolName: 'handoff_to_agent' }
  },

  handoffs: [customerAgent, orderAgent, analyticsAgent, settingsAgent]
});
```

---

## Domain Specialist Pattern

Each specialist has focused tools and context.

```typescript
// lib/ai/agents/customer.ts
export const customerAgent = new Agent({
  name: 'customer',
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.3,
  maxTurns: 10,

  system: `You are the Customer specialist for Renoz CRM.
You help with customer lookups, contact management, and relationship insights.

Guidelines:
- Always verify customer identity before sharing sensitive info
- Proactively mention overdue invoices or open issues
- Suggest follow-up actions when relevant`,

  tools: [
    getCustomerTool,
    searchCustomersTool,
    getCustomerOrdersTool,
    getCustomerIssuesTool,
    updateCustomerNotesTool,
    sendEmailDraftTool  // Draft only, human approves
  ]
});
```

---

## Tool Access Matrix

| Tool | Triage | Customer | Order | Analytics |
|------|--------|----------|-------|-----------|
| `handoff_to_agent` | ✅ | ❌ | ❌ | ❌ |
| `get_customer` | ❌ | ✅ | ✅ | ✅ |
| `search_customers` | ❌ | ✅ | ❌ | ❌ |
| `get_orders` | ❌ | ✅ | ✅ | ✅ |
| `create_order_draft` | ❌ | ❌ | ✅ | ❌ |
| `run_report` | ❌ | ❌ | ❌ | ✅ |
| `send_email_draft` | ❌ | ✅ | ✅ | ❌ |

**Principle:** Least privilege - agents only get tools they need.

---

## Handoff Pattern

How context passes between agents:

```typescript
// @fondation-io/ai-sdk-tools pattern
const handoffTool = {
  name: 'handoff_to_agent',
  description: 'Transfer conversation to a specialist agent',
  parameters: z.object({
    targetAgent: z.enum(['customer', 'order', 'analytics', 'settings']),
    reason: z.string().describe('Why this agent is best suited'),
    context: z.object({
      extractedEntities: z.array(z.string()).optional(),
      userIntent: z.string()
    })
  }),

  execute: async ({ targetAgent, reason, context }) => {
    // Log handoff for debugging
    logger.info('Agent handoff', { from: 'triage', to: targetAgent, reason });

    // Return control to orchestrator
    return {
      handoff: targetAgent,
      context: {
        ...context,
        handoffReason: reason,
        conversationHistory: getRecentHistory(10)
      }
    };
  }
};
```

---

## Agent Lifecycle

```
1. Initialize
   ├── Load system prompt
   ├── Inject user context (org, role, preferences)
   └── Attach tools

2. Execute
   ├── Receive message + handoff context
   ├── Tool loop (up to maxTurns)
   └── Stream response

3. Complete
   ├── Update conversation history
   ├── Extract and store learnings
   └── Clear working memory if needed
```

---

## Human-in-the-Loop

For sensitive operations:

```typescript
const createOrderDraftTool = {
  name: 'create_order_draft',
  // Mark as requiring approval
  requiresApproval: true,

  execute: async (params) => {
    const draft = await createDraft(params);

    return {
      type: 'approval_required',
      action: 'create_order',
      draft,
      message: `I've drafted an order for ${draft.customerName}. Please review and approve.`,
      approvalUrl: `/orders/drafts/${draft.id}`
    };
  }
};
```

UI shows: "AI suggests this order. [Approve] [Edit] [Discard]"
