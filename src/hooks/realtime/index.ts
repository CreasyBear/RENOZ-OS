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

// Orders channel
export {
  useOrdersRealtime,
  type OrderRealtimePayload,
  type UseOrdersRealtimeOptions,
  type UseOrdersRealtimeResult,
} from './use-orders-realtime'

// Pipeline channel
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
  useLowStockAlerts,
  type InventoryRealtimePayload,
  type InventoryBroadcastPayload,
  type UseInventoryRealtimeOptions,
  type UseInventoryRealtimeResult,
  type UseLowStockAlertsOptions,
} from './use-inventory-realtime'
