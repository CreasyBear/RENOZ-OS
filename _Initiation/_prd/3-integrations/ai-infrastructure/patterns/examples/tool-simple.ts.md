# Simple Data Tool Example (getOrders)

## Source
- `_reference/.midday-reference/apps/api/src/ai/tools/*.ts`

## Complete Implementation

```typescript
// src/lib/ai/tools/order-tools.ts
import { tool } from "ai";
import { z } from "zod";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { AppContext } from "../context/types";
import { resolveToolParams } from "../utils/resolve-params";
import { db } from "@/lib/db";
import { orders } from "drizzle/schema";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const getOrdersTool = tool({
  // 1. Clear description for LLM
  description: "Retrieve orders with filtering, pagination, and date range",

  // 2. Zod schema with descriptions
  inputSchema: z.object({
    // Date range options
    period: z.enum(["7-days", "30-days", "3-months", "6-months", "1-year"])
      .optional()
      .describe("Historical period shortcut"),
    from: z.string()
      .optional()
      .describe("Start date (yyyy-MM-dd format)"),
    to: z.string()
      .optional()
      .describe("End date (yyyy-MM-dd format)"),

    // Filters
    status: z.enum(["pending", "confirmed", "completed", "cancelled"])
      .optional()
      .describe("Filter by order status"),
    customerId: z.string()
      .optional()
      .describe("Filter by customer UUID"),

    // Pagination
    cursor: z.string()
      .nullable()
      .optional()
      .describe("Pagination cursor"),
    pageSize: z.number()
      .min(1)
      .max(50)
      .default(10)
      .describe("Results per page (1-50)"),
  }),

  // 3. Async generator for streaming
  execute: async function* (
    { period, from, to, status, customerId, cursor, pageSize },
    executionOptions,
  ) {
    // 4. Extract context
    const appContext = executionOptions.experimental_context as AppContext;
    const orgId = appContext.organizationId;

    // 5. Validate required context
    if (!orgId) {
      yield { text: "Unable to retrieve orders: Organization context missing." };
      return;
    }

    try {
      // 6. Resolve parameters with priority system
      const resolved = resolveToolParams({
        toolName: "getOrders",
        appContext,
        aiParams: { period, from, to, customerId },
      });

      // 7. Build query conditions
      const conditions = [
        eq(orders.organizationId, orgId),
        sql`${orders.deletedAt} IS NULL`,
        gte(orders.createdAt, new Date(resolved.from)),
        lte(orders.createdAt, new Date(resolved.to)),
      ];

      if (status) {
        conditions.push(eq(orders.status, status));
      }

      if (resolved.customerId) {
        conditions.push(eq(orders.customerId, resolved.customerId));
      }

      // 8. Execute query
      const result = await db.query.orders.findMany({
        where: and(...conditions),
        limit: pageSize,
        offset: cursor ? parseInt(cursor) : 0,
        orderBy: [desc(orders.createdAt)],
        with: {
          customer: {
            columns: { name: true },
          },
        },
      });

      // 9. Handle empty results
      if (result.length === 0) {
        yield {
          text: `No orders found from ${resolved.from} to ${resolved.to}.`,
        };
        return;
      }

      // 10. Calculate totals
      const totalAmount = result.reduce((sum, o) => sum + Number(o.total), 0);

      // 11. Format as markdown table
      const header = "| ID | Customer | Total | Status | Date |";
      const separator = "|------|----------|-------|--------|------|";
      const rows = result.map((order) =>
        `| ${order.id.slice(0, 8)} | ${order.customer?.name || "—"} | ${formatCurrency(order.total, resolved.currency)} | ${order.status} | ${formatDate(order.createdAt)} |`
      ).join("\n");

      const response = `${header}
${separator}
${rows}

