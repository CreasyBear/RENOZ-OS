# Task: Implement Reports Domain

## Context
Read the PRD file to find the first story where `passes: false`.
Read the progress file for learnings from previous iterations.
Read `AGENTS.md` and conventions for project patterns.

## Project Location
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack

## PRD File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/domains/reports.prd.json

## Progress File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/_progress/dom-reports.progress.txt

## PRD ID
DOM-REPORTS

## Phase
domain-core

## Priority
4

## Dependencies
- All domain PRDs for data reporting

---

## Pre-Flight Checks

Before starting, verify:

```bash
# 1. TypeScript compiles
npm run typecheck

# 2. Check domain data is available
# Verify core domains (customers, orders, jobs) are complete
```

---

## Context Files

### Required Reading (in order)

1. **Progress File**: Check for learnings from previous iterations
2. **PRD File**: Get current story and acceptance criteria
3. **Conventions**: `memory-bank/_meta/conventions.md`
4. **Glossary**: `memory-bank/_meta/glossary.md`

### Domain References

| Reference | Purpose |
|-----------|---------|
| `src/server/functions/reports.ts` | Report server functions |
| `src/components/domain/reports/` | Report UI components |
| `src/routes/_authed/reports/` | Report routes |

---

## Renoz Business Context

### Report Categories

Renoz reporting reflects the key metrics of an Australian battery distribution business:

```
Sales Performance
    ↓
Financial Health (GST, Revenue, Margins)
    ↓
Operations (Inventory Turnover, Fulfillment)
    ↓
Field Service (Job Completion, Technician Performance)
```

**Report Categories:**

- **Sales Reports**: Revenue, conversion rates, pipeline value, top customers
- **Financial Reports**: GST liability, profit margins, payment aging, cash flow
- **Inventory Reports**: Stock levels, turnover rate, reorder alerts, dead stock
- **Job Reports**: Job completion rate, technician productivity, installation metrics
- **Customer Reports**: Customer lifetime value, retention, satisfaction

**IMPORTANT**: Unlike generic reporting, Renoz requires GST-specific calculations (10% Australian tax), CEC compliance tracking for installations, and battery warranty claim analysis by manufacturer.

### Critical Reporting Metrics

**Sales Metrics:**
- Monthly recurring revenue (MRR) for service contracts
- Average order value (AOV)
- Win rate by opportunity stage
- Sales cycle length
- Top products by revenue and margin

**Financial Metrics:**
- GST collected vs. paid (quarterly BAS reconciliation)
- Gross profit margin by product category
- Accounts receivable aging (30/60/90 days)
- Cash flow forecast
- Cost of goods sold (COGS) tracking

**Operational Metrics:**
- Inventory turnover rate
- Stock-out frequency
- Average fulfillment time
- Hazmat shipping compliance rate
- Serial number capture rate (for warranty)

**Field Service Metrics:**
- Job completion rate
- Average job duration
- CEC compliance score
- Customer satisfaction (NPS)
- Warranty claim rate by manufacturer

---

## UI Pattern References

### Report Dashboard Layout

**Component**: Grid layout with metric cards and charts

```typescript
// Reference implementation
import { Card, CardHeader, CardTitle, CardContent } from '@/registry/default/ui/card';
import { Badge } from '@/registry/default/ui/badge';

// Dashboard layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Metric cards */}
  <Card>
    <CardHeader>
      <CardTitle className="text-sm font-medium text-muted-foreground">
        Monthly Revenue
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{formatCurrency(revenue, 'AUD')}</div>
      <p className="text-xs text-muted-foreground">
        <span className={trend > 0 ? 'text-green-600' : 'text-red-600'}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
        {' '}from last month
      </p>
    </CardContent>
  </Card>

  {/* More metric cards */}
</div>

{/* Charts section */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
  <Card>
    <CardHeader>
      <CardTitle>Sales Trend</CardTitle>
    </CardHeader>
    <CardContent>
      <LineChart data={salesData} />
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Top Products</CardTitle>
    </CardHeader>
    <CardContent>
      <BarChart data={productsData} />
    </CardContent>
  </Card>
</div>
```

**Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`

### Date Range Filter

**Component**: Date range picker with preset options

```typescript
// Report date range selector
import { DateRangePicker } from '@/registry/default/ui/date-range-picker';
import { Select } from '@/registry/default/ui/select';

