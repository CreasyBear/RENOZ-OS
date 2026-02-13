/**
 * Overview Dashboard Components
 *
 * Square UI inspired dashboard with:
 * - Stats Cards (Won This Month, Orders Pending, Low Stock)
 * - Cash Flow Chart (Money In vs Out)
 * - Projects Table (Active projects)
 * - Orders Table (Recent orders)
 *
 * @see docs/design-system/DASHBOARD-STANDARDS.md
 */

// ─────────────────────────────────────────────────────────────────────────────
// Container (Data Fetching)
// ─────────────────────────────────────────────────────────────────────────────
export { OverviewContainer, type OverviewContainerProps } from './overview-container';

// ─────────────────────────────────────────────────────────────────────────────
// Presenter (Pure UI)
// ─────────────────────────────────────────────────────────────────────────────
export { OverviewDashboard, type OverviewDashboardProps } from './overview-dashboard';

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────
export {
  OverviewStats,
  type OverviewStatsData,
  type OverviewStatsProps,
  type TrackedProductWithInventory,
} from './overview-stats';
export { CashFlowChart, type CashFlowDataPoint, type CashFlowChartProps } from './cash-flow-chart';
export { ProjectsTable, type ProjectSummary, type ProjectsTableProps } from './projects-table';
export { OrdersTable, type OrderSummary, type OrdersTableProps } from './orders-table';

// ─────────────────────────────────────────────────────────────────────────────
// Dialogs
// ─────────────────────────────────────────────────────────────────────────────
export { TrackedProductsDialog, type TrackedProduct } from './tracked-products-dialog';
