/**
 * Inventory Realtime Hook
 *
 * Subscribes to the inventory broadcast channel for live updates.
 * Uses org-scoped channels: `inventory:{organization_id}`
 *
 * Includes low stock alert detection from database triggers.
 *
 * @example
 * ```tsx
 * function InventoryDashboard() {
 *   const { organizationId } = useCurrentOrg()
 *   const { status } = useInventoryRealtime({
 *     organizationId,
 *     notifyOnLowStock: true,
 *   })
 *   const { data: inventory } = useQuery({ queryKey: ['inventory'], ... })
 *
 *   return (
 *     <div>
 *       <RealtimeStatus status={status} />
 *       <InventoryTable inventory={inventory} />
 *     </div>
 *   )
 * }
 * ```
 */
import { useCallback } from 'react'
import {
  useRealtimeBroadcast,
  type BroadcastPayload,
  type ConnectionStatus,
  type UseRealtimeBroadcastResult,
} from './use-realtime'
import { toast } from '../use-toast'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Inventory payload from database trigger
 * @see drizzle/migrations/0003_realtime_broadcast_triggers.sql
 */
export interface InventoryRealtimePayload {
  id: string
  product_id: string
  location_id: string
  quantity: number
  reserved_quantity: number
  reorder_point: number
  reorder_quantity: number
  updated_at: string
}

/**
 * Extended broadcast payload with inventory-specific alert flag
 */
export interface InventoryBroadcastPayload extends BroadcastPayload<InventoryRealtimePayload> {
  /** True when quantity < reorder_point */
  alert?: boolean
}

export interface UseInventoryRealtimeOptions {
  /**
   * Organization ID for channel scoping
   */
  organizationId: string
  /**
   * Enable/disable notifications for low stock alerts
   */
  notifyOnLowStock?: boolean
  /**
   * Enable/disable notifications for quantity changes
   */
  notifyOnQuantityChange?: boolean
  /**
   * Enable/disable the subscription
   */
  enabled?: boolean
  /**
   * Custom handler for inventory updates
   */
  onInventoryUpdate?: (payload: InventoryBroadcastPayload) => void
  /**
   * Custom handler specifically for low stock alerts
   */
  onLowStockAlert?: (payload: InventoryBroadcastPayload) => void
}

export interface UseInventoryRealtimeResult extends UseRealtimeBroadcastResult {
  status: ConnectionStatus
}

// ============================================================================
// HOOK
// ============================================================================

export function useInventoryRealtime(
  options: UseInventoryRealtimeOptions
): UseInventoryRealtimeResult {
  const {
    organizationId,
    notifyOnLowStock = true,
    notifyOnQuantityChange = false,
    enabled = true,
    onInventoryUpdate,
    onLowStockAlert,
  } = options

  const handleUpdate = useCallback(
    (payload: BroadcastPayload<InventoryRealtimePayload>) => {
      const inventoryPayload = payload as InventoryBroadcastPayload
      const { type, record, old_record, alert } = inventoryPayload

      // Low stock alert notification
      if (notifyOnLowStock && alert && type === 'UPDATE') {
        toast.warning('Low stock alert!', {
          description: `Product inventory is below reorder point (${record.quantity}/${record.reorder_point})`,
        })

        // Call low stock handler
        if (onLowStockAlert) {
          onLowStockAlert(inventoryPayload)
        }
      }

      // Quantity change notification (when not a low stock alert)
      if (notifyOnQuantityChange && type === 'UPDATE' && !alert) {
        const oldQty = old_record?.quantity ?? 0
        const newQty = record.quantity
        const diff = newQty - oldQty

        if (diff !== 0) {
          const direction = diff > 0 ? 'increased' : 'decreased'
          toast.info(`Inventory ${direction}`, {
            description: `Quantity: ${oldQty} → ${newQty} (${diff > 0 ? '+' : ''}${diff})`,
          })
        }
      }

      // Call custom handler
      if (onInventoryUpdate) {
        onInventoryUpdate(inventoryPayload)
      }
    },
    [notifyOnLowStock, notifyOnQuantityChange, onInventoryUpdate, onLowStockAlert]
  )

  return useRealtimeBroadcast<InventoryRealtimePayload>({
    channel: `inventory:${organizationId}`,
    event: 'db_changes',
    queryKeys: [
      ['inventory'],
      ['inventory', 'list'],
      ['inventory', organizationId],
      ['inventory', 'alerts'],
      ['products', 'stock'],
      ['dashboard', 'inventory'],
      ['dashboard', 'alerts'],
    ],
    onUpdate: handleUpdate,
    enabled: enabled && !!organizationId,
  })
}

// ============================================================================
// LOW STOCK ONLY HOOK
// ============================================================================

export interface UseLowStockAlertsOptions {
  /**
   * Organization ID for channel scoping
   */
  organizationId: string
  /**
   * Enable/disable the subscription
   */
  enabled?: boolean
  /**
   * Handler for low stock alerts
   */
  onAlert?: (payload: InventoryBroadcastPayload) => void
}

/**
 * Subscribe only to low stock alerts
 * Useful for notification badges or alert components
 */
export function useLowStockAlerts(
  options: UseLowStockAlertsOptions
): UseInventoryRealtimeResult {
  const { organizationId, enabled = true, onAlert } = options

  const handleUpdate = useCallback(
    (payload: BroadcastPayload<InventoryRealtimePayload>) => {
      const inventoryPayload = payload as InventoryBroadcastPayload

      // Only process low stock alerts
      if (inventoryPayload.alert && onAlert) {
        onAlert(inventoryPayload)
      }
    },
    [onAlert]
  )

  return useRealtimeBroadcast<InventoryRealtimePayload>({
    channel: `inventory:${organizationId}`,
    event: 'db_changes',
    queryKeys: [
      ['inventory', 'alerts'],
      ['dashboard', 'alerts'],
    ],
    onUpdate: handleUpdate,
    enabled: enabled && !!organizationId,
  })
}
