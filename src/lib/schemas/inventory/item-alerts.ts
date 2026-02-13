/**
 * Inventory Item Alerts Schema
 *
 * Types for item-specific alerts derived from inventory item state.
 * These are computed alerts (not stored), shown on the detail view.
 *
 * NOTE: This is different from alert RULES in use-alerts.ts which manage
 * alert configurations. These are derived alerts shown for a specific item.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md (Zone 3: Alerts)
 * @see src/hooks/inventory/use-inventory-item-alerts.ts
 */

import { z } from 'zod';

// ============================================================================
// ALERT TYPES
// ============================================================================

export const inventoryItemAlertTypeValues = [
  'low_stock',
  'out_of_stock',
  'expiring_soon',
  'expired',
  'overstock',
  'quality_hold',
  'pending_inspection',
  'pending_shipment',
] as const;

export const inventoryItemAlertTypeSchema = z.enum(inventoryItemAlertTypeValues);

export type InventoryItemAlertType = z.infer<typeof inventoryItemAlertTypeSchema>;

// ============================================================================
// SEVERITY TYPES
// ============================================================================

export const inventoryAlertSeverityValues = ['critical', 'warning', 'info'] as const;

export const inventoryAlertSeveritySchema = z.enum(inventoryAlertSeverityValues);

/** Severity type for inventory item alerts (named to avoid conflict with customer AlertSeverity) */
export type InventoryAlertSeverity = z.infer<typeof inventoryAlertSeveritySchema>;

// ============================================================================
// ITEM ALERT SCHEMA
// ============================================================================

export const inventoryItemAlertSchema = z.object({
  /** Unique ID for the alert (entityType:entityId:alertType) */
  id: z.string(),
  /** Alert type */
  type: inventoryItemAlertTypeSchema,
  /** Severity level */
  severity: inventoryAlertSeveritySchema,
  /** Display title */
  title: z.string(),
  /** Descriptive message */
  message: z.string(),
  /** Optional action (link/button) */
  action: z.object({
    label: z.string(),
    href: z.string(),
  }).optional(),
  /** Additional data for display */
  data: z.record(z.string(), z.unknown()).optional(),
});

export type InventoryItemAlert = z.infer<typeof inventoryItemAlertSchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface InventoryItemAlertsResponse {
  alerts: InventoryItemAlert[];
  hasAlerts: boolean;
  criticalCount: number;
  warningCount: number;
}

// ============================================================================
// ITEM DATA TYPE (for deriving alerts)
// ============================================================================

/**
 * Minimal item data needed to derive alerts.
 * This is a subset of the full inventory item.
 */
export interface InventoryItemForAlerts {
  id: string;
  productId: string;
  productName?: string;
  quantityOnHand: number;
  quantityAvailable: number;
  reorderPoint?: number | null;
  maxStockLevel?: number | null;
  safetyStock?: number | null;
  expiryDate?: Date | string | null;
  status?: string;
  qualityStatus?: string;
}

// ============================================================================
// ALERT CONFIGURATION
// ============================================================================

/**
 * Configuration for deriving alerts
 */
export interface InventoryAlertConfig {
  /** Days before expiry to show warning (default: 30) */
  expiryWarningDays?: number;
  /** Days before expiry to show critical (default: 7) */
  expiryCriticalDays?: number;
  /** Percentage above max stock to consider overstock (default: 120%) */
  overstockThreshold?: number;
}

export const DEFAULT_ALERT_CONFIG: Required<InventoryAlertConfig> = {
  expiryWarningDays: 30,
  expiryCriticalDays: 7,
  overstockThreshold: 120,
};
