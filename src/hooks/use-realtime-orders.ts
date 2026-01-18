/**
 * Realtime Orders Hook
 *
 * Subscribes to the orders table for live updates.
 * Automatically invalidates orders-related queries.
 *
 * @example
 * ```tsx
 * function OrdersDashboard() {
 *   const { status } = useRealtimeOrders()
 *   const { data: orders } = useQuery({ queryKey: ['orders'], ... })
 *
 *   return (
 *     <div>
 *       <StatusIndicator status={status} />
 *       {orders?.map(order => <OrderCard key={order.id} order={order} />)}
 *     </div>
 *   )
 * }
 * ```
 */
import { useCallback } from 'react'
import {
  useRealtimeSubscription,
  type ConnectionStatus,
  type UseRealtimeSubscriptionResult,
  type RealtimePayload,
} from './use-realtime-subscription'
import { toast } from './use-toast'

// ============================================================================
// TYPES
// ============================================================================

interface OrderPayload {
  id: string
  status: string
  total: number
  customer_name?: string
}

interface UseRealtimeOrdersOptions {
  /**
   * Enable/disable notifications for new orders
   */
  notifyOnNew?: boolean
  /**
   * Enable/disable the subscription
   */
  enabled?: boolean
}

// ============================================================================
// HOOK
// ============================================================================

export function useRealtimeOrders(
  options: UseRealtimeOrdersOptions = {}
): UseRealtimeSubscriptionResult & {
  status: ConnectionStatus
} {
  const { notifyOnNew = false, enabled = true } = options

  const handleUpdate = useCallback(
    (payload: RealtimePayload<OrderPayload>) => {
      if (notifyOnNew && payload.eventType === 'INSERT' && payload.new.id) {
        toast.success('New order received!', {
          description: `Order #${payload.new.id.slice(0, 8)} - ${payload.new.customer_name || 'Customer'}`,
        })
      }
    },
    [notifyOnNew]
  )

  return useRealtimeSubscription<OrderPayload>({
    channel: 'orders-realtime',
    table: 'orders',
    queryKeys: [
      ['orders'],
      ['orders', 'list'],
      ['orders', 'recent'],
      ['dashboard', 'orders'],
    ],
    onUpdate: handleUpdate,
    enabled,
  })
}

// ============================================================================
// FILTERED VARIANT
// ============================================================================

interface UseRealtimeOrdersByStatusOptions extends UseRealtimeOrdersOptions {
  status: string
}

/**
 * Subscribe to orders filtered by status
 */
export function useRealtimeOrdersByStatus(
  options: UseRealtimeOrdersByStatusOptions
): UseRealtimeSubscriptionResult {
  const { status: orderStatus, enabled = true, notifyOnNew = false } = options

  const handleUpdate = useCallback(
    (payload: RealtimePayload<OrderPayload>) => {
      if (notifyOnNew && payload.eventType === 'INSERT' && payload.new.id) {
        toast.info(`Order status changed to ${orderStatus}`, {
          description: `Order #${payload.new.id.slice(0, 8)}`,
        })
      }
    },
    [notifyOnNew, orderStatus]
  )

  return useRealtimeSubscription<OrderPayload>({
    channel: `orders-${orderStatus}`,
    table: 'orders',
    filter: `status=eq.${orderStatus}`,
    queryKeys: [
      ['orders'],
      ['orders', 'status', orderStatus],
    ],
    onUpdate: handleUpdate,
    enabled,
  })
}
