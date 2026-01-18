# Feature Plan: Products Domain Skeleton Loading

Created: 2026-01-17
Author: architect-agent

## Overview

Implement a skeleton loading pattern for the products domain to replace simple spinners with contextually appropriate loading states. This follows the Midday reference pattern using `<Suspense fallback={<ProductsSkeleton />}>` with skeleton components that mirror the actual UI structure.

## Requirements

- [ ] Base Skeleton primitive exists (VERIFIED at `src/components/ui/skeleton.tsx`)
- [ ] ProductTableSkeleton for list view matching table columns
- [ ] ProductDetailSkeleton for detail view with tabs
- [ ] PricingCardSkeleton for pricing card loading states
- [ ] SkeletonCell utility component for reusable cell types
- [ ] Integration with React Suspense boundaries

## Design

### Architecture

```
src/components/
├── ui/
│   └── skeleton.tsx              # Base primitive (EXISTS)
├── skeletons/
│   ├── index.ts                  # Barrel export
│   ├── skeleton-cell.tsx         # Reusable cell types
│   ├── products/
│   │   ├── index.ts              # Product skeleton exports
│   │   ├── table-skeleton.tsx    # ProductTableSkeleton
│   │   ├── detail-skeleton.tsx   # ProductDetailSkeleton
│   │   └── pricing-card-skeleton.tsx # PricingCardSkeleton
│   └── shared/
│       ├── card-skeleton.tsx     # Generic card skeleton
│       └── tabs-skeleton.tsx     # Generic tabs skeleton
```

### Component Hierarchy

```
ProductsPage
  └── Suspense fallback={<ProductTableSkeleton />}
        └── ProductsTable (actual)

ProductDetailPage
  └── Suspense fallback={<ProductDetailSkeleton />}
        └── ProductDetail (actual)
            ├── Tabs
            │   └── Suspense fallback={<TabContentSkeleton />}
            │         └── TabContent (actual)
            └── PricingCards
                └── Suspense fallback={<PricingCardSkeleton />}
                      └── PricingCard (actual)
```

### Interfaces

```typescript
// src/components/skeletons/skeleton-cell.tsx
export type SkeletonType =
  | "checkbox"
  | "text"
  | "avatar-text"
  | "icon-text"
  | "badge"
  | "tags"
  | "icon"
  | "price"
  | "status";

export interface SkeletonCellProps {
  type: SkeletonType;
  width?: string;  // Tailwind width class e.g., "w-24"
}

export function SkeletonCell({ type, width }: SkeletonCellProps): JSX.Element;
```

```typescript
// src/components/skeletons/products/table-skeleton.tsx
export interface ProductTableSkeletonProps {
  rowCount?: number;           // Default: 8
  showFilters?: boolean;       // Default: true
  className?: string;
}

export function ProductTableSkeleton(props: ProductTableSkeletonProps): JSX.Element;
```

```typescript
// src/components/skeletons/products/detail-skeleton.tsx
export interface ProductDetailSkeletonProps {
  showPricing?: boolean;       // Default: true
  tabCount?: number;           // Default: 4
  className?: string;
}

export function ProductDetailSkeleton(props: ProductDetailSkeletonProps): JSX.Element;
```

```typescript
// src/components/skeletons/products/pricing-card-skeleton.tsx
export interface PricingCardSkeletonProps {
  count?: number;              // Default: 1
  layout?: "horizontal" | "grid";  // Default: "horizontal"
}

export function PricingCardSkeleton(props: PricingCardSkeletonProps): JSX.Element;
```

### Data Flow

```
1. Route loads → Component suspends on data fetch
2. Suspense catches → Renders skeleton fallback
3. Skeleton matches UI structure → User sees placeholder
4. Data resolves → Real component renders
5. Smooth transition → No layout shift
```

## Dependencies

| Dependency | Type | Reason |
|------------|------|--------|
| `src/components/ui/skeleton.tsx` | Internal | Base primitive with animate-pulse |
| `src/components/ui/table.tsx` | Internal | Table structure components |
| `src/components/ui/card.tsx` | Internal | Card structure components |
| `src/components/ui/tabs.tsx` | Internal | Tabs structure components |
| `@radix-ui/react-tabs` | External | Already installed for Tabs |

