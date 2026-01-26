# Parameter Resolution Patterns

## Source
- `_reference/.midday-reference/apps/api/src/ai/utils/period-dates.ts`

## 1. Three-Tier Priority System

Parameters are resolved in priority order:

```
1. forcedToolCall.toolParams  → Widget click (highest precedence)
2. AI params                  → User query override via natural language
3. currentViewFilter          → Dashboard filter state as default
4. Hardcoded defaults         → Fallback values (e.g., last 30 days)
```

## 2. resolveToolParams Implementation

```typescript
// src/lib/ai/utils/resolve-params.ts
import { format, subMonths, subYears, startOfYear } from "date-fns";
import type { AppContext } from "../context/types";

export type PeriodOption =
  | "7-days"
  | "30-days"
  | "3-months"
  | "6-months"
  | "this-year"
  | "1-year"
  | "2-years";

interface ResolveToolParamsOptions {
  toolName: string;
  appContext: AppContext;
  aiParams: {
    period?: string;
    dateRange?: string;
    from?: string;
    to?: string;
    currency?: string | null;
    customerId?: string;
    [key: string]: unknown;
  };
}

interface ResolvedToolParams {
  from: string;
  to: string;
  currency: string;
  customerId?: string;
  [key: string]: unknown;
}

export function resolveToolParams(options: ResolveToolParamsOptions): ResolvedToolParams {
  const { toolName, appContext, aiParams } = options;
  const { forcedToolCall, currentViewFilter, baseCurrency } = appContext;

  // PRIORITY 1: Forced params from widget click
  if (forcedToolCall?.toolName === toolName && forcedToolCall.toolParams) {
    const forced = forcedToolCall.toolParams;
    return {
      ...forced,
      from: (forced.from as string) ?? currentViewFilter?.from ?? getPeriodDates("30-days").from,
      to: (forced.to as string) ?? currentViewFilter?.to ?? getPeriodDates("30-days").to,
      currency: (forced.currency as string) ?? currentViewFilter?.currency ?? baseCurrency,
      customerId: (forced.customerId as string) ?? currentViewFilter?.customerId,
    };
  }

  // PRIORITY 2: AI params (user override via natural language)
  const historicalPeriod = isValidPeriodOption(aiParams.dateRange)
    ? aiParams.dateRange
    : isValidPeriodOption(aiParams.period)
      ? aiParams.period
      : undefined;

  let from: string;
  let to: string;

  if (historicalPeriod) {
    // AI specified a period like "last 6 months"
    const dates = getPeriodDates(historicalPeriod);
    from = dates.from;
    to = dates.to;
  } else if (aiParams.from && aiParams.to) {
    // AI specified explicit dates
    from = aiParams.from;
    to = aiParams.to;
  } else if (currentViewFilter?.from && currentViewFilter?.to) {
    // PRIORITY 3: Dashboard filter state
    from = currentViewFilter.from;
    to = currentViewFilter.to;
  } else {
    // PRIORITY 4: Hardcoded default
    const dates = getPeriodDates("30-days");
    from = dates.from;
    to = dates.to;
  }

  // Currency resolution
  const currency = aiParams.currency ?? currentViewFilter?.currency ?? baseCurrency;

  // Customer ID resolution
  const customerId = aiParams.customerId ?? currentViewFilter?.customerId;

  return {
    ...aiParams,
    from,
    to,
    currency,
    customerId,
  };
}

function isValidPeriodOption(value: unknown): value is PeriodOption {
  const validPeriods: PeriodOption[] = [
    "7-days", "30-days", "3-months", "6-months",
    "this-year", "1-year", "2-years"
  ];
  return typeof value === "string" && validPeriods.includes(value as PeriodOption);
}
```

## 3. Period to Date Conversion

