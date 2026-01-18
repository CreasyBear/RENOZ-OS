# Feature Plan: Memoized Table Cell Components

Created: 2026-01-17
Author: architect-agent

## Overview

Design and implement memoized cell components for the products domain DataTable, following the Midday pattern of `memo()` wrapped cell components. This improves render performance by preventing unnecessary re-renders when parent table state changes (sorting, selection, pagination) but cell data remains unchanged.

## Requirements

- [ ] Create memoized cell components with proper `displayName` for DevTools
- [ ] Follow existing codebase patterns (formatters.ts, status-badge.tsx)
- [ ] Support both products domain and potential reuse across domains
- [ ] Integrate seamlessly with existing DataTable and column-presets
- [ ] Maintain accessibility and semantic HTML
- [ ] Support dark mode via existing Tailwind classes

## Design

### Architecture

```
src/components/shared/data-table/
├── data-table.tsx              (existing)
├── column-presets.tsx          (existing - extend)
├── cells/
│   ├── index.ts                (barrel export)
│   ├── price-cell.tsx          (memoized)
│   ├── status-cell.tsx         (memoized)
│   ├── type-cell.tsx           (memoized)
│   ├── date-cell.tsx           (memoized)
│   ├── sku-cell.tsx            (memoized)
│   └── name-cell.tsx           (memoized)
├── data-table-pagination.tsx   (existing)
└── index.ts                    (update exports)
```

### Component API Design

#### 1. PriceCell

```typescript
interface PriceCellProps {
  /** Price value (in cents by default, or dollars if centsInput=false) */
  value: number | null | undefined;
  /** Whether input is in cents (default: true) */
  centsInput?: boolean;
  /** Currency code (default: "AUD") */
  currency?: string;
  /** Show positive values in green (default: false) */
  colorPositive?: boolean;
  /** Show negative values in red (default: true) */
  colorNegative?: boolean;
  /** Text alignment (default: "right") */
  align?: "left" | "center" | "right";
  /** Show cents/decimal places (default: true) */
  showCents?: boolean;
  /** Additional className */
  className?: string;
}

// Usage in column definition:
{
  accessorKey: "basePrice",
  header: () => <div className="text-right">Price</div>,
  cell: ({ row }) => (
    <PriceCell
      value={row.getValue("basePrice")}
      colorPositive
      align="right"
    />
  ),
}
```

#### 2. StatusCell

```typescript
interface StatusCellProps<T extends string = string> {
  /** Status value */
  status: T | null | undefined;
  /** Status configuration map */
  statusConfig: Record<T, StatusConfigItem>;
  /** Show icon with label (default: false) */
  showIcon?: boolean;
  /** Additional className */
  className?: string;
}

interface StatusConfigItem {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
  icon?: React.ComponentType<{ className?: string }>;
}

// Usage:
const PRODUCT_STATUS_CONFIG = {
  active: { label: "Active", variant: "default" },
  inactive: { label: "Inactive", variant: "secondary" },
  discontinued: { label: "Discontinued", variant: "destructive" },
};

<StatusCell status={row.getValue("status")} statusConfig={PRODUCT_STATUS_CONFIG} />
```

#### 3. TypeCell

```typescript
interface TypeCellProps<T extends string = string> {
  /** Type value */
  type: T | null | undefined;
  /** Type configuration map */
  typeConfig: Record<T, TypeConfigItem>;
  /** Badge variant (default: "outline") */
  variant?: "default" | "secondary" | "outline";
  /** Additional className */
  className?: string;
}

interface TypeConfigItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Usage:
const PRODUCT_TYPE_CONFIG = {
  physical: { label: "Physical", icon: Package },
  service: { label: "Service", icon: Wrench },
  digital: { label: "Digital", icon: FileDigit },
  bundle: { label: "Bundle", icon: Layers },
};

<TypeCell type={row.getValue("type")} typeConfig={PRODUCT_TYPE_CONFIG} />
```

#### 4. DateCell

```typescript
interface DateCellProps {
  /** Date value */
  value: Date | string | null | undefined;
  /** Display format (default: "short" = "17 Jan 2026") */
  format?: "short" | "long" | "relative" | "iso";
  /** Custom format options */
  formatOptions?: Intl.DateTimeFormatOptions;
  /** Fallback text when null (default: "—") */
  fallback?: string;
  /** Additional className */
  className?: string;
}

// Usage:
<DateCell value={row.getValue("createdAt")} format="short" />
<DateCell value={row.getValue("updatedAt")} format="relative" />
```

