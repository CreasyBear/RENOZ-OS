# Specialist Agent Example (Customer Domain)

## Source
- `_reference/.midday-reference/apps/api/src/ai/agents/customer.ts`

## Complete Implementation

```typescript
// src/lib/ai/agents/customer.ts
import { Agent } from "@ai-sdk/agent";
import { anthropic } from "@ai-sdk/anthropic";
import type { AppContext } from "../context/types";
import { buildAgentInstructions } from "../prompts/agent-instructions";
import { TOOL_SELECTION_INSTRUCTIONS } from "../prompts/tool-selection";
import { RESPONSE_FORMAT_INSTRUCTIONS } from "../prompts/response-format";
import { redisMemoryProvider } from "../memory/redis-provider";

// Import domain tools
import {
  getCustomerTool,
  searchCustomersTool,
  updateCustomerNotesTool,
  getCustomerHistoryTool,
  getCustomerInvoicesTool,
} from "../tools/customer-tools";

// Customer-specific instructions
const CUSTOMER_AGENT_RULES = `
<customer_domain_rules>
1. For direct lookups: Lead with customer summary, add context after
2. Include recent activity (last 5 interactions) in table format
3. Highlight overdue invoices or churn risk prominently
4. Suggest follow-up actions when appropriate
5. For relationship insights: Include lifetime value and engagement score
6. Always verify customer exists before providing recommendations
</customer_domain_rules>

<tool_usage>
- getCustomer: Single customer by ID or exact name match
- searchCustomers: Fuzzy search, filtering by status/tags/date
- updateCustomerNotes: Add notes (requires approval)
- getCustomerHistory: Activity timeline
- getCustomerInvoices: Payment and invoice details
</tool_usage>
`;

// Memory template for customer context
const CUSTOMER_MEMORY_TEMPLATE = `
<user_profile>
Name: [Learn from conversation]
Role: [Owner, Admin, Staff, etc.]
</user_profile>

<business_context>
Active Customer: [Current customer being discussed]
Customer ID: [If known]
Recent Lookup: [Last customer searched]
</business_context>

<conversation_focus>
Key Topics: [Main subjects discussed]
Recent Concerns: [Issues or questions raised]
</conversation_focus>

<communication_preferences>
Style: [Formal vs casual]
Detail Level: [Summary vs detailed]
</communication_preferences>
`;

export function createCustomerAgent(ctx: AppContext) {
  return new Agent({
    name: "customer",
    model: anthropic("claude-sonnet-4-20250514"), // Full capability for complex queries
    temperature: 0.3, // Precision for data retrieval
    maxTurns: 10, // Allow multi-step conversations
    instructions: buildCustomerInstructions(ctx),
    tools: {
      getCustomer: getCustomerTool,
      searchCustomers: searchCustomersTool,
      updateCustomerNotes: updateCustomerNotesTool,
      getCustomerHistory: getCustomerHistoryTool,
      getCustomerInvoices: getCustomerInvoicesTool,
    },
    memory: {
      provider: redisMemoryProvider,
      history: {
        enabled: true,
        limit: 10, // Keep last 10 messages
      },
      workingMemory: {
        enabled: true,
        template: CUSTOMER_MEMORY_TEMPLATE,
        scope: "user", // Per-user working memory
      },
    },
  });
}

function buildCustomerInstructions(ctx: AppContext): string {
  return `${buildAgentInstructions("customer", CUSTOMER_AGENT_RULES, ctx)}

${TOOL_SELECTION_INSTRUCTIONS}

${RESPONSE_FORMAT_INSTRUCTIONS}`;
}
```

## Tool Definitions