## Implementation Phases

### Phase 1: Foundation - SkeletonCell Utility

**Files to create:**
- `src/components/skeletons/skeleton-cell.tsx` - Reusable skeleton cell types

**Implementation:**
```typescript
// skeleton-cell.tsx
"use client";

import { cn } from "~/lib/utils";
import { Skeleton } from "~/components/ui/skeleton";

export type SkeletonType =
  | "checkbox"
  | "text"
  | "avatar-text"
  | "icon-text"
  | "badge"
  | "tags"
  | "icon"
  | "price"
  | "status";

interface SkeletonCellProps {
  type: SkeletonType;
  width?: string;
}

export function SkeletonCell({ type, width = "w-24" }: SkeletonCellProps) {
  switch (type) {
    case "checkbox":
      return <Skeleton className="h-4 w-4 rounded" />;

    case "text":
      return <Skeleton className={cn("h-3.5", width)} />;

    case "avatar-text":
      return (
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
          <Skeleton className={cn("h-3.5", width)} />
        </div>
      );

    case "icon-text":
      return (
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 flex-shrink-0" />
          <Skeleton className={cn("h-3.5", width)} />
        </div>
      );

    case "badge":
      return <Skeleton className={cn("h-5 rounded-full", width)} />;

    case "status":
      return <Skeleton className="h-6 w-16 rounded-full" />;

    case "tags":
      return (
        <div className="flex items-center gap-1">
          <Skeleton className="h-5 w-12 rounded" />
          <Skeleton className="h-5 w-16 rounded" />
        </div>
      );

    case "icon":
      return <Skeleton className="h-5 w-5" />;

    case "price":
      return <Skeleton className="h-4 w-16" />;

    default:
      return <Skeleton className={cn("h-3.5", width)} />;
  }
}
```

**Acceptance:**
- [ ] Types compile without errors
- [ ] All skeleton types render correctly
- [ ] Animation (pulse) works

**Estimated effort:** Small (1-2 hours)

### Phase 2: ProductTableSkeleton

**Files to create:**
- `src/components/skeletons/products/table-skeleton.tsx`

**Implementation:**
```typescript
// products/table-skeleton.tsx
"use client";

import { cn } from "~/lib/utils";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { SkeletonCell } from "../skeleton-cell";

interface ProductTableSkeletonProps {
  rowCount?: number;
  showFilters?: boolean;
  className?: string;
}

export function ProductTableSkeleton({
  rowCount = 8,
  showFilters = true,
  className,
}: ProductTableSkeletonProps) {
  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Filter bar skeleton */}
      {showFilters && (
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-64" /> {/* Search */}
          <Skeleton className="h-9 w-32" /> {/* Status filter */}
          <Skeleton className="h-9 w-32" /> {/* Category filter */}
          <div className="ml-auto">
            <Skeleton className="h-9 w-28" /> {/* Add button */}
          </div>
        </div>
      )}

      {/* Table skeleton */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Name</TableHead>
              <TableHead className="w-[100px]">Price</TableHead>
              <TableHead className="w-[80px]">Unit</TableHead>
              <TableHead className="w-[80px]">Usage</TableHead>
              <TableHead className="w-[120px]">Last Used</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {Array.from({ length: rowCount }).map((_, i) => (
              <TableRow
                key={`skeleton-product-${i}`}
                className="hover:bg-transparent h-[65px]"
              >
                {/* Name column - flex col structure */}
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </TableCell>

                {/* Price */}
                <TableCell>
                  <SkeletonCell type="price" />
                </TableCell>

                {/* Unit */}
                <TableCell>
                  <SkeletonCell type="text" width="w-12" />
                </TableCell>

                {/* Usage */}
                <TableCell>
                  <SkeletonCell type="text" width="w-8" />
                </TableCell>

                {/* Last Used */}
                <TableCell>
                  <SkeletonCell type="text" width="w-20" />
                </TableCell>

                {/* Status */}
                <TableCell>
                  <SkeletonCell type="status" />
                </TableCell>

                {/* Actions */}
                <TableCell className="w-[50px]">
                  <Skeleton className="h-8 w-8 rounded" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

**Acceptance:**
- [ ] Matches actual product table column structure
- [ ] Row height matches real table (65px)
- [ ] Filter bar skeleton visible when enabled
- [ ] Responsive on mobile

**Estimated effort:** Small (2-3 hours)

### Phase 3: ProductDetailSkeleton

**Files to create:**
- `src/components/skeletons/products/detail-skeleton.tsx`
- `src/components/skeletons/shared/tabs-skeleton.tsx`

**Implementation:**
```typescript
// shared/tabs-skeleton.tsx
"use client";

