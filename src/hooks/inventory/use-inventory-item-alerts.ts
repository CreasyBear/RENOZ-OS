/**
 * Inventory Item Alerts Hook
 *
 * Derives alerts from inventory item state without hitting the database.
 * These are computed alerts shown on the detail view, not alert rules.
 *
 * Alert Types:
 * - low_stock: Quantity at or below reorder point
 * - out_of_stock: Zero quantity
 * - expiring_soon: Batch expires within configured days
 * - expired: Batch has expired
 * - overstock: Quantity exceeds max stock level
 * - quality_hold: Item has quality hold status
 * - pending_inspection: Requires quality inspection
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md (Zone 3: Alerts)
 * @see src/lib/schemas/inventory/item-alerts.ts
 */

import { useMemo } from 'react';
import { differenceInDays, isPast } from 'date-fns';
import { generateAlertId } from '@/hooks/_shared/use-alert-dismissals';
import type {
  InventoryItemAlert,
  InventoryItemAlertsResponse,
  InventoryItemForAlerts,
  InventoryAlertConfig,
  InventoryAlertSeverity,
} from '@/lib/schemas/inventory/item-alerts';
import { DEFAULT_ALERT_CONFIG } from '@/lib/schemas/inventory/item-alerts';

// ============================================================================
// TYPES
// ============================================================================

export interface UseInventoryItemAlertsOptions {
  /** Alert configuration overrides */
  config?: InventoryAlertConfig;
}

export interface UseInventoryItemAlertsReturn extends InventoryItemAlertsResponse {
  /** Raw alerts before any filtering */
  allAlerts: InventoryItemAlert[];
}

// ============================================================================
// ALERT DERIVATION LOGIC
// ============================================================================

/**
 * Derive alerts from inventory item data.
 * Pure function for testability.
 *
 * IMPORTANT: This hook now derives ITEM-CONTEXTUAL alerts only.
 * Product-level alerts (low stock, out of stock, overstock based on reorder points)
 * are now handled on the Product Inventory View at /products/{productId}?tab=inventory.
 *
 * For serialized items, we focus on:
 * - Expiry alerts (item-specific)
 * - Quality holds (item-specific)
 * - Allocated pending shipment (item-specific)
 *
 * Sold items should have NO alerts (correct final state).
 */