```typescript
// src/lib/ai/utils/resolve-params.ts (continued)

export function getPeriodDates(period: PeriodOption): { from: string; to: string } {
  const now = new Date();
  const to = format(now, "yyyy-MM-dd");

  switch (period) {
    case "7-days":
      return { from: format(subDays(now, 7), "yyyy-MM-dd"), to };
    case "30-days":
      return { from: format(subDays(now, 30), "yyyy-MM-dd"), to };
    case "3-months":
      return { from: format(subMonths(now, 3), "yyyy-MM-dd"), to };
    case "6-months":
      return { from: format(subMonths(now, 6), "yyyy-MM-dd"), to };
    case "this-year":
      return { from: format(startOfYear(now), "yyyy-MM-dd"), to };
    case "1-year":
      return { from: format(subYears(now, 1), "yyyy-MM-dd"), to };
    case "2-years":
      return { from: format(subYears(now, 2), "yyyy-MM-dd"), to };
    default:
      return { from: format(subDays(now, 30), "yyyy-MM-dd"), to };
  }
}
```

## 4. Usage in Tools

```typescript
// src/lib/ai/tools/order-tools.ts
export const getOrdersTool = tool({
  description: "Retrieve orders with filtering and date range",
  inputSchema: z.object({
    period: z.enum(["7-days", "30-days", "3-months", "6-months", "1-year"]).optional(),
    from: z.string().optional().describe("Start date (yyyy-MM-dd)"),
    to: z.string().optional().describe("End date (yyyy-MM-dd)"),
    customerId: z.string().optional().describe("Filter by customer"),
    status: z.enum(["pending", "completed", "cancelled"]).optional(),
  }),
  execute: async function* ({ period, from, to, customerId, status }, executionOptions) {
    const appContext = executionOptions.experimental_context as AppContext;

    // Resolve params with priority system
    const resolved = resolveToolParams({
      toolName: "getOrders",
      appContext,
      aiParams: { period, from, to, customerId },
    });

    // Use resolved.from, resolved.to, resolved.customerId
    const orders = await db.query.orders.findMany({
      where: and(
        eq(orders.organizationId, appContext.organizationId),
        gte(orders.createdAt, new Date(resolved.from)),
        lte(orders.createdAt, new Date(resolved.to)),
        resolved.customerId ? eq(orders.customerId, resolved.customerId) : undefined,
        status ? eq(orders.status, status) : undefined,
      ),
    });

    // ... format and yield response
  },
});
```

## 5. Flow Examples

### Example 1: Widget Click (Forced)
```
User clicks "January Orders" widget
→ forcedToolCall: { toolName: "getOrders", toolParams: { from: "2026-01-01", to: "2026-01-31" } }
→ resolveToolParams returns exact dates from forcedToolCall
→ Tool uses January date range
```

### Example 2: Natural Language Override
```
User says "Show me orders from last week"
→ AI extracts: { period: "7-days" }
→ forcedToolCall is undefined
→ resolveToolParams converts period to dates
→ Tool uses last 7 days
```

### Example 3: Dashboard Default
```
User says "Show me orders"
→ AI provides no date params
→ forcedToolCall is undefined
→ currentViewFilter has { from: "2026-01-01", to: "2026-01-31" }
→ resolveToolParams uses dashboard filter
→ Tool uses dashboard date range
```

### Example 4: Hardcoded Fallback
```
User says "Show me orders" (new conversation)
→ AI provides no date params
→ forcedToolCall is undefined
→ currentViewFilter is undefined
→ resolveToolParams falls back to 30-days default
→ Tool uses last 30 days
```

## 6. Benefits

1. **Dashboard Widgets**: Can bypass AI interpretation for precise control
2. **Natural Override**: AI can still override with natural language
3. **Consistent Defaults**: Dashboard filter state provides intelligent defaults
4. **Predictable Behavior**: Same behavior between widget clicks and chat commands

## Usage in PRD Stories

- **AI-INFRA-013**: Chat Streaming API - Pass resolved params to tools
- **AI-INFRA-014**: AI Tool Implementations - Use resolveToolParams in each tool
