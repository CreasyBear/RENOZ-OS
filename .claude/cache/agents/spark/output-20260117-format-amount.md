# Quick Fix: FormatAmount Component Family Implementation
Generated: 2026-01-17

## Change Made

Implemented the FormatAmount component family for consistent currency display across the renoz-v3 application, replacing scattered `formatPrice()` functions with centralized, reusable components.

## Files Created

### 1. `/src/components/shared/format/format-amount.tsx`
- **Purpose**: Currency display component with color coding, size variants, and compact notation
- **Key features**:
  - Handles cents-based values (default in renoz-v3)
  - Color coding: green (positive), red (negative), muted (zero)
  - Size variants: sm, base, lg, xl, 2xl
  - Compact notation: $12.5K, $1.2M
  - Null-safe with fallback display (—)

### 2. `/src/components/shared/format/format-percent.tsx`
- **Purpose**: Percentage display with optional sign and color coding
- **Key features**:
  - Configurable decimal places
  - Optional +/- sign display
  - Color coding for positive/negative values
  - Size variants matching FormatAmount

### 3. `/src/components/shared/format/format-delta.tsx`
- **Purpose**: Change indicators with directional arrows
- **Key features**:
  - Composes FormatAmount and FormatPercent
  - Arrow indicators: ↑ / ↓ or ▲ / ▼
  - Color coding with optional inversion (for costs)
  - Supports both percentage and amount deltas

### 4. `/src/components/shared/format/index.ts`
- **Purpose**: Barrel exports for all format components

## Files Modified

### 1. `/src/components/shared/index.ts`
- **Change**: Added exports for FormatAmount, FormatPercent, FormatDelta
- **Impact**: Components now available via `import { FormatAmount } from "@/components/shared"`

### 2. `/src/components/shared/data-table/column-presets.tsx`
- **Change**: Updated `currencyColumn()` to use FormatAmount
- **Old behavior**: Inline Intl.NumberFormat
- **New behavior**: Uses FormatAmount component with options for colorCode, cents, currency
- **Breaking change**: Third parameter changed from `currency` string to `options` object
  - Migration: `currencyColumn(x, "Amount", "AUD")` → `currencyColumn(x, "Amount", { currency: "AUD" })`

### 3. `/src/routes/_authenticated/products/$productId.tsx`
- **Lines removed**: 75-80 (local formatPrice function)
- **Changes**:
  - Line 148: `formatPrice(product.basePrice ?? 0)` → `<FormatAmount amount={product.basePrice ?? 0} cents={true} size="2xl" />`
  - Line 153: `formatPrice(product.costPrice)` → `<FormatAmount amount={product.costPrice} cents={true} size="xl" />`

### 4. `/src/components/domain/products/product-table.tsx`
- **Lines removed**: 87-92 (local formatPrice function)
- **Changes**:
  - Line 202: Base price cell now uses `<FormatAmount amount={row.getValue("basePrice")} cents={true} />`
  - Line 215: Cost price cell now uses `<FormatAmount amount={cost} cents={true} />`

## Verification

### Syntax Check
- Fixed import paths to use `@/lib/utils` instead of `~/lib/utils`
- All components use proper TypeScript types
- Memoized with React.memo for performance

### Pattern Followed
- Followed existing shadcn/ui component patterns
- Used `cn()` utility for class merging
- Dark mode compatible with `dark:` variants
- Consistent with existing component conventions

## Files Modified Summary

1. **Created**: `src/components/shared/format/format-amount.tsx` - Main currency component
2. **Created**: `src/components/shared/format/format-percent.tsx` - Percentage component
3. **Created**: `src/components/shared/format/format-delta.tsx` - Change indicator component
4. **Created**: `src/components/shared/format/index.ts` - Barrel exports
5. **Updated**: `src/components/shared/index.ts` - Added format component exports
6. **Updated**: `src/components/shared/data-table/column-presets.tsx` - Replaced inline formatting
7. **Updated**: `src/routes/_authenticated/products/$productId.tsx` - Removed local formatPrice
8. **Updated**: `src/components/domain/products/product-table.tsx` - Removed local formatPrice

## Usage Examples

### Basic Currency Display
```tsx
<FormatAmount amount={12500} cents={true} />
// Output: $125.00
```

### Color-Coded Amount
```tsx
<FormatAmount amount={-5000} cents={true} colorCode showSign />
// Output: -$50.00 (in red)
```

### Compact Notation
```tsx
<FormatAmount amount={1250000} cents={true} compact />
// Output: $12.5K
```

### Percentage with Decimals
```tsx
<FormatPercent value={45.5} decimals={1} />
// Output: 45.5%
```

### Change Indicator
```tsx
<FormatDelta value={12.5} type="percent" />
// Output: ↑ 12.5% (in green)
```

### In Data Tables
```tsx
currencyColumn("totalAmount", "Amount", { cents: true, colorCode: true })
```

## Migration Notes

### Breaking Changes
- `currencyColumn()` third parameter changed from string to options object
- Local `formatPrice()` functions should be replaced with `<FormatAmount>`

### Remaining Work
According to the plan, these files still have local formatPrice functions that should be migrated:
- `src/components/domain/products/price-tiers.tsx`
- `src/components/domain/products/price-history.tsx`
- `src/components/domain/products/bundle-creator.tsx`
- `src/components/domain/products/pricing-engine.tsx`
- `src/components/domain/products/bundle-editor.tsx`
- `src/components/domain/products/customer-pricing.tsx`
- `src/components/domain/products/component-selector.tsx`
- `src/components/domain/orders/product-selector.tsx`
- `src/components/domain/orders/order-creation-wizard.tsx`
- `src/components/domain/products/tabs/pricing-tab.tsx`

### Next Steps
1. Migrate remaining formatPrice functions to FormatAmount
2. Add CSS variables for success colors to `src/styles.css` (optional)
3. Consider adding Storybook stories for documentation
4. Update tests to use FormatAmount

## Notes

- All amounts default to cents=true (renoz-v3 stores prices in cents)
- Color coding is opt-in via `colorCode` prop
- Dark mode support built-in with `dark:` Tailwind variants
- Components are memoized for performance
- Null-safe: displays "—" for null/undefined values
