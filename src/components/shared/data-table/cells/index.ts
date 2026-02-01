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
export type {
  StatusCellProps,
  StatusConfigItem,
  SemanticStatusConfigItem,
  CombinedStatusConfigItem,
} from "./status-cell";

export { TypeCell } from "./type-cell";
export type { TypeCellProps, TypeConfigItem } from "./type-cell";

export { DateCell } from "./date-cell";
export type { DateCellProps } from "./date-cell";

export { SkuCell } from "./sku-cell";
export type { SkuCellProps } from "./sku-cell";

export { NameCell } from "./name-cell";
export type { NameCellProps } from "./name-cell";

export { GradientStatusCell, GRADIENT_STYLES } from "./gradient-status-cell";
export type {
  GradientStatusCellProps,
  GradientStyleConfig,
  GradientVariant,
} from "./gradient-status-cell";

export { CheckboxCell } from "./checkbox-cell";
export type { CheckboxCellProps } from "./checkbox-cell";

export { ActionsCell } from "./actions-cell";
export type { ActionsCellProps, ActionItem } from "./actions-cell";

export { ScoreCell } from "./score-cell";
export type { ScoreCellProps } from "./score-cell";

export { TagsCell } from "./tags-cell";
export type { TagsCellProps, TagItem } from "./tags-cell";

export { SourceCell, SOURCE_CONFIG } from "./source-cell";
export type { SourceCellProps, SourceType } from "./source-cell";
