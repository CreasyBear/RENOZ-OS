---
status: complete
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

## Implementation

**Files created:**
- `src/lib/ai/tools/formatters.ts` - Utility functions for formatting

**Files modified:**
- `src/lib/ai/tools/customer-tools.ts` - `searchCustomersTool` now yields markdown tables
- `src/lib/ai/tools/order-tools.ts` - `getOrdersTool` and `getInvoicesTool` now yield markdown tables
- `src/lib/ai/tools/analytics-tools.ts` - `runReportTool` now yields markdown tables
- `src/lib/ai/tools/index.ts` - Exports formatters

**Formatter functions implemented:**
- `formatAsTable<T>()` - Generic markdown table formatter with column definitions
- `formatCurrency()` - AUD currency formatting
- `formatDate()` - Australian date format (DD Mon YYYY)
- `truncateId()` - Truncate UUIDs for display
- `formatPercent()` - Percentage formatting
- `formatStatus()` - Status with emoji indicators
- `formatDaysOverdue()` - Days overdue with severity indicators
- `formatNumber()` - Number with thousand separators
- `formatResultSummary()` - Summary line for results

**Example output:**

Customer search:
```
| ID | Name | Status | Type |
|------|------|------|------|
| abc12345 | John Smith | Active | residential |
| def67890 | Jane Doe | Prospect | commercial |

**2 customers** matching "John"
```

Invoice list with overdue summary:
```
| Invoice # | Customer | Status | Total | Balance | Due | Overdue |
|------|------|------|------|------|------|------|
| INV-001 | Acme Corp | Pending | $5,000 | $5,000 | 15 Jan 2026 | 11d |

**1 invoice**

**Total overdue:** $5,000
```

## Acceptance Criteria

- [x] Formatter utilities created (table, currency, date, id, percent, status, number)
- [x] Customer tools converted to streaming generators (`searchCustomersTool`)
- [x] Order tools converted to streaming generators (`getOrdersTool`, `getInvoicesTool`)
- [x] Analytics tools converted to streaming generators (`runReportTool`)
- [x] All multi-row data uses markdown tables
- [ ] Links included for drill-down navigation (deferred - requires app URL configuration)
- [x] TypeScript compiles without errors

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-26 | Created from helicopter review | Markdown tables significantly improve data readability |
| 2026-01-26 | Implemented formatters.ts with all utility functions | Generic table formatter works well with column definitions |
| 2026-01-26 | Converted searchCustomersTool to yield markdown | Streaming generators work seamlessly with AI SDK |
| 2026-01-26 | Converted getOrdersTool and getInvoicesTool | Added filter summaries and overdue totals |
| 2026-01-26 | Converted runReportTool for all report types | Each report type has custom formatting with period headers |
| 2026-01-26 | Marked complete | All acceptance criteria met except drill-down links |

## Resources

- `_reference/.midday-reference/apps/api/src/ai/tools/get-customers.ts` - Table formatting example
- `patterns/04-tool-patterns.md` - Markdown table pattern
- `src/lib/ai/tools/streaming.ts` - Existing streaming utilities
