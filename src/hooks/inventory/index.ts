/**
 * Inventory Hooks
 *
 * Provides hooks for inventory management, stock tracking, and warehouse locations.
 */

// Main inventory management
export {
  useInventory,
  useInventoryItem,
  useInventoryMovements,
  useInventoryLowStock,
  useAdjustInventory,
  useTransferInventory,
  useReceiveInventory,
} from './use-inventory';

// Location management
export { useLocations } from './use-locations';

// Re-export types
export type { InventoryItem, InventoryFilters, MovementRecord } from '@/lib/schemas/inventory';
export type { WarehouseLocation, LocationType, LocationFilters } from './use-locations';
