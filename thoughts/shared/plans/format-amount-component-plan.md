# Feature Plan: FormatAmount Component Family
Created: 2026-01-17
Author: architect-agent

## Overview

Design a unified currency/number display component system for consistent formatting across renoz-v3. This includes `FormatAmount` for currency, `FormatPercent` for percentages, and `FormatDelta` for change indicators with directional arrows. The system centralizes scattered formatting logic (e.g., local `formatPrice()` functions) into reusable, composable components.

## Requirements

- [x] Centralized currency formatting (replacing scattered `formatPrice()` functions)
- [x] Color coding: positive (green), negative (red), zero (muted)
- [x] Locale-aware formatting (en-AU default, AUD currency)
- [x] Support for cents-based values (current system stores in cents)
- [x] Compact notation for large numbers ($12.5K, $1.2M)
- [x] Consistent with existing shadcn/ui patterns
- [x] Dark mode compatible
- [x] Companion components: FormatPercent, FormatDelta

## Current State Analysis

### Existing Patterns (VERIFIED)

| Location | Pattern | Issue |
|----------|---------|-------|
| `/src/lib/formatters.ts` | `formatCurrency()`, `formatCurrencyCompact()`, `formatPercentage()` | Functions only, no React components |
| `/src/routes/_authenticated/products/$productId.tsx:75` | Local `formatPrice()` function | Duplicated, not centralized |
| `/src/components/shared/data-table/column-presets.tsx:91` | `currencyColumn()` with inline Intl.NumberFormat | No color coding, no reuse as component |
| `/src/components/shared/forms/currency-field.tsx` | Input component only | For forms, not display |

### Design Tokens (from styles.css)

```css
/* Existing tokens we'll extend */
--destructive: 0 84.2% 60.2%;           /* For negative amounts */
--muted-foreground: 215.4 16.3% 46.9%;  /* For zero amounts */

/* New tokens needed */
--success: 142 76% 36%;                  /* For positive amounts (#00C969 equivalent) */
--success-foreground: 142 76% 36%;
```

## Design

### Architecture

```
src/components/shared/format/
├── index.ts                    # Barrel exports
├── format-amount.tsx           # Currency display component
├── format-percent.tsx          # Percentage display component
├── format-delta.tsx            # Change indicator component
├── format-utils.ts             # Shared formatting utilities
└── format-context.tsx          # Optional: locale/currency context provider
```

### Component Relationship

```
FormatContext (optional global config)
       │
       ├── FormatAmount ─── uses formatUtils
       │       ↓
       │   [color coded currency display]
       │
       ├── FormatPercent ─── uses formatUtils
       │       ↓
       │   [percentage with optional color]
       │
       └── FormatDelta ─── composes FormatPercent
                ↓
            [arrow + percentage change]
```

### Interfaces

```typescript
// src/components/shared/format/format-amount.tsx

export interface FormatAmountProps {
  /** The amount to display */
  amount: number | null | undefined;

  /** Currency code (default: "AUD") */
  currency?: "AUD" | "USD" | "EUR" | "GBP";

  /**
   * Whether amount is in cents (default: true)
   * Most renoz data is stored in cents
   */
  cents?: boolean;

  /**
   * Show +/- sign for non-zero values
   * Useful for showing changes: +$150.00
   */
  showSign?: boolean;

  /**
   * Apply color coding based on value
   * - positive: green (success)
   * - negative: red (destructive)
   * - zero: muted
   */
  colorCode?: boolean;

  /**
   * Size variant
   * - "sm": text-sm (14px)
   * - "base": text-base (16px)
   * - "lg": text-lg (18px)
   * - "xl": text-xl (20px)
   * - "2xl": text-2xl (24px)
   */
  size?: "sm" | "base" | "lg" | "xl" | "2xl";

  /**
   * Use compact notation for large numbers
   * e.g., $12.5K, $1.2M
   */
  compact?: boolean;

  /**
   * Show decimal places (default: true for non-compact)
   */
  showCents?: boolean;

  /** Additional CSS class names */
  className?: string;
}

// src/components/shared/format/format-percent.tsx

export interface FormatPercentProps {
  /** The percentage value (e.g., 45.5 for 45.5%) */
  value: number | null | undefined;

  /** Decimal places (default: 0) */
  decimals?: number;

  /** Show +/- sign for non-zero values */
  showSign?: boolean;

  /** Apply color coding based on value */
  colorCode?: boolean;

  /** Size variant */
  size?: "sm" | "base" | "lg" | "xl" | "2xl";

  /** Additional CSS class names */
  className?: string;
}

// src/components/shared/format/format-delta.tsx

export interface FormatDeltaProps {
  /** The change value (can be amount or percentage) */
  value: number | null | undefined;

  /**
   * Type of delta display
   * - "percent": Show as percentage (e.g., ↑ 12.5%)
   * - "amount": Show as currency (e.g., ↑ $125.00)
   */
  type?: "percent" | "amount";

  /** For "amount" type: currency code */
  currency?: "AUD" | "USD" | "EUR" | "GBP";

  /** For "amount" type: whether value is in cents */
  cents?: boolean;

  /** Decimal places for percentage (default: 1) */
  decimals?: number;

  /**
   * Arrow style
   * - "arrow": ↑ / ↓
   * - "triangle": ▲ / ▼
   * - "none": no indicator
   */
  indicator?: "arrow" | "triangle" | "none";

  /** Size variant */
  size?: "sm" | "base" | "lg" | "xl" | "2xl";

  /**
   * Invert color logic (useful for costs where decrease is good)
   * Default: increase = green, decrease = red
   * Inverted: increase = red, decrease = green
   */
  invertColors?: boolean;

  /** Additional CSS class names */
  className?: string;
}
```

