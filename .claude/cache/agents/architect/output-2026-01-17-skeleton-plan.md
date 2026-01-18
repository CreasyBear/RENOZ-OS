# Architect Output: Products Skeleton Loading

**Created:** 2026-01-17
**Full Plan:** `/thoughts/shared/plans/products-skeleton-loading-plan.md`

## Summary

Designed a skeleton loading architecture for the products domain following the Midday reference pattern with Suspense boundaries.

## Key Decisions

1. **Directory Structure**: New `src/components/skeletons/` directory with domain-specific subdirectories
2. **SkeletonCell Utility**: Reusable cell types (text, badge, status, price, etc.) following Midday's pattern
3. **Component Hierarchy**:
   - `ProductTableSkeleton` - 8 rows, optional filter bar
   - `ProductDetailSkeleton` - Header, tabs, pricing cards layout
   - `PricingCardSkeleton` - Supports horizontal/grid layouts

## Files to Create

```
src/components/skeletons/
├── index.ts
├── skeleton-cell.tsx
├── products/
│   ├── index.ts
│   ├── table-skeleton.tsx
│   ├── detail-skeleton.tsx
│   └── pricing-card-skeleton.tsx
└── shared/
    ├── index.ts
    └── tabs-skeleton.tsx
```

## Integration Points

```tsx
// products/index.tsx
<Suspense fallback={<ProductTableSkeleton />}>
  <ProductsTable />
</Suspense>

// products/$productId.tsx
<Suspense fallback={<ProductDetailSkeleton />}>
  <ProductDetail productId={productId} />
</Suspense>
```

## Component APIs

```typescript
// Table skeleton
<ProductTableSkeleton
  rowCount={8}          // optional
  showFilters={true}    // optional
  className=""          // optional
/>

// Detail skeleton
<ProductDetailSkeleton
  showPricing={true}    // optional
  tabCount={4}          // optional
  className=""          // optional
/>

// Pricing card skeleton
<PricingCardSkeleton
  count={1}                    // optional
  layout="horizontal" | "grid" // optional
/>
```

## Existing Assets Used

- `src/components/ui/skeleton.tsx` - Base primitive (animate-pulse)
- `src/components/ui/table.tsx` - Table structure
- `src/components/ui/card.tsx` - Card structure
- `src/components/ui/tabs.tsx` - Tabs structure

## Estimated Effort

9-14 hours total across 6 phases