**${result.length} orders** | Total: ${formatCurrency(totalAmount, resolved.currency)}`;

      // 12. Yield with response and link
      yield {
        text: response,
        link: {
          text: "View all orders",
          url: "/orders",
        },
      };

      // 13. Return data for potential chaining
      return {
        orders: result,
        total: totalAmount,
        count: result.length,
        dateRange: { from: resolved.from, to: resolved.to },
      };
    } catch (error) {
      // 14. User-friendly error
      yield {
        text: `Failed to retrieve orders: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
});
```

## Key Patterns Explained

### 1. Schema with Descriptions

Every field gets `.describe()` for LLM context:

```typescript
inputSchema: z.object({
  period: z.enum(["7-days", "30-days", "3-months"])
    .optional()
    .describe("Historical period shortcut"), // LLM reads this!

  pageSize: z.number()
    .min(1)
    .max(50)
    .default(10)
    .describe("Results per page (1-50)"),
})
```

### 2. Parameter Resolution

Use three-tier priority system:

```typescript
const resolved = resolveToolParams({
  toolName: "getOrders",
  appContext,
  aiParams: { period, from, to, customerId },
});
// resolved.from, resolved.to, resolved.customerId have correct values
```

Priority order:
1. `forcedToolCall.toolParams` (widget click)
2. AI params (user query)
3. `currentViewFilter` (dashboard state)
4. Hardcoded defaults (30 days)

### 3. Multi-Tenant Filtering

Always filter by organizationId:

```typescript
const conditions = [
  eq(orders.organizationId, orgId), // ALWAYS FIRST
  sql`${orders.deletedAt} IS NULL`, // Soft delete
  // ... other conditions
];
```

### 4. Markdown Table Output

Format 2+ rows as tables:

```typescript
const header = "| ID | Customer | Total | Status | Date |";
const separator = "|------|----------|-------|--------|------|";
const rows = result.map((order) =>
  `| ${order.id.slice(0, 8)} | ${order.customer?.name} | ${formatCurrency(order.total)} | ${order.status} | ${formatDate(order.createdAt)} |`
).join("\n");
```

### 5. Links for Navigation

Include drill-down links:

```typescript
yield {
  text: response,
  link: {
    text: "View all orders",
    url: "/orders",
  },
};
```

### 6. Error Handling

User-friendly messages:

```typescript
catch (error) {
  yield {
    text: `Failed to retrieve orders: ${
      error instanceof Error ? error.message : "Unknown error"
    }`,
  };
}
```

## Testing

```typescript
// tests/ai/tools/order-tools.test.ts
import { describe, it, expect, vi } from "vitest";
import { getOrdersTool } from "@/lib/ai/tools/order-tools";

describe("getOrdersTool", () => {
  const mockContext = {
    organizationId: "org-123",
    userId: "user-456",
    baseCurrency: "USD",
    currentViewFilter: null,
    forcedToolCall: null,
  };

  it("returns orders within date range", async () => {
    const generator = getOrdersTool.execute(
      { period: "30-days", pageSize: 10 },
      { experimental_context: mockContext },
    );

    const result = await collectGenerator(generator);
    expect(result.text).toContain("orders");
    expect(result.text).toContain("|"); // Has table
  });

  it("handles empty results", async () => {
    vi.spyOn(db.query.orders, "findMany").mockResolvedValue([]);

    const generator = getOrdersTool.execute(
      { customerId: "nonexistent" },
      { experimental_context: mockContext },
    );

    const result = await collectGenerator(generator);
    expect(result.text).toContain("No orders found");
  });

  it("uses resolved parameters from dashboard filter", async () => {
    const contextWithFilter = {
      ...mockContext,
      currentViewFilter: {
        from: "2026-01-01",
        to: "2026-01-31",
      },
    };

    const generator = getOrdersTool.execute(
      {}, // No AI params
      { experimental_context: contextWithFilter },
    );

    // Should use dashboard filter dates
    const result = await collectGenerator(generator);
    expect(result.data?.dateRange.from).toBe("2026-01-01");
  });
});
```