### Data Flow

1. Component receives `amount` prop
2. Check for null/undefined → return placeholder
3. Convert cents to dollars if `cents: true`
4. Apply Intl.NumberFormat with locale/currency
5. Determine color class based on value sign
6. Apply size/compact modifiers
7. Render formatted span with appropriate styling

## CSS Variables (New Tokens)

Add to `src/styles.css`:

```css
:root {
  /* Success/positive colors */
  --success: 142 76% 36%;              /* #00C969 HSL equivalent */
  --success-foreground: 0 0% 100%;

  /* For amounts specifically */
  --amount-positive: var(--success);
  --amount-negative: var(--destructive);
  --amount-zero: var(--muted-foreground);
}

.dark {
  --success: 142 71% 45%;              /* Brighter for dark mode */
  --success-foreground: 142 76% 10%;

  --amount-positive: var(--success);
  --amount-negative: 0 62.8% 50%;      /* Brighter red for dark mode */
  --amount-zero: var(--muted-foreground);
}
```

## Dependencies

| Dependency | Type | Reason |
|------------|------|--------|
| `src/lib/formatters.ts` | Internal | Reuse existing formatting logic |
| `src/lib/utils.ts` (cn) | Internal | Class name merging |
| Tailwind CSS | External | Styling |
| shadcn/ui patterns | Internal | Consistency with existing components |

## Implementation Phases

### Phase 1: Foundation
**Files to create:**
- `src/components/shared/format/format-utils.ts` - Shared formatting utilities
- `src/components/shared/format/index.ts` - Barrel exports

**Acceptance:**
- [x] Utilities compile
- [x] Exports work

**Estimated effort:** Small (1-2 hours)

### Phase 2: FormatAmount Component
**Files to create:**
- `src/components/shared/format/format-amount.tsx`

**Acceptance:**
- [ ] Renders currency correctly
- [ ] Color coding works for positive/negative/zero
- [ ] Size variants work
- [ ] Compact notation works
- [ ] Cents conversion works

**Estimated effort:** Medium (2-3 hours)

### Phase 3: FormatPercent Component
**Files to create:**
- `src/components/shared/format/format-percent.tsx`

**Acceptance:**
- [ ] Renders percentage correctly
- [ ] Decimal places configurable
- [ ] Color coding works

**Estimated effort:** Small (1-2 hours)

### Phase 4: FormatDelta Component
**Files to create:**
- `src/components/shared/format/format-delta.tsx`

**Acceptance:**
- [ ] Arrow indicators work
- [ ] Composes with FormatPercent/FormatAmount
- [ ] Invert colors option works

**Estimated effort:** Small (1-2 hours)

### Phase 5: Integration & Migration
**Files to modify:**
- `src/components/shared/index.ts` - Add exports
- `src/styles.css` - Add success/amount CSS variables
- `src/components/shared/data-table/column-presets.tsx` - Use FormatAmount
- `src/routes/_authenticated/products/$productId.tsx` - Replace local formatPrice

