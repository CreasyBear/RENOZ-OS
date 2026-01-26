---
status: pending
priority: p2
issue_id: "ARCH-008"
tags: [helicopter-review, architecture, ai-infrastructure, tools, formatting, group-2]
dependencies: ["ARCH-004"]
---

# ARCH-008: Markdown Table Formatting in Tools

## Problem Statement

Tools return raw objects or simple strings instead of formatted markdown tables. For structured data with 2+ rows, markdown tables are easier to scan and compare. The AI should present data in a user-friendly format.

## Findings

**Source:** Architecture Strategist Agent + Helicopter Review

**Current state (object return):**
```typescript
// src/lib/ai/tools/customer-tools.ts
execute: async ({ query, _context }) => {
  const results = await searchCustomers(query);
  return {
    data: results,  // Raw objects
    _meta: { count: results.length },
  };
}
```

**Midday pattern (markdown table):**
```typescript
// _reference/.midday-reference/apps/api/src/ai/tools/get-customers.ts
execute: async function* ({ query }, executionOptions) {
  const results = await searchCustomers(query);

  const response = `| Name | Email | Status | Created |
|------|-------|--------|---------|
${results.map(c => `| ${c.name} | ${c.email} | ${c.status} | ${formatDate(c.createdAt)} |`).join('\n')}

**${results.length} customers found**`;

  yield {
    text: response,
    link: { text: 'View all', url: '/customers' },
  };
}
```

**Impact:**
- Data harder to scan in chat interface
- AI must format data itself (inconsistent)
- No drill-down links
- Poor user experience for tabular data

## Proposed Solutions

### Option A: Convert Tools to Streaming Generators (Recommended)
- **Pros:** Matches Midday, better UX, enables links
- **Cons:** Requires updating all tools
- **Effort:** Medium (2-3 hours)
- **Risk:** Low

### Option B: Add Formatter Utilities Only
- **Pros:** Less invasive
- **Cons:** Still returns objects, AI must use formatters
- **Effort:** Small (1 hour)
- **Risk:** Low but incomplete

## Recommended Action

Option A - Convert tools to streaming generators with markdown table formatting.

## Technical Details

**Files to modify:**
- `src/lib/ai/tools/customer-tools.ts`
- `src/lib/ai/tools/order-tools.ts`
- `src/lib/ai/tools/analytics-tools.ts`

**Helper functions:**
```typescript
// src/lib/ai/tools/formatters.ts

/**
 * Format data as a markdown table.
 */
export function formatAsTable<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; header: string; format?: (v: unknown) => string }[]
): string {
  if (data.length === 0) return 'No data found.';

  const headers = columns.map(c => c.header);
  const headerRow = `| ${headers.join(' | ')} |`;
  const separator = `|${columns.map(() => '------').join('|')}|`;

  const rows = data.map(item =>
    `| ${columns.map(c => {
      const value = item[c.key];
      return c.format ? c.format(value) : String(value ?? 'N/A');
    }).join(' | ')} |`
  ).join('\n');

  return `${headerRow}\n${separator}\n${rows}`;
}

/**
 * Format currency value.
 */
export function formatCurrency(cents: number | null, currency = 'AUD'): string {
  if (cents === null) return 'N/A';
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

/**
 * Format date value.
 */
export function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Truncate ID for display.
 */
export function truncateId(id: string, length = 8): string {
  return id.slice(0, length);
}
```

**Converted tool example:**
```typescript
// src/lib/ai/tools/customer-tools.ts
export const searchCustomersTool = tool({
  description: 'Search for customers by name or email.',
  inputSchema: z.object({
    query: z.string().min(2).describe('Search query'),
    limit: z.number().default(10).describe('Max results'),
  }),
  execute: async function* ({ query, limit }, executionOptions) {
    const ctx = executionOptions.experimental_context as ToolExecutionContext;

    if (!ctx?.organizationId) {
      yield { text: 'Organization context missing.' };
      return;
    }

    try {
      const results = await db.query.customers.findMany({
        where: and(
          eq(customers.organizationId, ctx.organizationId),
          sql`${customers.name} ILIKE ${`%${query}%`}`,
        ),
        limit,
      });

      if (results.length === 0) {
        yield { text: `No customers found matching "${query}".` };
        return;
      }

      const table = formatAsTable(results, [
        { key: 'id', header: 'ID', format: truncateId },
        { key: 'name', header: 'Name' },
        { key: 'status', header: 'Status' },
        { key: 'healthScore', header: 'Health', format: v => `${v ?? 'N/A'}%` },
        { key: 'createdAt', header: 'Created', format: formatDate },
      ]);

      yield {
        text: `${table}\n\n**${results.length} customers** matching "${query}"`,
        link: {
          text: 'View all customers',
          url: `${getAppUrl()}/customers?q=${encodeURIComponent(query)}`,
        },
      };
    } catch (error) {
      yield {
        text: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});
```

## Acceptance Criteria

- [ ] Formatter utilities created (table, currency, date, id)
- [ ] Customer tools converted to streaming generators
- [ ] Order tools converted to streaming generators
- [ ] Analytics tools converted to streaming generators
- [ ] All multi-row data uses markdown tables
- [ ] Links included for drill-down navigation
- [ ] TypeScript compiles without errors

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-26 | Created from helicopter review | Markdown tables significantly improve data readability |

## Resources

- `_reference/.midday-reference/apps/api/src/ai/tools/get-customers.ts` - Table formatting example
- `patterns/04-tool-patterns.md` - Markdown table pattern
- `src/lib/ai/tools/streaming.ts` - Existing streaming utilities
