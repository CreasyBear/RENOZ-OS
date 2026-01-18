# Frontend Design System Components

## REQUIRED: Use Existing Shared Components

When implementing UI stories, you MUST use these existing components. DO NOT create new formatting functions or duplicate components.

## Currency & Formatting

```tsx
// USE THIS - not local formatCurrency functions
import { FormatAmount, FormatPercent, FormatDelta } from "@/components/shared/format";

<FormatAmount amount={12500} />                    // $12,500.00
<FormatAmount amount={12500} cents />              // $125.00 (cents to dollars)
<FormatAmount amount={12500} colorCode />          // Green if positive, red if negative
<FormatAmount amount={12500} compact />            // $12.5K
<FormatPercent value={45.5} colorCode />           // 45.5%
<FormatDelta value={12.5} type="percent" />        // ↑ 12.5%
```

## Truncation with Tooltips

```tsx
// USE THIS - not inline truncate classes without tooltips
import { TruncateTooltip } from "@/components/shared/truncate-tooltip";

<TruncateTooltip text={customerName} maxLength={30} />
<TruncateTooltip text={description} maxLength={50} className="text-muted-foreground" />
```

## Data Tables

```tsx
// USE existing memoized cell components
import {
  PriceCell,
  StatusCell,
  TypeCell,
  DateCell,
  SkuCell,
  NameCell
} from "@/components/shared/data-table/cells";

// In column definitions:
cell: ({ row }) => <PriceCell value={row.getValue("price")} colorPositive />
cell: ({ row }) => <StatusCell status={row.getValue("status")} statusConfig={MY_STATUS_CONFIG} />
cell: ({ row }) => <NameCell name={row.getValue("name")} subtitle={row.original.description} />
```

## Skeleton Loading

```tsx
// USE existing skeleton components with Suspense
import { ProductTableSkeleton, ProductDetailSkeleton } from "@/components/skeletons/products";
import { TabsSkeleton } from "@/components/skeletons/shared";
import { SkeletonCell } from "@/components/skeletons";

// Wrap async components in Suspense
<Suspense fallback={<ProductTableSkeleton rowCount={8} />}>
  <ProductsTable />
</Suspense>

// Create domain-specific skeletons using SkeletonCell
<SkeletonCell variant="text" width="w-32" />
<SkeletonCell variant="badge" />
<SkeletonCell variant="price" />
```

## Status Badges

```tsx
// USE existing StatusBadge with config pattern
import { StatusBadge, type StatusConfig } from "@/components/shared/status-badge";

const ORDER_STATUS_CONFIG: StatusConfig = {
  pending: { label: "Pending", variant: "secondary" },
  confirmed: { label: "Confirmed", variant: "default" },
  shipped: { label: "Shipped", variant: "outline" },
  delivered: { label: "Delivered", variant: "success" },
};

<StatusBadge status={order.status} config={ORDER_STATUS_CONFIG} />
```

## DO NOT Create

- Local `formatCurrency()` or `formatPrice()` functions
- Inline truncation without tooltips (`className="truncate"` alone)
- New cell components that duplicate existing ones
- Custom loading spinners when skeletons exist
- Duplicate status badge implementations
