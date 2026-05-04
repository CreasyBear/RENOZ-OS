/**
 * Inventory server-function compatibility barrel.
 *
 * Workflow implementations live in sibling inventory modules. Keep this module
 * as the stable import path for legacy consumers while domain ownership moves
 * into focused files.
 */

'use server';

export { adjustInventory } from '@/server/functions/inventory/adjustments';
export { allocateInventory, deallocateInventory } from '@/server/functions/inventory/allocations';
export { getInventoryDashboard } from '@/server/functions/inventory/dashboard';
export { listMovements } from '@/server/functions/inventory/movements';
export { receiveInventory } from '@/server/functions/inventory/receiving';
export {
  getInventoryItem,
  listInventory,
  quickSearchInventory,
} from '@/server/functions/inventory/reads';
export { getAvailableSerials } from '@/server/functions/inventory/serial-availability';
export { bulkUpdateStatus } from '@/server/functions/inventory/status-updates';
export { transferInventory } from '@/server/functions/inventory/transfers';
export {
  getRecentMovementsTimeline,
  getStockByCategory,
  getStockByLocation,
  getWMSDashboard,
} from '@/server/functions/inventory/wms-dashboard';
