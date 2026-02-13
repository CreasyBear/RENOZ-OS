/**
 * Realtime Hooks
 *
 * Supabase Realtime subscription hooks using the Broadcast pattern.
 * All channels are org-scoped for multi-tenant isolation.
 *
 * @example
 * ```tsx
 * import { useOrdersRealtime, usePipelineRealtime, useInventoryRealtime } from '@/hooks/realtime'
 *
 * function Dashboard() {
 *   const { organizationId } = useCurrentOrg()
 *
 *   // Subscribe to all channels
 *   const { status: ordersStatus } = useOrdersRealtime({ organizationId })
 *   const { status: pipelineStatus } = usePipelineRealtime({ organizationId })
 *   const { status: inventoryStatus } = useInventoryRealtime({ organizationId })
 *
 *   return <RealtimeIndicator statuses={[ordersStatus, pipelineStatus, inventoryStatus]} />
 * }
 * ```
 */

// Generic broadcast hook
export {
  useRealtimeBroadcast,
  getStatusColor,
  getStatusLabel,
  type ConnectionStatus,
  type BroadcastPayload,
  type UseRealtimeBroadcastOptions,
  type UseRealtimeBroadcastResult,
} from './use-realtime'

// Orders channel (broadcast-based)
export {
  useOrdersRealtime,
  type OrderRealtimePayload,
  type UseOrdersRealtimeOptions,
  type UseOrdersRealtimeResult,
} from './use-orders-realtime'

// Pipeline channel (broadcast-based)
export {
  usePipelineRealtime,
  usePipelineByStage,
  type PipelineRealtimePayload,
  type UsePipelineRealtimeOptions,
  type UsePipelineRealtimeResult,
  type UsePipelineByStageOptions,
} from './use-pipeline-realtime'

// Inventory channel
export {
  useInventoryRealtime,
  useLowStockAlerts as useLowStockAlertsRealtime,
  type InventoryRealtimePayload,
  type InventoryBroadcastPayload,
  type UseInventoryRealtimeOptions,
  type UseInventoryRealtimeResult,
  type UseLowStockAlertsOptions,
} from './use-inventory-realtime'

// Legacy postgres_changes-based hooks (backwards compatibility)
// These use direct postgres_changes subscriptions instead of broadcast channels
export {
  useRealtimeOrders,
  useRealtimeOrdersByStatus,
} from './use-realtime-orders'

export {
  useRealtimePipeline,
  useRealtimePipelineByStage,
  useRealtimeHotLeads,
} from './use-realtime-pipeline'

// Re-export generic subscription hook for advanced use cases
export {
  useRealtimeSubscription,
  type RealtimePayload,
  type RealtimeSubscriptionOptions,
  type UseRealtimeSubscriptionResult,
  type RealtimeEvent,
} from './use-realtime-subscription'
