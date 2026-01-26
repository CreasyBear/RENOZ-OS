# Tool Implementation Patterns

## Source
- `_reference/.midday-reference/apps/api/src/ai/tools/*.ts`

## 1. Tool Definition Structure

```typescript
// src/lib/ai/tools/{domain}-tools.ts
import { tool } from "ai";
import { z } from "zod";
import type { AppContext } from "../context/types";

export const getOrdersTool = tool({
  // 1. Clear description for LLM
  description: "Retrieve orders with filtering, pagination, and sorting.",

  // 2. Zod schema for input validation
  inputSchema: z.object({
    cursor: z.string().nullable().optional().describe("Pagination cursor"),
    pageSize: z.number().min(1).max(100).default(10).describe("Page size"),
    status: z.enum(["pending", "completed", "cancelled"]).optional()
      .describe("Filter by status"),
    customerId: z.string().optional().describe("Filter by customer ID"),
    period: z.enum(["7-days", "30-days", "3-months", "6-months", "1-year"]).optional()
      .describe("Historical period"),
    from: z.string().optional().describe("Start date (yyyy-MM-dd)"),
    to: z.string().optional().describe("End date (yyyy-MM-dd)"),
  }),

  // 3. Async generator for streaming
  execute: async function* (params, executionOptions) {
    // ... implementation
  },
});
```

## 2. Zod Schema Best Practices

```typescript
const toolSchema = z.object({
  // ALWAYS add .describe() for LLM context
  customerId: z.string().describe("Customer UUID"),

  // Use .default() for sensible defaults
  pageSize: z.number().min(1).max(100).default(10),

  // Use .nullable().optional() for truly optional fields
  cursor: z.string().nullable().optional(),

  // Use enums for controlled options
  status: z.enum(["pending", "completed", "cancelled"]),

  // Use .length() for fixed-size arrays
  sort: z.array(z.string()).length(2).describe("[field, direction]"),

  // Validate date formats in description
  from: z.string().optional().describe("Start date (yyyy-MM-dd format)"),

  // Use .transform() for type coercion
  amount: z.string().transform(Number).describe("Amount in cents"),
});
```

## 3. Streaming Execution Pattern

```typescript
execute: async function* (
  { cursor, pageSize, status, customerId, period, from, to },
  executionOptions,
) {
  // 1. Extract context
  const appContext = executionOptions.experimental_context as AppContext;
  const orgId = appContext.organizationId;

  // 2. Validate required context
  if (!orgId) {
    yield { text: "Unable to retrieve orders: Organization ID not found." };
    return;
  }

  // 3. Check preconditions
  const { shouldYield } = checkPreconditions(appContext);
  if (shouldYield) {
    throw new Error("PRECONDITION_FAILED");
  }

  try {
    // 4. Resolve parameters with priority system
    const resolved = resolveToolParams({
      toolName: "getOrders",
      appContext,
      aiParams: { period, from, to, customerId },
    });

    // 5. Execute database query
    const result = await db.query.orders.findMany({
      where: and(
        eq(orders.organizationId, orgId),
        gte(orders.createdAt, new Date(resolved.from)),
        lte(orders.createdAt, new Date(resolved.to)),
        status ? eq(orders.status, status) : undefined,
      ),
      limit: pageSize,
      offset: cursor ? parseInt(cursor) : 0,
    });

    // 6. Handle empty results
    if (result.length === 0) {
      yield { text: "No orders found matching your criteria." };
      return;
    }

    // 7. Format response with markdown table
    const tableRows = result.map((order) =>
      `| ${order.id.slice(0, 8)} | ${order.customerName} | ${formatCurrency(order.total)} | ${order.status} |`
    ).join("\n");

    const response = `| ID | Customer | Total | Status |
|------|----------|-------|--------|
${tableRows}

**${result.length} orders** | Total: ${formatCurrency(totalAmount)}`;

    // 8. Yield with response and optional link
    yield {
      text: response,
      link: {
        text: "View all orders",
        url: `${getAppUrl()}/orders`,
      },
    };
  } catch (error) {
    yield {
      text: `Failed to retrieve orders: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