<div className="flex items-center gap-4">
  <Select value={preset} onValueChange={handlePresetChange}>
    <SelectTrigger>
      <SelectValue placeholder="Select period" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="today">Today</SelectItem>
      <SelectItem value="yesterday">Yesterday</SelectItem>
      <SelectItem value="last_7_days">Last 7 Days</SelectItem>
      <SelectItem value="last_30_days">Last 30 Days</SelectItem>
      <SelectItem value="this_month">This Month</SelectItem>
      <SelectItem value="last_month">Last Month</SelectItem>
      <SelectItem value="this_quarter">This Quarter</SelectItem>
      <SelectItem value="this_financial_year">This Financial Year</SelectItem>
      <SelectItem value="custom">Custom Range</SelectItem>
    </SelectContent>
  </Select>

  {preset === 'custom' && (
    <DateRangePicker
      from={dateRange.from}
      to={dateRange.to}
      onDateChange={handleDateChange}
    />
  )}

  <Button variant="outline" onClick={handleExport}>
    Export CSV
  </Button>

  <Button variant="outline" onClick={handleExportPDF}>
    Export PDF
  </Button>
</div>
```

### Report Table with Aggregation

**Component**: DataGrid with summary row and drill-down

```typescript
// Report table with totals
import { DataGrid } from '@/registry/default/ui/data-grid';

const columns = [
  {
    accessorKey: 'productName',
    header: 'Product',
    footer: () => <strong>Total</strong>,
  },
  {
    accessorKey: 'quantitySold',
    header: 'Qty Sold',
    footer: (info) => {
      const total = info.table.getFilteredRowModel().rows.reduce(
        (sum, row) => sum + row.original.quantitySold,
        0
      );
      return <strong>{total}</strong>;
    },
  },
  {
    accessorKey: 'revenue',
    header: 'Revenue',
    cell: ({ row }) => formatCurrency(row.original.revenue, 'AUD'),
    footer: (info) => {
      const total = info.table.getFilteredRowModel().rows.reduce(
        (sum, row) => sum + row.original.revenue,
        0
      );
      return <strong>{formatCurrency(total, 'AUD')}</strong>;
    },
  },
  {
    accessorKey: 'margin',
    header: 'Margin %',
    cell: ({ row }) => `${row.original.margin.toFixed(2)}%`,
    footer: (info) => {
      const rows = info.table.getFilteredRowModel().rows;
      const avgMargin = rows.reduce((sum, row) => sum + row.original.margin, 0) / rows.length;
      return <strong>{avgMargin.toFixed(2)}%</strong>;
    },
  },
];

<DataGrid
  data={reportData}
  columns={columns}
  enableFooters={true}
  onRowClick={handleDrillDown}
/>
```

---

## Implementation Notes

### Report Query Optimization

```typescript
// Optimize large report queries with indexes and aggregations
import { sql, eq, and, gte, lte } from 'drizzle-orm';

// Sales report by product (efficient aggregation)
export async function getSalesReport(
  orgId: string,
  startDate: Date,
  endDate: Date
) {
  return await db
    .select({
      productId: orderItems.productId,
      productName: products.name,
      quantitySold: sql<number>`sum(${orderItems.quantity})::int`,
      revenue: sql<number>`sum(${orderItems.quantity} * ${orderItems.unitPrice})`,
      cost: sql<number>`sum(${orderItems.quantity} * ${products.costPrice})`,
      margin: sql<number>`
        (sum(${orderItems.quantity} * ${orderItems.unitPrice}) -
         sum(${orderItems.quantity} * ${products.costPrice})) /
        nullif(sum(${orderItems.quantity} * ${orderItems.unitPrice}), 0) * 100
      `,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(
      and(
        eq(orders.organizationId, orgId),
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
        eq(orders.status, 'delivered')
      )
    )
    .groupBy(orderItems.productId, products.name)
    .orderBy(sql`sum(${orderItems.quantity} * ${orderItems.unitPrice}) desc`);
}
```

### GST Report Calculation

```typescript
// GST collected and paid (for BAS lodgement)
export async function getGSTReport(
  orgId: string,
  quarterStart: Date,
  quarterEnd: Date
) {
  // GST collected on sales
  const gstCollected = await db
    .select({
      totalSales: sql<number>`sum(total)`,
      gstAmount: sql<number>`sum(total * 0.10)`, // 10% GST
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.organizationId, orgId),
        gte(invoices.issuedAt, quarterStart),
        lte(invoices.issuedAt, quarterEnd),
        eq(invoices.status, 'paid')
      )
    );

  // GST paid on purchases
  const gstPaid = await db
    .select({
      totalPurchases: sql<number>`sum(total)`,
      gstAmount: sql<number>`sum(total * 0.10)`,
    })
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.organizationId, orgId),
        gte(purchaseOrders.receivedAt, quarterStart),
        lte(purchaseOrders.receivedAt, quarterEnd),
        eq(purchaseOrders.status, 'received')
      )
    );

  return {
    gstCollected: gstCollected[0].gstAmount || 0,
    gstPaid: gstPaid[0].gstAmount || 0,
    gstPayable: (gstCollected[0].gstAmount || 0) - (gstPaid[0].gstAmount || 0),
    quarter: `${quarterStart.toISOString().slice(0, 7)} to ${quarterEnd.toISOString().slice(0, 7)}`,
  };
}
```

### Report Caching Strategy

```typescript
// Cache expensive report calculations
import { cache } from '@/server/cache';

