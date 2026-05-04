import { z } from 'zod';

/**
 * Top moving product as returned from getInventoryDashboard (topMoving)
 */
export interface DashboardTopMovingItem {
  productId: string;
  productName: string | null;
  productSku?: string | null;
  sku?: string | null;
  movementCount: number;
  totalQuantity: number;
  trend?: 'up' | 'down' | 'stable';
}

/**
 * WMS Dashboard stock by category
 */
export const categoryStockSchema = z.object({
  categoryId: z.string().uuid().nullable(),
  categoryName: z.string(),
  unitCount: z.number().int().nonnegative(),
  totalValue: z.number().nonnegative(),
});
export type CategoryStock = z.infer<typeof categoryStockSchema>;

/**
 * WMS Dashboard stock by location
 */
export const locationStockSchema = z.object({
  locationId: z.string().uuid(),
  locationName: z.string(),
  locationType: z.string(),
  unitCount: z.number().int().nonnegative(),
  totalValue: z.number().nonnegative(),
  percentage: z.number().int().min(0).max(100),
});
export type LocationStock = z.infer<typeof locationStockSchema>;

/**
 * Recent movement for timeline display.
 * timestamp is ISO string over wire (Date serializes to string in JSON).
 */
export const recentMovementSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['receipt', 'transfer', 'allocation']),
  timestamp: z.union([z.string(), z.coerce.date()]),
  description: z.string(),
  reference: z.string().nullable(),
  quantity: z.number().int().nonnegative(),
  productName: z.string(),
  productSku: z.string(),
  location: z.string(),
  toLocation: z.string().nullable(),
});
export type RecentMovement = z.infer<typeof recentMovementSchema>;

/**
 * Dashboard comparison data (previous period vs current)
 */
export const dashboardComparisonSchema = z.object({
  totalValueChange: z.number(),
  totalUnitsChange: z.number(),
  totalSkusChange: z.number().int(),
  alertsChange: z.number().int(),
  locationsChange: z.number().int(),
});
export type DashboardComparison = z.infer<typeof dashboardComparisonSchema>;

export const WMS_DASHBOARD_STOCK_SEMANTICS = {
  totals: 'physical_on_hand',
  breakdowns: 'physical_on_hand',
  currentAlerts: 'allocatable_available',
  previousPeriodComparison: 'movement_reconstructed_quantity',
} as const;

/**
 * WMS Dashboard stock semantics.
 * These values keep operator-facing stock cards honest when physical inventory,
 * saleable availability, and historical movement reconstruction differ.
 */
export const wmsDashboardStockSemanticsSchema = z.object({
  totals: z.literal(WMS_DASHBOARD_STOCK_SEMANTICS.totals),
  breakdowns: z.literal(WMS_DASHBOARD_STOCK_SEMANTICS.breakdowns),
  currentAlerts: z.literal(WMS_DASHBOARD_STOCK_SEMANTICS.currentAlerts),
  previousPeriodComparison: z.literal(WMS_DASHBOARD_STOCK_SEMANTICS.previousPeriodComparison),
});
export type WMSDashboardStockSemantics = z.infer<typeof wmsDashboardStockSemanticsSchema>;

/**
 * WMS Dashboard complete data structure
 */
export const wmsDashboardDataSchema = z.object({
  stockSemantics: wmsDashboardStockSemanticsSchema,
  totals: z.object({
    totalValue: z.number().nonnegative(),
    totalUnits: z.number().int().nonnegative(),
    totalSkus: z.number().int().nonnegative(),
  }),
  comparison: dashboardComparisonSchema.optional(),
  stockByCategory: z.array(categoryStockSchema),
  stockByLocation: z.array(locationStockSchema),
  recentMovements: z.array(recentMovementSchema),
});
export type WMSDashboardData = z.infer<typeof wmsDashboardDataSchema>;