#### 5. SkuCell

```typescript
interface SkuCellProps {
  /** SKU value */
  value: string | null | undefined;
  /** Enable copy-to-clipboard on click (default: false) */
  copyable?: boolean;
  /** Fallback text when null (default: "—") */
  fallback?: string;
  /** Additional className */
  className?: string;
}

// Usage:
<SkuCell value={row.getValue("sku")} copyable />
```

#### 6. NameCell

```typescript
interface NameCellProps {
  /** Primary name/title */
  name: string | null | undefined;
  /** Secondary text (description, subtitle) */
  subtitle?: string | null;
  /** Max width before truncation (default: 250px) */
  maxWidth?: number | string;
  /** Show tooltip on truncation (default: true) */
  showTooltip?: boolean;
  /** Link href (optional - makes name clickable) */
  href?: string;
  /** Additional className */
  className?: string;
}

// Usage:
<NameCell
  name={row.getValue("name")}
  subtitle={row.original.description}
  maxWidth={250}
/>
```

### Data Flow

```
Column Definition (useMemo)
    │
    ├─→ cell: ({ row }) => <MemoizedCell value={...} />
    │
    └─→ MemoizedCell (React.memo)
            │
            ├─→ Props comparison (shallow)
            │
            └─→ Render only if props changed
```

### Memoization Strategy

Each cell component uses `React.memo` with a custom comparison function when needed:

```typescript
const PriceCell = memo(function PriceCell({ value, ... }: PriceCellProps) {
  // Component implementation
});

PriceCell.displayName = "PriceCell";
```

For complex props (like statusConfig objects), use reference equality + useMemo in parent:

```typescript
// In column definition (parent)
const statusConfig = useMemo(() => PRODUCT_STATUS_CONFIG, []);

// Cell will skip re-render if statusConfig reference is stable
<StatusCell status={value} statusConfig={statusConfig} />
```

## Dependencies

| Dependency | Type | Reason |
|------------|------|--------|
| `@/lib/formatters` | Internal | formatCurrency, formatDate, formatRelativeTime |
| `@/lib/utils` | Internal | cn() for className merging |
| `@/components/ui/badge` | Internal | Badge component for status/type |
| `@/components/ui/tooltip` | Internal | Tooltip for truncated text |
| `lucide-react` | External | Icons for type badges |
| `react` | External | memo, useMemo |

## Implementation Phases

### Phase 1: Foundation (Core Cells)

**Files to create:**
- `src/components/shared/data-table/cells/index.ts` - Barrel export
- `src/components/shared/data-table/cells/price-cell.tsx` - Price formatting
- `src/components/shared/data-table/cells/date-cell.tsx` - Date formatting

**Acceptance:**
- [ ] PriceCell renders formatted currency
- [ ] PriceCell supports color coding for positive/negative
- [ ] DateCell supports short, long, relative, iso formats
- [ ] Both use memo() with displayName

**Estimated effort:** Small (2-3 hours)

### Phase 2: Status & Type Cells

**Files to create:**
- `src/components/shared/data-table/cells/status-cell.tsx` - Status badges
- `src/components/shared/data-table/cells/type-cell.tsx` - Type badges with icons

**Dependencies:** Phase 1

**Acceptance:**
- [ ] StatusCell integrates with existing StatusBadge patterns
- [ ] TypeCell renders icon + label in badge
- [ ] Configurable via statusConfig/typeConfig props

**Estimated effort:** Small (2 hours)

### Phase 3: Text Cells

**Files to create:**
- `src/components/shared/data-table/cells/sku-cell.tsx` - Monospace SKU
- `src/components/shared/data-table/cells/name-cell.tsx` - Truncated name + tooltip

**Dependencies:** Phase 1

**Acceptance:**
- [ ] SkuCell renders monospace with optional copy
- [ ] NameCell truncates with tooltip on overflow
- [ ] NameCell supports optional subtitle

**Estimated effort:** Small (2 hours)

### Phase 4: Integration

**Files to modify:**
- `src/components/shared/data-table/index.ts` - Add cell exports
- `src/components/domain/products/product-table.tsx` - Use new cells

**Dependencies:** Phases 1-3

