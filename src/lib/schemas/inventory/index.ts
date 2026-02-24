/**
 * Inventory Schemas
 *
 * Provides validation schemas for inventory operations.
 */

// --- Core Inventory Types ---
export * from './inventory';
export * from './serialized-items';
export * from './serialized-mutation-contract';
export * from './finance-mutation-contract';

// --- Alert Schemas ---
export * from './item-alerts';

// --- Purchase Order Form Schemas ---
export * from './create-po-form';

// --- Inventory Item Edit Form ---
export * from './inventory-item-edit-form';

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
