/**
 * Orders Realtime Hook
 *
 * Subscribes to the orders broadcast channel for live updates.
 * Uses org-scoped channels: `orders:{organization_id}`
 *
 * @example
 * ```tsx
 * function OrdersDashboard() {
 *   const { organizationId } = useCurrentOrg()
 *   const { status } = useOrdersRealtime({ organizationId })
 *   const { data: orders } = useQuery({ queryKey: ['orders'], ... })
 *
 *   return (
 *     <div>
 *       <RealtimeStatus status={status} />
 *       {orders?.map(order => <OrderCard key={order.id} order={order} />)}
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
import { toast } from '../_shared/use-toast'
import { queryKeys } from '@/lib/query-keys'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Order payload from database trigger
 * @see drizzle/migrations/0003_realtime_broadcast_triggers.sql
 */
export interface OrderRealtimePayload {
  id: string
  order_number: string
  status: string
  payment_status: string
  customer_id: string
  total: number
  updated_at: string
}

export interface UseOrdersRealtimeOptions {
  /**
   * Organization ID for channel scoping
   */
  organizationId: string
  /**
   * Enable/disable notifications for new orders
   */
  notifyOnNew?: boolean
  /**
   * Enable/disable notifications for status changes
   */
  notifyOnStatusChange?: boolean
  /**
   * Enable/disable the subscription
   */
  enabled?: boolean
  /**
   * Custom handler for order updates
   */
  onOrderUpdate?: (payload: BroadcastPayload<OrderRealtimePayload>) => void
}

export interface UseOrdersRealtimeResult extends UseRealtimeBroadcastResult {
  status: ConnectionStatus
}

// ============================================================================
// STATUS LABELS
// ============================================================================

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status
}

// ============================================================================
// HOOK
// ============================================================================

export function useOrdersRealtime(
  options: UseOrdersRealtimeOptions
): UseOrdersRealtimeResult {
  const {
    organizationId,
    notifyOnNew = false,
    notifyOnStatusChange = false,
    enabled = true,
    onOrderUpdate,
  } = options

  const handleUpdate = useCallback(
    (payload: BroadcastPayload<OrderRealtimePayload>) => {
      const { type, record, old_record } = payload

      // Notify on new order
      if (notifyOnNew && type === 'INSERT' && record.id) {
        toast.success('New order received!', {
          description: `Order #${record.order_number} - $${record.total?.toLocaleString() ?? '0'}`,
        })
      }

      // Notify on status change
      if (notifyOnStatusChange && type === 'UPDATE' && old_record?.status !== record.status) {
        toast.info(`Order status updated`, {
          description: `Order #${record.order_number} is now ${getStatusLabel(record.status)}`,
        })
      }

      // Call custom handler
      if (onOrderUpdate) {
        onOrderUpdate(payload)
      }
    },
    [notifyOnNew, notifyOnStatusChange, onOrderUpdate]
  )

  return useRealtimeBroadcast<OrderRealtimePayload>({
    channel: `orders:${organizationId}`,
    event: 'db_changes',
    queryKeys: [
      queryKeys.orders.all,
      queryKeys.orders.lists(),
      queryKeys.orders.recent,
      queryKeys.orders.list({}),
      queryKeys.dashboard.orders(),
      queryKeys.dashboard.stats(),
    ],
    onUpdate: handleUpdate,
    enabled: enabled && !!organizationId,
  })
}

// ============================================================================
// CONVENIENCE HOOK WITH CURRENT ORG
// ============================================================================

// For use with useCurrentOrg - automatically uses current organization
// Import useCurrentOrg in your component and pass organizationId
