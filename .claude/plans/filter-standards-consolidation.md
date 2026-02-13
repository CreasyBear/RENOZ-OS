# Implementation Plan: FILTER-STANDARDS Consolidation

## Requirements Restatement

Consolidate **12 domain-specific filter implementations** into a single config-driven shared component system that:
1. Eliminates ~2,000 lines of duplicated code
2. Provides consistent UX across all domains
3. Supports all filter types (search, select, multi-select, date-range, number-range, toggle)
4. Includes URL state sync via TanStack Router's `validateSearch`
5. Shows active filter chips with remove capability
6. Supports filter presets and saved views

## Current State Analysis

### Files to Consolidate (12 total)

| File | Lines | Filter Types |
|------|-------|--------------|
| `orders/order-filters.tsx` | 428 | search, select, date-range, number-range |
| `customers/customer-filters.tsx` | ~300 | search, multi-select, number-range, tags |
| `pipeline/pipeline-filters.tsx` | ~250 | search, select, date-range |
| `products/product-filters.tsx` | ~200 | search, select, toggle |
| `purchase-orders/po-filters.tsx` | ~220 | search, select, date-range |
| `suppliers/supplier-filters.tsx` | ~180 | search, select |
| `support/issues/issue-quick-filters.tsx` | ~150 | search, select, priority |
| `inventory/filter-panel.tsx` | ~200 | search, select, location |
| `orders/fulfillment/fulfillment-filters.tsx` | ~180 | search, select, date |
| `pricing/pricing-filters.tsx` | ~150 | search, select, date-range |
| `warranty/views/warranty-list-filters.tsx` | ~200 | search, select, date-range |
| `communications/campaigns/recipient-filter-builder.tsx` | ~250 | complex query builder |

### Common Patterns Identified

Every filter file reimplements:
1. **SearchInput** with icon + clear button (~30 lines each)
2. **Status/Type Select** dropdowns (~40 lines each)
3. **Date Range Picker** with calendar popover (~60 lines each)
4. **Active Filter Chips** with remove buttons (~80 lines each)
5. **Advanced Panel Toggle** with count badge (~25 lines each)
6. **Clear All** functionality (~15 lines each)

---

## Implementation Phases

### Phase 1: Core Filter Primitives (src/components/shared/filters/)

Create atomic filter components that can be composed.

**Files to create:**
```
src/components/shared/filters/
├── index.ts                    # Barrel exports
├── types.ts                    # Shared types
├── filter-search-input.tsx     # Search with icon + clear
├── filter-select.tsx           # Single select with "All" option
├── filter-multi-select.tsx     # Checkbox dropdown
├── filter-date-picker.tsx      # Single date picker
├── filter-date-range.tsx       # From/To date range
├── filter-number-range.tsx     # Min/Max number inputs
├── filter-toggle.tsx           # Boolean switch
├── filter-chip.tsx             # Removable filter chip
├── filter-chips-bar.tsx        # Active filters display
└── filter-presets.tsx          # Quick filter buttons
```

**Key types (types.ts):**
```typescript
export type FilterFieldType =
  | 'search'
  | 'select'
  | 'multi-select'
  | 'date'
  | 'date-range'
  | 'number-range'
  | 'toggle';

export interface FilterFieldConfig<T = unknown> {
  key: string;
  label: string;
  type: FilterFieldType;
  placeholder?: string;
  options?: Array<{ value: T; label: string; icon?: LucideIcon }>;
  primary?: boolean;  // Show in primary bar vs advanced panel
  formatChip?: (value: T) => string;  // Custom chip display
}

export interface FilterBarConfig<TFilters> {
  search?: {
    placeholder?: string;
    fields?: (keyof TFilters)[];
  };
  filters: FilterFieldConfig[];
  presets?: FilterPreset<TFilters>[];
}

export interface FilterPreset<T> {
  id: string;
  label: string;
  icon?: LucideIcon;
  filters: Partial<T>;
}
```

### Phase 2: Composable Filter Bar Component

Create the main `DomainFilterBar` component.

**File:** `src/components/shared/filters/domain-filter-bar.tsx`

```typescript
interface DomainFilterBarProps<T extends Record<string, unknown>> {
  config: FilterBarConfig<T>;
  filters: T;
  onFiltersChange: (filters: T) => void;
  resultCount?: number;
  defaultAdvancedOpen?: boolean;
  className?: string;
}

export function DomainFilterBar<T extends Record<string, unknown>>({
  config,
  filters,
  onFiltersChange,
  resultCount,
  defaultAdvancedOpen = false,
  className,
}: DomainFilterBarProps<T>) {
  // Renders:
  // 1. Primary row: Search + Primary filters + Advanced toggle
  // 2. Active chips bar (auto from filters state)
  // 3. Advanced panel (collapsible)
  // 4. Result count
}
```

### Phase 3: URL State Hook

Create TanStack Router integration hook.

**File:** `src/hooks/filters/use-filter-url-state.ts`

```typescript
import { z } from 'zod';

export function useFilterUrlState<T extends z.ZodType>(
  schema: T,
  defaults: z.infer<T>
): [z.infer<T>, (filters: z.infer<T>) => void] {
  // Uses Route.useSearch() and Route.useNavigate()
  // Validates with Zod schema
  // Serializes dates/numbers correctly
}
```