import { cn } from "~/lib/utils";
import { Skeleton } from "~/components/ui/skeleton";

interface TabsSkeletonProps {
  tabCount?: number;
  className?: string;
}

export function TabsSkeleton({ tabCount = 4, className }: TabsSkeletonProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Tab list */}
      <div className="bg-muted inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px] gap-1">
        {Array.from({ length: tabCount }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-24 rounded-md" />
        ))}
      </div>

      {/* Tab content placeholder */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  );
}
```

```typescript
// products/detail-skeleton.tsx
"use client";

import { cn } from "~/lib/utils";
import { Skeleton } from "~/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { TabsSkeleton } from "../shared/tabs-skeleton";
import { PricingCardSkeleton } from "./pricing-card-skeleton";

interface ProductDetailSkeletonProps {
  showPricing?: boolean;
  tabCount?: number;
  className?: string;
}

export function ProductDetailSkeleton({
  showPricing = true,
  tabCount = 4,
  className,
}: ProductDetailSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header section */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
          </div>

          {/* Title */}
          <Skeleton className="h-8 w-64" />

          {/* Subtitle/description */}
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Tabs/Details (2/3 width) */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <TabsSkeleton tabCount={tabCount} />
            </CardContent>
          </Card>
        </div>

        {/* Right column - Pricing/Meta (1/3 width) */}
        <div className="space-y-6">
          {showPricing && <PricingCardSkeleton count={2} layout="grid" />}

          {/* Additional meta card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

**Acceptance:**
- [ ] Matches actual product detail layout
- [ ] Tabs skeleton shows correct number of tabs
- [ ] Grid layout matches responsive breakpoints
- [ ] Breadcrumb skeleton visible

**Estimated effort:** Medium (3-4 hours)

### Phase 4: PricingCardSkeleton

**Files to create:**
- `src/components/skeletons/products/pricing-card-skeleton.tsx`

**Implementation:**
```typescript
// products/pricing-card-skeleton.tsx
"use client";

import { cn } from "~/lib/utils";
import { Skeleton } from "~/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "~/components/ui/card";

interface PricingCardSkeletonProps {
  count?: number;
  layout?: "horizontal" | "grid";
}

export function PricingCardSkeleton({
  count = 1,
  layout = "horizontal",
}: PricingCardSkeletonProps) {
  const cards = Array.from({ length: count });

  return (
    <div
      className={cn(
        layout === "horizontal"
          ? "flex gap-4 overflow-x-auto"
          : "grid grid-cols-1 gap-4"
      )}
    >
      {cards.map((_, i) => (
        <Card
          key={i}
          className={cn(layout === "horizontal" && "min-w-[280px] flex-shrink-0")}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Price display */}
            <div className="space-y-1">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>

            {/* Features list */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-3 w-32" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-3 w-28" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>

            {/* Action button */}
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**Acceptance:**
- [ ] Card structure matches actual pricing cards
- [ ] Horizontal scroll works when layout="horizontal"
- [ ] Grid layout works when layout="grid"
- [ ] Feature list items properly spaced

**Estimated effort:** Small (1-2 hours)

### Phase 5: Integration with Routes

**Files to modify:**
- `src/routes/_authenticated/products/index.tsx`
- `src/routes/_authenticated/products/$productId.tsx`

**Integration Pattern:**
```typescript
// In index.tsx - wrap data-dependent section
import { Suspense } from "react";
import { ProductTableSkeleton } from "~/components/skeletons/products";

function ProductsPage() {
  return (
    <div>
      {/* Header/filters always visible */}
      <PageHeader title="Products" />

      {/* Table with suspense boundary */}
      <Suspense fallback={<ProductTableSkeleton />}>
        <ProductsTable />
      </Suspense>
    </div>
  );
}
```

```typescript
// In $productId.tsx - wrap data-dependent section
import { Suspense } from "react";
import { ProductDetailSkeleton } from "~/components/skeletons/products";

function ProductDetailPage() {
  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductDetail productId={productId} />
    </Suspense>
  );
}
```

**Acceptance:**
- [ ] Skeleton shows during initial load
- [ ] No layout shift when content loads
- [ ] Suspense boundary placed optimally

**Estimated effort:** Small (1-2 hours)

### Phase 6: Barrel Exports

**Files to create:**
- `src/components/skeletons/index.ts`
- `src/components/skeletons/products/index.ts`
- `src/components/skeletons/shared/index.ts`

**Implementation:**
```typescript
// src/components/skeletons/index.ts
export * from "./skeleton-cell";
export * from "./products";
export * from "./shared";

// src/components/skeletons/products/index.ts
export { ProductTableSkeleton } from "./table-skeleton";
export { ProductDetailSkeleton } from "./detail-skeleton";
export { PricingCardSkeleton } from "./pricing-card-skeleton";

// src/components/skeletons/shared/index.ts
export { TabsSkeleton } from "./tabs-skeleton";
```

**Acceptance:**
- [ ] All components importable from `~/components/skeletons`
- [ ] Tree-shaking works correctly

**Estimated effort:** Trivial (30 mins)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Skeleton doesn't match actual UI structure | Medium | Review actual component before designing skeleton; update skeleton when UI changes |
| Layout shift on content load | Medium | Match dimensions exactly; use min-height on containers |
| Animation performance | Low | Skeleton primitive uses CSS animation (animate-pulse) |
| Suspense boundary placement | Medium | Test with slow network; ensure boundary is at right level |

## Open Questions

- [ ] Should we enhance the base Skeleton with a shimmer animation option (like Midday's `animate-shimmer`)? Current uses `animate-pulse`.
- [ ] Should skeletons match exact pixel dimensions or use approximate sizing?
- [ ] Do we need skeleton states for error boundaries as well?

## Success Criteria

1. Products list page shows skeleton during data fetch
2. Product detail page shows skeleton during data fetch
3. No visible layout shift when transitioning from skeleton to content
4. Skeleton animations are smooth (60fps)
5. All skeleton components are reusable for future domains
6. Code follows existing patterns in the codebase

## File Summary

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/skeletons/skeleton-cell.tsx` | Reusable cell-level skeleton types |
| `src/components/skeletons/products/table-skeleton.tsx` | ProductTableSkeleton component |
| `src/components/skeletons/products/detail-skeleton.tsx` | ProductDetailSkeleton component |
| `src/components/skeletons/products/pricing-card-skeleton.tsx` | PricingCardSkeleton component |
| `src/components/skeletons/shared/tabs-skeleton.tsx` | Reusable TabsSkeleton |
| `src/components/skeletons/index.ts` | Barrel export |
| `src/components/skeletons/products/index.ts` | Products barrel export |
| `src/components/skeletons/shared/index.ts` | Shared barrel export |

### Files to Modify

| File | Change |
|------|--------|
| `src/routes/_authenticated/products/index.tsx` | Add Suspense boundary with ProductTableSkeleton |
| `src/routes/_authenticated/products/$productId.tsx` | Add Suspense boundary with ProductDetailSkeleton |

### Total Estimated Effort

- Phase 1-4: 7-11 hours (skeleton components)
- Phase 5-6: 2-3 hours (integration and exports)
- **Total: 9-14 hours**