```typescript
// src/lib/ai/tools/customer-tools.ts
import { tool } from "ai";
import { z } from "zod";
import type { AppContext } from "../context/types";
import { resolveToolParams } from "../utils/resolve-params";

export const getCustomerTool = tool({
  description: "Get detailed information about a specific customer by ID",
  inputSchema: z.object({
    customerId: z.string().describe("Customer UUID"),
  }),
  execute: async function* ({ customerId }, executionOptions) {
    const appContext = executionOptions.experimental_context as AppContext;

    try {
      const customer = await db.query.customers.findFirst({
        where: and(
          eq(customers.id, customerId),
          eq(customers.organizationId, appContext.organizationId),
          sql`${customers.deletedAt} IS NULL`,
        ),
        with: {
          addresses: true,
          contacts: true,
        },
      });

      if (!customer) {
        yield { text: "Customer not found." };
        return;
      }

      const response = formatCustomerSummary(customer);
      yield {
        text: response,
        link: {
          text: "View customer",
          url: `/customers/${customer.id}`,
        },
      };

      return customer;
    } catch (error) {
      yield { text: `Failed to retrieve customer: ${error.message}` };
    }
  },
});

export const searchCustomersTool = tool({
  description: "Search for customers with filtering and pagination",
  inputSchema: z.object({
    query: z.string().optional().describe("Search term (name, email, phone)"),
    status: z.enum(["active", "inactive", "lead"]).optional()
      .describe("Filter by status"),
    tags: z.array(z.string()).optional().describe("Filter by tags"),
    cursor: z.string().nullable().optional().describe("Pagination cursor"),
    pageSize: z.number().min(1).max(50).default(10).describe("Results per page"),
  }),
  execute: async function* (
    { query, status, tags, cursor, pageSize },
    executionOptions,
  ) {
    const appContext = executionOptions.experimental_context as AppContext;

    try {
      const conditions = [
        eq(customers.organizationId, appContext.organizationId),
        sql`${customers.deletedAt} IS NULL`,
      ];

      if (query) {
        conditions.push(
          or(
            ilike(customers.name, `%${query}%`),
            ilike(customers.email, `%${query}%`),
            ilike(customers.phone, `%${query}%`),
          ),
        );
      }

      if (status) {
        conditions.push(eq(customers.status, status));
      }

      const results = await db.query.customers.findMany({
        where: and(...conditions),
        limit: pageSize,
        offset: cursor ? parseInt(cursor) : 0,
        orderBy: [desc(customers.createdAt)],
      });

      if (results.length === 0) {
        yield { text: "No customers found matching your criteria." };
        return;
      }

      // Format as markdown table
      const header = "| Name | Email | Status | Created |";
      const separator = "|------|-------|--------|---------|";
      const rows = results.map((c) =>
        `| ${c.name} | ${c.email || "—"} | ${c.status} | ${formatDate(c.createdAt)} |`
      ).join("\n");

      yield {
        text: `${header}\n${separator}\n${rows}\n\n**${results.length} customers found**`,
        link: {
          text: "View all customers",
          url: "/customers",
        },
      };

      return results;
    } catch (error) {
      yield { text: `Failed to search customers: ${error.message}` };
    }
  },
});

export const updateCustomerNotesTool = tool({
  description: "Add a note to a customer record (requires approval)",
  inputSchema: z.object({
    customerId: z.string().describe("Customer UUID"),
    note: z.string().describe("Note content to add"),
  }),
  execute: async function* ({ customerId, note }, executionOptions) {
    const appContext = executionOptions.experimental_context as AppContext;

    // Create draft for approval
    const draft = {
      customerId,
      note,
      createdBy: appContext.userId,
    };

    // Insert approval record
    const approval = await db.insert(aiApprovals).values({
      organizationId: appContext.organizationId,
      userId: appContext.userId,
      conversationId: appContext.chatId,
      action: "add_customer_note",
      agent: "customer",
      actionData: draft,
      status: "pending",
      expiresAt: addHours(new Date(), 24),
    }).returning();

    yield {
      text: `Draft note created for customer. Please review and approve.`,
    };

    return {
      type: "approval_required",
      action: "add_customer_note",
      draft,
      approvalId: approval[0].id,
      approvalActions: ["approve", "edit", "discard"],
    };
  },
});
```

## Key Patterns

### 1. Sonnet Model
```typescript
model: anthropic("claude-sonnet-4-20250514")
```
Use Sonnet for specialist agents - they need full reasoning capability.

### 2. Moderate Temperature
```typescript
temperature: 0.3
```
Low-moderate for data agents. High enough for natural language, low enough for accuracy.

### 3. Memory Configuration
```typescript
memory: {
  provider: redisMemoryProvider,
  history: { enabled: true, limit: 10 },
  workingMemory: { enabled: true, template: CUSTOMER_MEMORY_TEMPLATE, scope: "user" },
}
```
Enable both conversation history and working memory with domain-specific template.

### 4. Multi-Turn Support
```typescript
maxTurns: 10
```
Allow back-and-forth for complex queries and follow-up questions.

### 5. Approval Pattern
```typescript
return {
  type: "approval_required",
  action: "add_customer_note",
  draft,
  approvalId: approval[0].id,
  approvalActions: ["approve", "edit", "discard"],
};
```
Mutating operations return approval_required with draft data.

## Usage

```typescript
// In chat handler after triage routes to "customer"
import { createCustomerAgent } from "@/lib/ai/agents/customer";

const customerAgent = createCustomerAgent(ctx);
const result = await customerAgent.run(userMessage);

// Handle approval_required responses
if (result.data?.type === "approval_required") {
  // Return to frontend for user approval UI
  return {
    response: result.text,
    pendingApproval: result.data,
  };
}

return { response: result.text };
```