export async function getCachedReport<T>(
  reportKey: string,
  params: Record<string, unknown>,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 300 // 5 minutes default
): Promise<T> {
  const cacheKey = `report:${reportKey}:${JSON.stringify(params)}`;

  // Try cache first
  const cached = await cache.get<T>(cacheKey);
  if (cached) return cached;

  // Fetch fresh data
  const data = await fetchFn();

  // Store in cache
  await cache.set(cacheKey, data, ttlSeconds);

  return data;
}

// Usage
export const getSalesReportCached = createServerFn({ method: 'POST' })
  .inputValidator(ReportParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await requireAuth();

    return getCachedReport(
      'sales',
      { orgId: ctx.session.orgId, ...data },
      () => getSalesReport(ctx.session.orgId, data.startDate, data.endDate),
      300 // 5 min cache
    );
  });
```

### CSV Export Implementation

```typescript
// Export report data to CSV
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string
): Blob {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  // Extract headers
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Handle commas and quotes in values
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvRows.push(values.join(','));
  }

  const csvContent = csvRows.join('\n');
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

// Server function for export
export const exportReport = createServerFn({ method: 'POST' })
  .inputValidator(ExportReportSchema)
  .handler(async ({ data }) => {
    const ctx = await requireAuth();

    // Fetch report data
    const reportData = await getReportData(
      ctx.session.orgId,
      data.reportType,
      data.params
    );

    // Generate CSV
    const csv = exportToCSV(reportData, `${data.reportType}-${new Date().toISOString()}.csv`);

    return {
      data: csv,
      filename: `${data.reportType}-${new Date().toISOString()}.csv`,
      contentType: 'text/csv',
    };
  });
```

### Scheduled Report Generation

```typescript
// Background job to generate scheduled reports
import { schedules } from '@trigger.dev/sdk/v3';

export const weeklyExecutiveSummary = schedules.task({
  id: 'weekly-executive-summary',
  cron: '0 9 * * MON', // Monday 9am
  run: async (payload) => {
    const orgs = await db.select().from(organizations).where(eq(organizations.status, 'active'));

    for (const org of orgs) {
      const lastWeek = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      // Generate summary metrics
      const summary = await generateExecutiveSummary(org.id, lastWeek.start, lastWeek.end);

      // Send email to org owners
      await sendEmail({
        to: org.ownerEmails,
        template: 'weekly-executive-summary',
        data: summary,
      });
    }
  },
});
```

---

## Workflow

1. Find the first story where `passes: false`
2. Check dependencies - all must have `passes: true`
3. Implement according to acceptance_criteria
4. Run `npm run typecheck` to verify
5. If tests pass:
   - Set `story.passes = true` in prd.json
   - Append success to progress.txt
   - Commit with message: "Complete [STORY-ID]: Story Title"
6. If tests fail:
   - Append learnings to progress.txt
   - Do NOT modify prd.json
   - Retry with fixes

---

## Domain Guidelines

### DO
- Support date range filtering with presets (today, last 7 days, this month, etc.)
- Enable export to CSV and PDF formats
- Optimize for large datasets with SQL aggregations
- Cache expensive calculations (5-15 min TTL)
- Use database indexes for report queries
- Provide drill-down capability from summary to detail
- Calculate GST correctly (10% Australian tax)
- Support Australian financial year (July 1 - June 30)
- Show trend indicators (up/down arrows with percentages)
- Include comparison periods (vs last month, vs last year)

### DON'T
- Load all data at once (use pagination/streaming)
- Skip pagination for large result sets
- Calculate aggregations in application code (use SQL)
- Store pre-calculated reports in database (generate on demand)
- Expose raw database queries to client
- Skip permission checks on sensitive financial reports
- Use incorrect GST calculation (must be 10% of total)

---

## Completion Signals

When the target story passes:
```xml
<promise>[STORY_ID]_COMPLETE</promise>
```

When ALL stories in this PRD have `passes: true`:
```xml
<promise>DOM_REPORTS_COMPLETE</promise>
```

---

*Domain PRD - Reporting and analytics for Australian battery distribution business*