```

## 4. Markdown Table Formatting

**ALWAYS use markdown tables for 2+ rows of structured data:**

```typescript
// Format data as markdown table
function formatAsTable(data: Order[]): string {
  if (data.length === 0) return "No data found.";

  const header = "| ID | Customer | Total | Status | Date |";
  const separator = "|------|----------|-------|--------|------|";
  const rows = data.map((item) =>
    `| ${item.id.slice(0, 8)} | ${item.customerName} | ${formatCurrency(item.total)} | ${item.status} | ${formatDate(item.createdAt)} |`
  ).join("\n");

  return `${header}\n${separator}\n${rows}`;
}
```

## 5. Error Handling Pattern

```typescript
execute: async function* (params, executionOptions) {
  const appContext = executionOptions.experimental_context as AppContext;

  // Early validation with helpful message
  if (!appContext.organizationId) {
    yield { text: "Unable to process: Organization context missing." };
    return;
  }

  try {
    // Main logic...
    yield { text: response };
  } catch (error) {
    // User-friendly error message
    yield {
      text: `Failed to retrieve data: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}
```

## 6. Response with Links

Include links for drill-down navigation:

```typescript
yield {
  text: response,
  link: {
    text: "View details",
    url: `${getAppUrl()}/orders/${orderId}`,
  },
};

// Multiple links
yield {
  text: response,
  links: [
    { text: "View order", url: `/orders/${orderId}` },
    { text: "Contact customer", url: `/customers/${customerId}` },
  ],
};
```

## 7. Draft-Approve Pattern

For mutating operations, return approval-required response:

```typescript
// src/lib/ai/tools/order-tools.ts
export const createOrderDraftTool = tool({
  description: "Create a draft order for approval",
  inputSchema: z.object({
    customerId: z.string().describe("Customer ID"),
    items: z.array(z.object({
      productId: z.string(),
      quantity: z.number(),
    })).describe("Order line items"),
  }),
  execute: async function* ({ customerId, items }, executionOptions) {
    const appContext = executionOptions.experimental_context as AppContext;

    // Build draft
    const draft = {
      customerId,
      items,
      total: calculateTotal(items),
      createdBy: appContext.userId,
    };

    // Insert approval record
    const approval = await db.insert(aiApprovals).values({
      organizationId: appContext.organizationId,
      userId: appContext.userId,
      conversationId: appContext.chatId,
      action: "create_order",
      agent: "order",
      actionData: draft,
      status: "pending",
      expiresAt: addHours(new Date(), 24),
    }).returning();

    // Return approval-required response
    yield {
      text: `Draft order created for ${draft.customerName}. Total: ${formatCurrency(draft.total)}`,
    };

    return {
      type: "approval_required",
      action: "create_order",
      draft,
      approvalId: approval[0].id,
      approvalActions: ["approve", "edit", "discard"],
    };
  },
});
```

## 8. Output Filtering

Remove sensitive fields before returning to AI:

```typescript
// src/lib/ai/tools/filters.ts
const SENSITIVE_FIELDS = ["ssn", "taxId", "bankAccount", "password", "apiKey"];

export function filterSensitiveFields<T extends Record<string, unknown>>(
  data: T
): Omit<T, typeof SENSITIVE_FIELDS[number]> {
  const filtered = { ...data };
  for (const field of SENSITIVE_FIELDS) {
    delete filtered[field];
  }
  return filtered;
}

// Usage in tool
const customer = await getCustomer(customerId);
const safeCustomer = filterSensitiveFields(customer);
yield { text: formatCustomer(safeCustomer) };
```

## 9. Per-Tool Rate Limiting

```typescript
// src/lib/ai/tools/rate-limits.ts
import { Ratelimit } from "@upstash/ratelimit";

export const toolRateLimits = {
  searchCustomers: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1m"), // 10/min
  }),
  runReport: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1h"), // 5/hour
  }),
  getMetrics: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1m"), // 20/min
  }),
};

// Usage in tool
const { success, reset } = await toolRateLimits.searchCustomers.limit(
  `tool:searchCustomers:${appContext.userId}`
);
if (!success) {
  yield { text: `Rate limit exceeded. Try again in ${Math.ceil(reset / 1000)}s.` };
  return;
}
```

## 10. Tool Registry

Export all tools from central registry:

```typescript
// src/lib/ai/tools/index.ts
export * from "./customer-tools";
export * from "./order-tools";
export * from "./analytics-tools";
export * from "./quote-tools";

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
    // ...
  };
  return toolRegistry[agentName] ?? {};
}
```

## Usage in PRD Stories

- **AI-INFRA-014**: AI Tool Implementations - Use all patterns
