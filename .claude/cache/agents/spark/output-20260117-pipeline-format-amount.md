# Quick Fix: Integrate FormatAmount Component into Pipeline Domain
Generated: 2026-01-17

## Change Made
Replaced all `formatCurrency()` function calls with `<FormatAmount />` component across 12 pipeline domain files.

## Files Modified

### 1. `src/components/domain/pipeline/expired-quotes-alert.tsx`
- **Import**: Replaced `formatCurrency` with `FormatAmount`
- **Changes**: 1 usage replaced
  - Line 126: `<FormatAmount amount={quote.totalAmount} />` (quote totals are in dollars)

### 2. `src/components/domain/pipeline/pipeline-metrics.tsx`
- **Import**: Replaced `formatCurrency` with `FormatAmount`
- **Changes**: 3 usages replaced
  - Lines 97, 103, 110: Metrics values (dollars)
- **Type Update**: Updated `MetricCardProps.value` to accept `React.ReactNode`

### 3. `src/components/domain/pipeline/won-lost-dialog.tsx`
- **Import**: Replaced `formatCurrency` with `FormatAmount`
- **Changes**: 1 usage replaced
  - Line 132: `<FormatAmount amount={opportunity.value} />` (opportunity values are in dollars)

### 4. `src/components/domain/pipeline/quick-quote-form.tsx`
- **Import**: Replaced `formatCurrency` with `FormatAmount`
- **Changes**: 6 usages replaced
  - Line 382: Product unit price (dollars)
  - Line 431: Line item unit price (dollars)
  - Line 465: Line item total (dollars)
  - Lines 497, 501, 506: Quote totals - subtotal, GST, total (dollars)

### 5. `src/components/domain/pipeline/opportunity-card.tsx`
- **Import**: Added `FormatAmount` alongside existing `formatCurrency` (kept for aria-label)
- **Changes**: 2 usages replaced
  - Line 154: Opportunity value (dollars)
  - Line 167: Weighted value (dollars)
- **Note**: Kept `formatCurrency` in aria-label on line 122 (components can't go in strings)

### 6. `src/components/domain/pipeline/quote-builder.tsx`
- **Import**: Replaced `formatCurrency` with `FormatAmount`
- **Changes**: 4 usages replaced
  - Line 350: `<FormatAmount amount={item.totalCents} cents={true} />` (in cents)
  - Lines 388, 392, 397: Quote totals with `cents={true}` (in cents)

### 7. `src/components/domain/pipeline/quote-pdf-preview.tsx`
- **Import**: Replaced `formatCurrency` with `FormatAmount`
- **Changes**: 5 usages replaced
  - Lines 316, 324: Item prices with `cents={true}` (in cents)
  - Lines 337, 341, 346: Quote totals with `cents={true}` (in cents)

### 8. `src/components/domain/pipeline/quote-version-history.tsx`
- **Import**: Added `FormatAmount` alongside existing `formatCurrency` (kept for diff calculations)
- **Changes**: 6 usages replaced
  - Line 371: Version total with `cents={true}` (in cents)
  - Line 394: Unit price with `cents={true}` (in cents)
  - Lines 408, 412, 416: Version totals with `cents={true}` (in cents)
  - Line 474: Restore dialog total with `cents={true}` (in cents)
- **Note**: Kept `formatCurrency` in diff calculations on lines 179, 186 (part of string templates)

### 9. `src/components/domain/pipeline/product-quick-add.tsx`
- **Import**: Replaced `formatCurrency` with `FormatAmount`
- **Changes**: 1 usage replaced
  - Line 130: Product unit price (dollars)

### 10. `src/components/domain/pipeline/pipeline-column.tsx`
- **Import**: Added `FormatAmount` alongside existing `formatCurrency` (kept for aria-label)
- **Changes**: 2 usages replaced
  - Line 116: Total value (dollars)
  - Line 119: Weighted value (dollars)
- **Note**: Kept `formatCurrency` in aria-label on line 99 (components can't go in strings)

### 11. `src/components/domain/pipeline/opportunity-detail.tsx`
- **Import**: Replaced `formatCurrency` with `FormatAmount`
- **Changes**: 8 usages replaced
  - Lines 202, 207: Opportunity value and weighted value (dollars)
  - Lines 447, 453: Quote item prices with `cents={true}` (in cents)
  - Lines 465, 469, 474: Quote totals with `cents={true}` (in cents)
  - Line 607: Version total with `cents={true}` (in cents)

### 12. `src/routes/_authenticated/pipeline/$opportunityId.tsx`
- **Import**: Replaced `formatCurrency` with `FormatAmount`
- **Changes**: 1 usage replaced
  - Line 235: Opportunity value (dollars)

## Pattern Applied

### For Dollar Values
```tsx
// Before
{formatCurrency(value)}

// After
<FormatAmount amount={value} />
```

### For Cent Values
```tsx
// Before
{formatCurrency(item.unitPriceCents)}

// After
<FormatAmount amount={item.unitPriceCents} cents={true} />
```

### For String Contexts (aria-labels, templates)
```tsx
// Kept formatCurrency - components can't be used in strings
aria-label={`Value: ${formatCurrency(value)}`}
```

## Verification
- Syntax: All files updated successfully with no TypeScript errors
- Pattern: Followed existing codebase pattern from products domain
- Cents Handling: Properly identified and marked cent values with `cents={true}` prop
  - Quote items (unitPriceCents, totalCents)
  - Quote totals (subtotal, taxAmount, total from quote versions)
- Dollar Handling: Regular amounts for opportunity values, metrics

## Notes
- Some files retain `formatCurrency` import for:
  - aria-label attributes (can't use JSX in strings)
  - Template literals in diff calculations
  - This is intentional and correct
- All quote-related values (builder, PDF, versions) use cents
- All opportunity values and metrics use dollars
- The FormatAmount component handles the conversion automatically via the `cents` prop

## Files Still Using formatCurrency (Intentionally)
1. `opportunity-card.tsx` - aria-label (line 122)
2. `pipeline-column.tsx` - aria-label (line 99)
3. `quote-version-history.tsx` - diff calculations in string templates (lines 179, 186)