**Acceptance:**
- [ ] All cells exported from data-table index
- [ ] ProductTable uses memoized cells
- [ ] No regression in table functionality

**Estimated effort:** Small (1 hour)

### Phase 5: Documentation & Testing

**Files to create/modify:**
- `src/components/shared/data-table/README.md` - Document cell components
- `src/components/shared/data-table/cells/README.md` - Cell-specific docs

**Coverage target:** N/A (visual components, test via Storybook if available)

**Acceptance:**
- [ ] README documents all cell props
- [ ] Usage examples for each cell type

**Estimated effort:** Small (1 hour)

## Domain-Specific vs Shared Components

### Shared (in `data-table/cells/`)

| Cell | Why Shared |
|------|------------|
| PriceCell | Universal currency formatting |
| DateCell | Universal date formatting |
| StatusCell | Generic status badge pattern |
| TypeCell | Generic icon+label badge pattern |
| SkuCell | Generic monospace identifier |
| NameCell | Generic truncated text + tooltip |

### Domain-Specific Configs (in domain folders)

| Config | Location | Why Domain-Specific |
|--------|----------|---------------------|
| PRODUCT_STATUS_CONFIG | products/constants.ts | Product-specific statuses |
| PRODUCT_TYPE_CONFIG | products/constants.ts | Product-specific types |
| CUSTOMER_STATUS_CONFIG | customers/constants.ts | Customer-specific statuses |

**Pattern:** Cells are generic, configs are domain-specific.

## Integration with Existing Code

### Relationship to column-presets.tsx

The existing `column-presets.tsx` provides column definitions. The new cells complement these:

```typescript
// Current pattern (column-presets.tsx)
export function currencyColumn<TData>(...): ColumnDef<TData> {
  return {
    cell: ({ getValue }) => {
      // Inline rendering logic
    }
  }
}

// New pattern (use memoized cell)
export function currencyColumn<TData>(...): ColumnDef<TData> {
  return {
    cell: ({ getValue }) => (
      <PriceCell value={getValue() as number} />
    )
  }
}
```

Optionally update column-presets to use the new cells for consistency.

### Relationship to formatters.ts

Cells use formatters internally:

```typescript
// price-cell.tsx
import { formatCurrency } from "@/lib/formatters";

const PriceCell = memo(function PriceCell({ value, centsInput = true }: PriceCellProps) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  return <span className="font-mono">{formatCurrency(value, { cents: centsInput })}</span>;
});
```

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Over-memoization overhead | Low | Only memo leaf components, not containers |
| Props reference instability | Medium | Document useMemo pattern for config objects |
| Breaking existing column-presets | Medium | Cells are additive, don't modify existing until validated |
| TypeScript generics complexity | Low | Use simple generics with string constraints |

## Open Questions

- [ ] Should cells support custom render children for full flexibility?
- [ ] Should PriceCell support margin/profit calculations inline?
- [ ] Add Storybook stories for visual testing?

## Success Criteria

1. ProductTable renders with memoized cells without visual regression
2. React DevTools shows cell components not re-rendering on sort/pagination
3. All cells have displayName for debugging
4. Cells are exported and documented for reuse in other domains
5. Pattern is extensible for future cell types (e.g., ImageCell, AvatarCell)

---

## Quick Reference: Final API

```typescript
// Import
import {
  PriceCell,
  StatusCell,
  TypeCell,
  DateCell,
  SkuCell,
  NameCell,
} from "@/components/shared/data-table/cells";

// Usage in ProductTable columns
const columns = useMemo<ColumnDef<Product>[]>(() => [
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => <SkuCell value={row.getValue("sku")} />,
  },
  {
    accessorKey: "name",
    header: "Product Name",
    cell: ({ row }) => (
      <NameCell
        name={row.getValue("name")}
        subtitle={row.original.description}
      />
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <TypeCell type={row.getValue("type")} typeConfig={PRODUCT_TYPE_CONFIG} />
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusCell status={row.getValue("status")} statusConfig={PRODUCT_STATUS_CONFIG} />
    ),
  },
  {
    accessorKey: "basePrice",
    header: () => <div className="text-right">Price</div>,
    cell: ({ row }) => (
      <PriceCell value={row.getValue("basePrice")} align="right" />
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => <DateCell value={row.original.createdAt} />,
  },
], []);
```