**Acceptance:**
- [ ] All exports available from shared
- [ ] currencyColumn uses FormatAmount
- [ ] No more scattered formatPrice functions

**Estimated effort:** Medium (2-3 hours)

### Phase 6: Documentation
**Files to create:**
- Storybook stories (if applicable)
- JSDoc comments in components

**Estimated effort:** Small (1 hour)

## Integration Examples

### Basic Usage

```tsx
import { FormatAmount, FormatPercent, FormatDelta } from "~/components/shared"

// Basic currency display
<FormatAmount amount={12500} />
// Output: $125.00

// Color-coded with sign
<FormatAmount amount={-5000} colorCode showSign />
// Output: -$50.00 (in red)

// Large number, compact
<FormatAmount amount={1250000} compact />
// Output: $12.5K

// Different size
<FormatAmount amount={100000} size="2xl" colorCode />
// Output: $1,000.00 (large, green)
```

### Percentage Display

```tsx
// Basic percentage
<FormatPercent value={45.5} />
// Output: 46%

// With decimals and color
<FormatPercent value={-12.34} decimals={2} colorCode showSign />
// Output: -12.34% (in red)
```

### Delta/Change Display

```tsx
// Percentage change with arrow
<FormatDelta value={12.5} type="percent" />
// Output: ↑ 12.5% (in green)

// Amount change
<FormatDelta value={-5000} type="amount" indicator="triangle" />
// Output: ▼ $50.00 (in red)

// Inverted (for costs where decrease is good)
<FormatDelta value={-15} type="percent" invertColors />
// Output: ↓ 15% (in green, because decrease in cost is good)
```

### In Data Tables

```tsx
// Updated currencyColumn using FormatAmount
export function currencyColumn<TData>(
  accessor: keyof TData | AccessorFn<TData, number | null | undefined>,
  header = "Amount",
  options: { colorCode?: boolean; cents?: boolean } = {}
): ColumnDef<TData> {
  return {
    id: typeof accessor === "string" ? accessor : "currency",
    accessorFn: typeof accessor === "function" ? accessor : (row) => row[accessor],
    header,
    cell: ({ getValue }) => {
      const value = getValue() as number | null | undefined
      return (
        <FormatAmount
          amount={value}
          cents={options.cents}
          colorCode={options.colorCode}
          className="font-mono"
        />
      )
    },
  }
}
```

### In Cards/Stats

```tsx
// Revenue card with delta
<Card>
  <CardHeader>
    <CardTitle>Monthly Revenue</CardTitle>
  </CardHeader>
  <CardContent>
    <FormatAmount amount={12500000} size="2xl" compact />
    <FormatDelta value={15.3} type="percent" size="sm" />
  </CardContent>
</Card>
```

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing formatCurrency usage | Medium | Keep existing functions, components use them internally |
| Inconsistent cents handling | High | Default to cents=true, document clearly |
| Color accessibility | Medium | Use WCAG-compliant color contrast ratios |
| SSR hydration mismatch | Low | Use consistent locale handling |

## Open Questions

- [x] Should FormatContext be optional or required? **Decision: Optional, components work standalone with defaults**
- [ ] Should we support locale switching at runtime? **Likely no for MVP, en-AU default**
- [ ] Should FormatAmount support inline editing? **Out of scope, use CurrencyField for inputs**

## Success Criteria

1. All currency displays in the app use FormatAmount
2. No scattered formatPrice/formatCurrency inline functions in route files
3. Positive/negative amounts are visually distinguishable
4. Components work in both light and dark mode
5. currencyColumn uses FormatAmount internally

## Migration Checklist

Files that need updating after component is built:

- [ ] `src/routes/_authenticated/products/$productId.tsx` - Remove local formatPrice
- [ ] `src/routes/_authenticated/pipeline/$opportunityId.tsx` - Use FormatAmount
- [ ] `src/routes/_authenticated/reports/pipeline-forecast.tsx` - Use FormatAmount
- [ ] `src/routes/_authenticated/dashboard.tsx` - Replace hardcoded amount strings
- [ ] `src/components/shared/data-table/column-presets.tsx` - Update currencyColumn