### Phase 4: Domain Filter Configs

Create config files for each domain (tiny files).

**Example:** `src/components/domain/orders/order-filter-config.ts`

```typescript
import { Clock, AlertTriangle, DollarSign } from 'lucide-react';
import type { FilterBarConfig } from '@/components/shared/filters';
import type { OrderFiltersState } from '@/lib/schemas/orders';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '@/lib/schemas/orders';

export const ORDER_FILTER_CONFIG: FilterBarConfig<OrderFiltersState> = {
  search: {
    placeholder: 'Search orders...',
    fields: ['orderNumber', 'customerName'],
  },
  filters: [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: ORDER_STATUSES,
      primary: true,
    },
    {
      key: 'paymentStatus',
      label: 'Payment',
      type: 'select',
      options: PAYMENT_STATUSES,
    },
    {
      key: 'dateRange',
      label: 'Date',
      type: 'date-range',
    },
    {
      key: 'totalRange',
      label: 'Amount',
      type: 'number-range',
      formatChip: (v) => `$${v.min ?? 0} - $${v.max ?? '∞'}`,
    },
  ],
  presets: [
    { id: 'pending', label: 'Pending Payment', icon: Clock, filters: { paymentStatus: 'pending' } },
    { id: 'overdue', label: 'Overdue', icon: AlertTriangle, filters: { paymentStatus: 'overdue' } },
    { id: 'high-value', label: 'High Value', icon: DollarSign, filters: { minTotal: 10000 } },
  ],
};
```

### Phase 5: Migrate Domains

Update each domain to use the new shared component.

**Before (428 lines):**
```typescript
// src/components/domain/orders/order-filters.tsx
export function OrderFilters({ filters, onFiltersChange, resultCount }: OrderFiltersProps) {
  // 400+ lines of custom implementation
}
```

**After (15 lines):**
```typescript
// src/components/domain/orders/order-filters.tsx
import { DomainFilterBar } from '@/components/shared/filters';
import { ORDER_FILTER_CONFIG } from './order-filter-config';
import type { OrderFiltersState } from '@/lib/schemas/orders';

export function OrderFilters(props: DomainFilterBarProps<OrderFiltersState>) {
  return <DomainFilterBar config={ORDER_FILTER_CONFIG} {...props} />;
}
```

### Phase 6: Delete Old Code

Remove redundant implementations after migration.

---

## Dependencies Between Phases

```
Phase 1 (Primitives)
    ↓
Phase 2 (DomainFilterBar)
    ↓
Phase 3 (URL Hook) ←── can be parallel with Phase 4
    ↓
Phase 4 (Domain Configs)
    ↓
Phase 5 (Migrate Domains) ←── one domain at a time
    ↓
Phase 6 (Delete Old Code)
```

---

## Risks Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking existing filter behavior | HIGH | Migrate one domain at a time, test thoroughly |
| Date serialization in URL | MEDIUM | Use ISO strings, test with TanStack Router |
| Complex filters (recipient-filter-builder) | MEDIUM | May need separate component, evaluate during Phase 5 |
| Performance with many filter options | LOW | Options are static, memoize components |
| Accessibility regression | MEDIUM | Ensure aria-labels, keyboard nav in primitives |

---

## UX Requirements (from ui-ux-pro-max)

### Critical (Must Have)
- [ ] Form labels with `for` attribute (not placeholder-only)
- [ ] Visible focus states on all interactive elements
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] 44x44px touch targets on mobile
- [ ] Clear error feedback for validation

### High Priority
- [ ] Debounced search input (300ms)
- [ ] No results suggestions
- [ ] Loading state during filter apply
- [ ] Result count display

### Medium Priority
- [ ] Autocomplete/suggestions for search
- [ ] Smooth transitions (150-300ms)
- [ ] Persist filter state in localStorage

---

## Success Criteria

| Metric | Before | After |
|--------|--------|-------|
| Filter files | 12 | 1 shared + 12 configs |
| Lines of code | ~2,500 | ~800 |
| Time to add new domain filter | ~4 hours | ~30 minutes |
| Bug fix scope | 12 files | 1 file |
| URL sync coverage | Partial | 100% |
| Filter chip consistency | Inconsistent | Unified |

---

## Estimated Complexity

| Phase | Effort | Risk |
|-------|--------|------|
| Phase 1: Primitives | Medium | Low |
| Phase 2: DomainFilterBar | Medium | Medium |
| Phase 3: URL Hook | Low | Low |
| Phase 4: Domain Configs | Low | Low |
| Phase 5: Migrate (per domain) | Low | Medium |
| Phase 6: Cleanup | Low | Low |

**Total: Medium complexity, high impact**

---

## Test Plan

1. **Unit tests** for each primitive component
2. **Integration tests** for DomainFilterBar with mock config
3. **E2E tests** for URL state sync (filter → refresh → same state)
4. **Visual regression** for filter chips and panels
5. **Accessibility audit** with axe-core

---

**WAITING FOR CONFIRMATION**: Proceed with this plan? (yes/no/modify)