export function deriveItemAlerts(
  item: InventoryItemForAlerts,
  config: Required<InventoryAlertConfig> = DEFAULT_ALERT_CONFIG
): InventoryItemAlert[] {
  const alerts: InventoryItemAlert[] = [];

  // ─────────────────────────────────────────────────────────────────────────
  // Terminal States - No Alerts Needed
  // ─────────────────────────────────────────────────────────────────────────
  // Sold items are in a correct final state - no action needed
  if (item.status === 'sold') {
    return alerts;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Allocated Pending Shipment Alert (item-contextual)
  // ─────────────────────────────────────────────────────────────────────────
  if (item.status === 'allocated') {
    alerts.push({
      id: generateAlertId('inventory', item.id, 'pending_shipment'),
      type: 'pending_shipment',
      severity: 'warning',
      title: 'Pending Shipment',
      message: 'This item is allocated and awaiting shipment.',
      action: {
        label: 'View Item',
        href: `/inventory/${item.id}`,
      },
      data: {
        status: item.status,
        productId: item.productId,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Expiry Alerts (item-contextual)
  // ─────────────────────────────────────────────────────────────────────────

  if (item.expiryDate) {
    const expiryDate = new Date(item.expiryDate);
    const now = new Date();

    if (isPast(expiryDate)) {
      // Expired (critical)
      alerts.push({
        id: generateAlertId('inventory', item.id, 'expired'),
        type: 'expired',
        severity: 'critical',
        title: 'Expired',
        message: 'This batch has expired. Remove from inventory or dispose properly.',
        action: {
          label: 'Adjust Stock',
          href: `/inventory/${item.id}`,
        },
        data: {
          expiryDate: expiryDate.toISOString(),
        },
      });
    } else {
      const daysUntilExpiry = differenceInDays(expiryDate, now);

      if (daysUntilExpiry <= config.expiryCriticalDays) {
        // Expiring very soon (critical)
        alerts.push({
          id: generateAlertId('inventory', item.id, 'expiring_soon'),
          type: 'expiring_soon',
          severity: 'critical',
          title: 'Expiring Soon',
          message: `This batch expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}. Plan for disposal or expedited sale.`,
          data: {
            expiryDate: expiryDate.toISOString(),
            daysUntilExpiry,
          },
        });
      } else if (daysUntilExpiry <= config.expiryWarningDays) {
        // Expiring within warning period (warning)
        alerts.push({
          id: generateAlertId('inventory', item.id, 'expiring_soon'),
          type: 'expiring_soon',
          severity: 'warning',
          title: 'Expiring Soon',
          message: `This batch expires in ${daysUntilExpiry} days. Consider prioritizing for sale.`,
          data: {
            expiryDate: expiryDate.toISOString(),
            daysUntilExpiry,
          },
        });
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Quality Alerts
  // ─────────────────────────────────────────────────────────────────────────

  if (item.qualityStatus === 'quarantined' || item.status === 'quarantined') {
    alerts.push({
      id: generateAlertId('inventory', item.id, 'quality_hold'),
      type: 'quality_hold',
      severity: 'warning',
      title: 'Quality Hold',
      message: 'This item is quarantined pending quality review.',
      action: {
        label: 'View Quality',
        href: `/inventory/${item.id}?tab=quality`,
      },
      data: {
        status: item.status,
        qualityStatus: item.qualityStatus,
      },
    });
  }

  if (item.status === 'damaged' || item.qualityStatus === 'damaged') {
    alerts.push({
      id: generateAlertId('inventory', item.id, 'quality_hold'),
      type: 'quality_hold',
      severity: 'critical',
      title: 'Damaged Inventory',
      message: 'This item is marked as damaged and may not be sellable.',
      action: {
        label: 'View Quality',
        href: `/inventory/${item.id}?tab=quality`,
      },
      data: {
        status: item.status,
        qualityStatus: item.qualityStatus,
      },
    });
  }

  return alerts;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for deriving inventory item alerts from item data.
 *
 * @example
 * ```tsx
 * function InventoryDetailContainer({ itemId }: { itemId: string }) {
 *   const { data: item } = useInventoryItem(itemId);
 *   const { alerts, criticalCount } = useInventoryItemAlerts(item);
 *   const { dismiss, isAlertDismissed } = useAlertDismissals();
 *
 *   const visibleAlerts = alerts.filter(
 *     (alert) => !isAlertDismissed(alert.id)
 *   );
 *
 *   return <InventoryItemAlerts alerts={visibleAlerts} onDismiss={dismiss} />;
 * }
 * ```
 */
export function useInventoryItemAlerts(
  item: InventoryItemForAlerts | null | undefined,
  options: UseInventoryItemAlertsOptions = {}
): UseInventoryItemAlertsReturn {
  const config = useMemo(
    () => ({
      ...DEFAULT_ALERT_CONFIG,
      ...options.config,
    }),
    [options.config]
  );

  const result = useMemo((): UseInventoryItemAlertsReturn => {
    if (!item) {
      return {
        alerts: [],
        allAlerts: [],
        hasAlerts: false,
        criticalCount: 0,
        warningCount: 0,
      };
    }

    const alerts = deriveItemAlerts(item, config);

    // Sort by severity: critical first, then warning, then info
    const severityOrder: Record<InventoryAlertSeverity, number> = {
      critical: 0,
      warning: 1,
      info: 2,
    };
    const sortedAlerts = [...alerts].sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    );

    const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
    const warningCount = alerts.filter((a) => a.severity === 'warning').length;

    return {
      alerts: sortedAlerts,
      allAlerts: alerts,
      hasAlerts: alerts.length > 0,
      criticalCount,
      warningCount,
    };
  }, [item, config]);

  return result;
}

export default useInventoryItemAlerts;
