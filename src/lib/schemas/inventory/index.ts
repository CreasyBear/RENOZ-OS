/**
 * Inventory Schemas
 *
 * Provides validation schemas for inventory operations.
 */

// --- Core Inventory Types ---
export * from './inventory';

// --- Alert Schemas ---
export * from './item-alerts';

// --- Purchase Order Form Schemas ---
export * from './create-po-form';

// --- Re-export key types for convenience ---
export type {
  Location,
  CreateLocation,
  UpdateLocation,
  LocationFilter,
  LocationListQuery,
  Inventory,
  InventoryFilter,
  InventoryListQuery,
  Movement,
  MovementType,
  CreateMovement,
  MovementFilter,
  MovementListQuery,
  QualityRecord,
  HookWarehouseLocation,
  HookLocationHierarchy,
} from './inventory';
