/**
 * Memoized Table Cell Components
 *
 * Performance-optimized cell components using React.memo to prevent
 * unnecessary re-renders when parent table state changes (sorting,
 * pagination, selection) but cell data remains unchanged.
 *
 * All components have displayName set for React DevTools debugging.
 *
 * @example
 * ```tsx
 * import { PriceCell, StatusCell, DateCell } from "@/components/shared/data-table/cells";
 *
 * const columns = [
 *   {
 *     accessorKey: "basePrice",
 *     header: "Price",
 *     cell: ({ row }) => <PriceCell value={row.getValue("basePrice")} align="right" />,
 *   },
 * ];
 * ```
 */

export { PriceCell } from "./price-cell";
export type { PriceCellProps } from "./price-cell";

export { StatusCell } from "./status-cell";
export type { StatusCellProps, StatusConfigItem } from "./status-cell";

export { TypeCell } from "./type-cell";
export type { TypeCellProps, TypeConfigItem } from "./type-cell";

export { DateCell } from "./date-cell";
export type { DateCellProps } from "./date-cell";

export { SkuCell } from "./sku-cell";
export type { SkuCellProps } from "./sku-cell";

export { NameCell } from "./name-cell";
export type { NameCellProps } from "./name-cell";
