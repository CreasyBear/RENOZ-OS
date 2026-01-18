# Architect Output: Memoized Table Cells

**Date:** 2026-01-17
**Feature:** Memoized cell components for products domain DataTable
**Full Plan:** `/thoughts/shared/plans/memoized-table-cells-plan.md`

## Summary

Designed 6 memoized cell components following the Midday pattern:

| Cell | Purpose | Key Props |
|------|---------|-----------|
| `PriceCell` | Currency formatting with color coding | `value`, `colorPositive`, `align` |
| `StatusCell` | Status badge with configurable variants | `status`, `statusConfig` |
| `TypeCell` | Icon + label badge | `type`, `typeConfig` |
| `DateCell` | Date formatting (short/long/relative) | `value`, `format` |
| `SkuCell` | Monospace identifier with copy | `value`, `copyable` |
| `NameCell` | Truncated text with tooltip | `name`, `subtitle`, `maxWidth` |

## File Structure

```
src/components/shared/data-table/cells/
├── index.ts
├── price-cell.tsx
├── status-cell.tsx
├── type-cell.tsx
├── date-cell.tsx
├── sku-cell.tsx
└── name-cell.tsx
```

## Key Decisions

1. **Location:** Shared `data-table/cells/` directory (not domain-specific)
2. **Config Pattern:** Cells are generic; domain configs (PRODUCT_STATUS_CONFIG) live in domain folders
3. **Integration:** Works alongside existing `column-presets.tsx` - optionally update presets to use cells
4. **Formatters:** Reuse existing `@/lib/formatters` functions internally

## Implementation Order

1. Foundation (PriceCell, DateCell) - uses existing formatters
2. Status & Type (StatusCell, TypeCell) - badge-based
3. Text (SkuCell, NameCell) - special text handling
4. Integration - update ProductTable
5. Documentation

## Next Steps

Ready for implementation via kraken/spark agent.
