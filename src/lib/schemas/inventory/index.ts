/**
 * Inventory Schemas
 *
 * Provides validation schemas for inventory operations.
 */

// --- Core Inventory Types ---
export * from './inventory';
export * from './reads';
export * from './locations';
export * from './movements';
export * from './receiving';
export * from './stock-counts';
export * from './valuation';
export * from './forecasting';
export * from './quality';
export * from './serialized-items';
export * from './serialized-mutation-contract';
export * from './finance-mutation-contract';
export * from './warehouse-locations';
export * from './alerts';
export * from './dashboard';

// --- Alert Schemas ---
export * from './item-alerts';

// --- Purchase Order Form Schemas ---
export * from './create-po-form';

// --- Inventory Item Edit Form ---
export * from './inventory-item-edit-form';

// --- Re-export key types for convenience ---
export type {
  Inventory,
} from './inventory';

export type {
  InventoryFilter,
  InventoryListQuery,
} from './reads';

export type { QualityRecord } from './quality';

export type {
  HookWarehouseLocation,
  HookLocationHierarchy,
} from './warehouse-locations';

export type {
  Location,
  CreateLocation,
  UpdateLocation,
  LocationFilter,
  LocationListQuery,
  LocationAttributes,
} from './locations';

export type {
  Movement,
  MovementType,
  CreateMovement,
  MovementFilter,
  MovementListQuery,
} from './movements';

export type {
  SerializedItem,
  SerializedItemEvent,
  SerializedItemStatus,
  SerializedItemEventType,
  SerializedItemListQuery,
  CreateSerializedItemInput,
  UpdateSerializedItemInput,
  DeleteSerializedItemInput,
  SerializedItemListResult,
  SerializedItemDetailResult,
} from './serialized-items';
