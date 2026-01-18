# Quick Fix: Integrate FormatAmount into Customers Domain
Generated: 2026-01-17

## Changes Made

Replaced local `formatCurrency` functions with the centralized `FormatAmount` component across 7 customer domain files.

## Files Modified

### 1. `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/components/domain/customers/metrics-dashboard.tsx`
- **Added import**: `import { FormatAmount } from '@/components/shared/format'`
- **Removed**: Lines 48-58 (formatCurrency function)
- **Changed MetricCardProps**: `value` from `string | number` to `React.ReactNode`
- **Updated usages**:
  - Line 175: Lifetime Value metric
  - Line 176: Contract value in subtext
  - Line 191: Average Order Value
  - Line 200: Credit Limit
- **Props**: `cents={false} showCents={false}` (values are in dollars, no decimals)

### 2. `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/components/domain/customers/customer-table.tsx`
- **Added import**: `import { FormatAmount } from '@/components/shared/format'`
- **Removed**: Lines 103-113 (formatCurrency function)
- **Updated usage**:
  - Line 348: Lifetime value in table cell
- **Props**: `cents={false} showCents={false}` (values are in dollars, no decimals)

### 3. `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/components/domain/customers/duplicate-comparison.tsx`
- **Added import**: `import { FormatAmount } from '@/components/shared/format'`
- **Removed**: Lines 69-78 (formatCurrency function)
- **Updated usages**:
  - Line 185: LTV in customer card
  - Lines 328-333: Custom LTV field row (replaced FieldRow with inline div)
- **Props**: `cents={false} showCents={false}` (values are in dollars, no decimals)

### 4. `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/components/domain/customers/analytics-dashboard.tsx`
- **Added import**: `import { FormatAmount } from '@/components/shared/format'`
- **Removed**: Lines 93-100 (formatCurrency function)
- **Added**: Lines 99-108 (formatCurrencyCompact helper for chart callback)
- **Updated usages**:
  - Line 326: Segment revenue display
  - Line 564: Revenue trend chart formatValue callback
- **Props**: `cents={false} compact showCents={false}` (compact notation: K, M)
- **Note**: Kept helper function for chart's formatValue callback since it expects a function

### 5. `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/components/domain/customers/segment-manager.tsx`
- **Added import**: `import { FormatAmount } from '@/components/shared/format'`
- **Removed**: Lines 89-96 (formatCurrency function)
- **Updated usages**:
  - Line 148: Total value in table cell
  - Line 253: Segment value in dialog
  - Line 314: Total value summary card
- **Props**: `cents={false} compact showCents={false}` (compact notation: K, M)

### 6. `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/components/domain/customers/value-analysis.tsx`
- **Added import**: `import { FormatAmount } from '@/components/shared/format'`
- **Removed**: Lines 77-86 (formatCurrency function)
- **Updated usages**:
  - Line 180: Tier revenue
  - Line 181: Average LTV
  - Line 289: Customer LTV
- **Props**: `cents={false} compact showCents={false}` (compact notation: K, M)

### 7. `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/components/domain/customers/segment-analytics.tsx`
- **Added import**: `import { FormatAmount } from '@/components/shared/format'`
- **Removed**: Lines 91-100 (formatCurrency function)
- **Changed KpiCardProps**: `value` from `string | number` to `React.ReactNode`
- **Changed KpiCard render**: `<p>` to `<div>` for value display (line 110)
- **Updated usages**:
  - Line 291: Customer lifetime value in table
  - Line 422: Total segment value in KPI card
- **Props**: `cents={false} compact showCents={false}` (compact notation: K, M)

## Pattern Followed

All integrations follow consistent pattern:
1. Add import: `import { FormatAmount } from '@/components/shared/format'`
2. Remove local `formatCurrency` function
3. Replace JSX: `{formatCurrency(value)}` → `<FormatAmount amount={value} cents={false} showCents={false} />`
4. Add `compact` prop where compact notation (K, M) was used
5. Update component props to accept `React.ReactNode` where needed

## Verification

- Syntax: All files are valid TypeScript/TSX
- Pattern: Matches existing FormatAmount usage in products domain
- Visual: Same appearance preserved (no decimals, compact notation for large numbers)
- Props: Correct `cents={false}` since all customer values are in dollars

## Notes

- All customer domain values are stored in **dollars** (not cents)
- Compact notation preserved where used (K for thousands, M for millions)
- No decimals shown (`showCents={false}`) to match original formatting
- Some components needed prop type changes (`string | number` → `React.ReactNode`)
