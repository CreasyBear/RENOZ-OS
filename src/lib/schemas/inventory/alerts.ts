import { z } from 'zod';
import {
  filterSchema,
  idParamSchema,
  normalizeObjectInput,
  paginationSchema,
  type FlexibleJson,
} from '../_shared/patterns';

export const inventoryAlertTypeValues = [
  'low_stock',
  'out_of_stock',
  'overstock',
  'expiry',
  'slow_moving',
  'forecast_deviation',
] as const;

export const inventoryAlertTypeSchema = z.enum(inventoryAlertTypeValues);

// ============================================================================
// INVENTORY ALERTS
// ============================================================================

export const alertThresholdSchema = z
  .object({
    minQuantity: z.number().int().min(0).optional(),
    maxQuantity: z.number().int().min(0).optional(),
    daysBeforeExpiry: z.number().int().min(0).optional(),
    daysWithoutMovement: z.number().int().min(0).optional(),
    deviationPercentage: z.number().min(0).max(100).optional(),
  })
  .passthrough();

// FlexibleJson for ServerFn boundary per SCHEMA-TRACE section 4.
export type AlertThreshold = FlexibleJson;

export const createAlertSchema = z.object({
  alertType: inventoryAlertTypeSchema,
  productId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  threshold: alertThresholdSchema,
  isActive: z.boolean().default(true),
  notificationChannels: z.array(z.string()).default([]),
  escalationUsers: z.array(z.string().uuid()).default([]),
});

export type CreateAlert = z.infer<typeof createAlertSchema>;

export const updateAlertSchema = createAlertSchema.partial().omit({
  alertType: true,
});

export type UpdateAlert = z.infer<typeof updateAlertSchema>;

export const alertSchema = createAlertSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  lastTriggeredAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
  version: z.number(),
});

export type Alert = z.infer<typeof alertSchema>;

export const alertFilterSchema = filterSchema.extend({
  alertType: inventoryAlertTypeSchema.optional(),
  productId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  isActive: z.coerce.boolean().optional(),
  triggered: z.coerce.boolean().optional(),
});

export type AlertFilter = z.infer<typeof alertFilterSchema>;

export const alertListQuerySchema = normalizeObjectInput(
  paginationSchema.merge(alertFilterSchema)
);
export type AlertListQuery = z.infer<typeof alertListQuerySchema>;

// ============================================================================
// TRIGGERED ALERTS
// ============================================================================

/**
 * Triggered alert as returned from getTriggeredAlerts server function
 * Note: This represents a real-time computed alert, not a stored record
 */
export interface TriggeredAlertResult {
  alert: Alert;
  product?: {
    id: string;
    name: string;
    sku: string;
  } | null;
  location?: {
    id: string;
    name: string;
    locationCode?: string;
  } | null;
  currentValue: number;
  thresholdValue: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  affectedItems: Array<{
    inventoryId: string;
    productName: string;
    quantity: number;
  }>;
  isFallback?: boolean;
}

/**
 * List triggered alerts result
 */
export interface ListTriggeredAlertsResult {
  alerts: TriggeredAlertResult[];
  count: number;
}

export const alertParamsSchema = idParamSchema;
export type AlertParams = z.infer<typeof alertParamsSchema>;

/**
 * Alert with product and location details
 */
export interface AlertWithDetails {
  id: string;
  organizationId: string;
  alertType: string;
  productId: string | null;
  locationId: string | null;
  threshold: FlexibleJson;
  isActive: boolean;
  notificationChannels: string[] | null;
  escalationUsers: string[] | null;
  lastTriggeredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
  product?: {
    id: string;
    name: string;
    sku: string;
  } | null;
  location?: {
    id: string;
    name: string;
    locationCode: string;
  } | null;
}

/**
 * Triggered alert with current values and severity
 */
export interface TriggeredAlert {
  alert: {
    id: string;
    organizationId: string;
    alertType: string;
    productId: string | null;
    locationId: string | null;
    threshold: FlexibleJson;
    isActive: boolean;
    notificationChannels: string[] | null;
    escalationUsers: string[] | null;
    lastTriggeredAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    updatedBy: string | null;
    version: number;
  };
  product?: {
    id: string;
    name: string;
    sku: string;
  } | null;
  location?: {
    id: string;
    name: string;
    locationCode: string;
  } | null;
  currentValue: number;
  thresholdValue: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  affectedItems: Array<{
    inventoryId: string;
    productName: string;
    quantity: number;
  }>;
  isFallback?: boolean;
}

/**
 * Inventory alert entity.
 * Client-safe version of InventoryAlert from drizzle/schema.
 */
export interface InventoryAlert {
  id: string;
  organizationId: string;
  alertType: 'low_stock' | 'overstock' | 'reorder_point' | 'expiring_soon' | 'slow_moving';
  productId: string | null;
  locationId: string | null;
  threshold: AlertThreshold;
  isActive: boolean;
  notificationChannels: string[] | null;
  escalationUsers: string[] | null;
  lastTriggeredAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
}

/** Alert item as returned in ListAlertsResult.alerts */
export interface AlertListItem {
  id: string;
  organizationId: string;
  alertType: string;
  productId: string | null;
  locationId: string | null;
  threshold: FlexibleJson;
  isActive: boolean;
  notificationChannels: string[] | null;
  escalationUsers: string[] | null;
  lastTriggeredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
}

/**
 * Alert list result
 */
export interface ListAlertsResult {
  alerts: AlertListItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  activeCount: number;
}
