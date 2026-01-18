# Tool Design Patterns

## Principle 1: Structured Output Over Pretty Output

**Human UI:**
```tsx
<OrderStatus status="pending" dueDate="Jan 15" />
```

**AI Tool:**
```typescript
{
  status: "pending",
  dueDate: "2026-01-15",
  daysUntilDue: 5,
  isOverdue: false,
  suggestedAction: "follow_up"
}
```

**Key:** Return **computed insights**, not just raw data.

---

## Principle 2: Error Messages for Reasoning

**Bad:**
```
"Something went wrong. Please try again."
```

**Good:**
```typescript
{
  error: "CUSTOMER_NOT_FOUND",
  context: {
    searchedId: "cust_123",
    suggestion: "Did you mean 'John Smith' (cust_456)?",
    alternatives: ["cust_456", "cust_789"]
  }
}
```

AI can **recover** from structured errors.

---

## Principle 3: Tool Boundaries

| Category | AI Tool | Human Action |
|----------|---------|--------------|
| **Read** | ✅ `get_customer` | ✅ View customer |
| **Update** | ✅ `update_notes` | ✅ Edit form |
| **Create** | ⚠️ `draft_order` | ✅ Submit order |
| **Delete** | ❌ Never | ✅ With confirmation |
| **Payment** | ❌ Never | ✅ Authorized flow |

**Pattern:** AI drafts, humans approve.

---

## Principle 4: Tool Granularity

**Too Coarse:**
```typescript
getCustomerEverything(id)  // Returns 20 related entities
```

**Too Fine:**
```typescript
getCustomerName(id)
getCustomerEmail(id)
getCustomerPhone(id)  // 20 separate calls
```

**Just Right:**
```typescript
getCustomer(id, {
  include: ['summary', 'recentOrders', 'openIssues']
})
```

---

## Principle 5: Proactive Metadata

```typescript
interface GetCustomerResult {
  customer: Customer;

  _meta: {
    hasOverdueInvoices: boolean;
    lastContactDaysAgo: number;
    lifetimeValue: "high" | "medium" | "low";
    suggestedNextActions: string[];
  };

  _display: {
    title: string;
    subtitle: string;
    badge: string | null;
  };
}
```

---

## Example: Customer Lookup Tool

```typescript
// lib/ai/tools/get-customer.ts
import { z } from 'zod';

export const getCustomerTool = {
  name: "get_customer",
  description: "Get customer details with optional related data",

  parameters: z.object({
    customerId: z.string().describe("Customer ID or search term"),
    include: z.array(z.enum([
      "summary",
      "recentOrders",
      "openIssues",
      "paymentHistory",
      "communications"
    ])).optional().default(["summary"])
  }),

  execute: async ({ customerId, include }) => {
    const customer = await getCustomerById(customerId);

    if (!customer) {
      // Structured error with recovery suggestions
      const similar = await searchSimilarCustomers(customerId);
      return {
        error: "CUSTOMER_NOT_FOUND",
        searchedId: customerId,
        suggestions: similar.map(c => ({
          id: c.id,
          name: c.name,
          matchReason: c.matchReason
        }))
      };
    }

    const result: any = { customer };

    // Conditional includes
    if (include.includes("recentOrders")) {
      result.recentOrders = await getRecentOrders(customerId, 10);
    }
    if (include.includes("openIssues")) {
      result.openIssues = await getOpenIssues(customerId);
    }

    // Always include proactive metadata
    result._meta = {
      hasOverdueInvoices: customer.overdueCount > 0,
      daysSinceLastOrder: daysSince(customer.lastOrderDate),
      daysSinceLastContact: daysSince(customer.lastContactDate),
      healthScore: computeHealthScore(customer),
      lifetimeValue: categorizeValue(customer.totalRevenue),
      suggestedActions: getSuggestedActions(customer)
    };

    result._display = {
      title: customer.name,
      subtitle: `${customer.type} • ${customer.status}`,
      badge: customer.overdueCount > 0 ? "Overdue" : null
    };

    return result;
  }
};
```

---

## Example: Order Draft Tool

```typescript
// lib/ai/tools/create-order-draft.ts
export const createOrderDraftTool = {
  name: "create_order_draft",
  description: "Create a draft order for human approval",
  requiresApproval: true,

  parameters: z.object({
    customerId: z.string(),
    items: z.array(z.object({
      productId: z.string(),
      quantity: z.number().positive()
    })),
    notes: z.string().optional()
  }),

  execute: async ({ customerId, items, notes }) => {
    // Validate customer exists
    const customer = await getCustomerById(customerId);
    if (!customer) {
      return { error: "CUSTOMER_NOT_FOUND", customerId };
    }

    // Validate products and calculate totals
    const lineItems = await Promise.all(
      items.map(async (item) => {
        const product = await getProductById(item.productId);
        if (!product) {
          return { error: "PRODUCT_NOT_FOUND", productId: item.productId };
        }
        return {
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: product.price,
          lineTotal: product.price * item.quantity
        };
      })
    );

    // Check for errors
    const errors = lineItems.filter(li => li.error);
    if (errors.length > 0) {
      return { error: "INVALID_ITEMS", details: errors };
    }

    // Create draft (not persisted to orders table yet)
    const draft = await createDraft({
      customerId,
      customerName: customer.name,
      items: lineItems,
      subtotal: lineItems.reduce((sum, li) => sum + li.lineTotal, 0),
      notes,
      createdBy: 'ai',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24hr expiry
    });

    return {
      type: "approval_required",
      action: "create_order",
      draft,
      message: `Draft order created for ${customer.name}. Total: $${draft.subtotal.toFixed(2)}`,
      approvalActions: [
        { label: "Approve", action: "approve", url: `/orders/drafts/${draft.id}/approve` },
        { label: "Edit", action: "edit", url: `/orders/drafts/${draft.id}/edit` },
        { label: "Discard", action: "discard", url: `/orders/drafts/${draft.id}/discard` }
      ]
    };
  }
};
```

---

## Tool Registration

```typescript
// lib/ai/tools/index.ts
export const customerTools = [
  getCustomerTool,
  searchCustomersTool,
  updateCustomerNotesTool
];

export const orderTools = [
  getOrderTool,
  getOrdersTool,
  createOrderDraftTool,
  updateOrderStatusTool
];

export const analyticsTools = [
  runReportTool,
  getMetricsTool,
  getDashboardDataTool
];
```
