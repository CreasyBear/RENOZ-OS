import { z } from 'zod';
import { normalizeObjectInput, type FlexibleJson } from '../_shared/patterns';

// ============================================================================
// WAREHOUSE LOCATIONS
// ============================================================================

export const locationTypeSchema = z.enum(['warehouse', 'zone', 'aisle', 'rack', 'shelf', 'bin']);

export type LocationType = z.infer<typeof locationTypeSchema>;

export const warehouseLocationListQuerySchema = normalizeObjectInput(
  z.object({
    parentId: z.string().uuid().optional().nullable(),
    locationType: locationTypeSchema.optional(),
    isActive: z.coerce.boolean().optional(),
    search: z.string().optional(),
  })
);

export type WarehouseLocationListQuery = z.infer<typeof warehouseLocationListQuerySchema>;

export const createWarehouseLocationSchema = z.object({
  locationCode: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  locationType: locationTypeSchema,
  parentId: z.string().uuid().optional().nullable(),
  capacity: z.number().int().min(0).optional().nullable(),
  isActive: z.boolean().default(true),
  isPickable: z.boolean().default(true),
  isReceivable: z.boolean().default(true),
  attributes: z.record(z.string(), z.any()).optional(),
});

export type CreateWarehouseLocationInput = z.infer<typeof createWarehouseLocationSchema>;

export const updateWarehouseLocationSchema = createWarehouseLocationSchema.partial().omit({
  locationCode: true,
});

export type UpdateWarehouseLocationInput = z.infer<typeof updateWarehouseLocationSchema>;

export const warehouseLocationSchema = createWarehouseLocationSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
});

export type WarehouseLocation = z.infer<typeof warehouseLocationSchema>;

// ============================================================================
// LOCATION API RESPONSE TYPES
// ============================================================================

/**
 * Simple location record from database (warehouse_locations table)
 * Used by listLocations, getLocation server functions
 */
export interface LocationApiRecord {
  id: string;
  organizationId: string;
  locationCode: string;
  name: string;
  locationType: LocationType;
  parentId: string | null;
  capacity: number | null;
  isActive: boolean;
  isPickable: boolean;
  isReceivable: boolean;
  attributes: FlexibleJson | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}

/**
 * Result from listLocations server function
 */
export interface ListLocationsApiResult {
  locations: LocationApiRecord[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Location with inventory contents from getLocation server function
 */
export interface LocationDetailApiResult {
  location: LocationApiRecord;
  contents: Array<{
    id: string;
    organizationId: string;
    productId: string;
    locationId: string;
    quantityOnHand: number;
    quantityAllocated: number;
    quantityAvailable: number;
    unitCost: number;
    totalValue: number;
    lotNumber: string | null;
    serialNumber: string | null;
    expiryDate: string | null;
    createdAt: Date;
    updatedAt: Date;
    product?: {
      id: string;
      name: string;
      sku: string;
    } | null;
  }>;
  metrics: {
    itemCount: number;
    totalQuantity: number;
    totalValue: number;
  };
}

// ============================================================================
// HOOK LOCATION TYPES
// ============================================================================

/**
 * Transformed warehouse location used by useLocations hook
 * This is the API response mapped through mapLocationFromApi helper
 */
export interface HookWarehouseLocation {
  id: string;
  code: string;
  name: string;
  locationType: LocationType;
  parentId: string | null;
  parentPath: string[];
  capacity: number | null;
  currentOccupancy: number;
  utilization: number;
  isActive: boolean;
  attributes: FlexibleJson;
  childCount: number;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Location hierarchy node with children
 */
export interface HookLocationHierarchy extends HookWarehouseLocation {
  children: HookLocationHierarchy[];
}

/**
 * Location contents from inventory query
 */
export interface HookLocationContents {
  items: Array<{
    inventoryId: string;
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    totalValue: number;
  }>;
  totalItems: number;
  totalValue: number;
  utilization: number;
}

/**
 * Filters for location queries in hooks
 * Extends Record for compatibility with queryKeys.locations.list()
 */
export interface HookLocationFilters extends Record<string, unknown> {
  parentId?: string;
  type?: LocationType;
  active?: boolean;
  search?: string;
}

/**
 * Create location input for hooks
 */
export interface CreateLocationInput {
  code: string;
  name: string;
  locationType: LocationType;
  parentId?: string;
  capacity?: number;
  attributes?: FlexibleJson;
}

/**
 * Update location input for hooks
 */
export interface UpdateLocationInput {
  code?: string;
  name?: string;
  capacity?: number;
  isActive?: boolean;
  attributes?: FlexibleJson;
}

/**
 * Warehouse location with children (hierarchy)
 */
export interface WarehouseLocationWithChildren {
  id: string;
  organizationId: string;
  locationCode: string;
  name: string;
  locationType: LocationType;
  parentId: string | null;
  capacity: number | null;
  isActive: boolean;
  isPickable: boolean;
  isReceivable: boolean;
  attributes: FlexibleJson | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  children: WarehouseLocationWithChildren[];
  inventoryCount?: number;
  utilization?: number;
}

/**
 * Location list result
 */
export interface ListLocationsResult {
  locations: Array<{
    id: string;
    organizationId: string;
    locationCode: string;
    name: string;
    locationType: LocationType;
    parentId: string | null;
    capacity: number | null;
    isActive: boolean;
    isPickable: boolean;
    isReceivable: boolean;
    attributes: FlexibleJson | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    updatedBy: string | null;
  }>;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
