/**
 * Pipeline Realtime Hook
 *
 * Subscribes to the pipeline (opportunities) broadcast channel for live updates.
 * Uses org-scoped channels: `pipeline:{organization_id}`
 *
 * @example
 * ```tsx
 * function PipelineBoard() {
 *   const { organizationId } = useCurrentOrg()
 *   const { status } = usePipelineRealtime({ organizationId })
 *   const { data: opportunities } = useQuery({ queryKey: ['pipeline'], ... })
 *
 *   return (
 *     <div>
 *       <RealtimeStatus status={status} />
 *       <KanbanBoard opportunities={opportunities} />
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
 * Opportunity/Deal payload from database trigger
 * @see drizzle/migrations/0003_realtime_broadcast_triggers.sql
 */
export interface PipelineRealtimePayload {
  id: string
  name: string
  stage: string
  value: number
  probability: number
  customer_id: string
  owner_id: string
  close_date: string
  updated_at: string
}

export interface UsePipelineRealtimeOptions {
  /**
   * Organization ID for channel scoping
   */
  organizationId: string
  /**
   * Enable/disable notifications for stage changes
   */
  notifyOnStageChange?: boolean
  /**
   * Enable/disable notifications for new opportunities
   */
  notifyOnNew?: boolean
  /**
   * Enable/disable the subscription
   */
  enabled?: boolean
  /**
   * Custom handler for pipeline updates
   */
  onPipelineUpdate?: (payload: BroadcastPayload<PipelineRealtimePayload>) => void
}

export interface UsePipelineRealtimeResult extends UseRealtimeBroadcastResult {
  status: ConnectionStatus
}

// ============================================================================
// STAGE LABELS
// ============================================================================

const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
}

function getStageLabel(stage: string): string {
  return STAGE_LABELS[stage] || stage
}

// ============================================================================
// HOOK
// ============================================================================

export function usePipelineRealtime(
  options: UsePipelineRealtimeOptions
): UsePipelineRealtimeResult {
  const {
    organizationId,
    notifyOnStageChange = false,
    notifyOnNew = false,
    enabled = true,
    onPipelineUpdate,
  } = options

  const handleUpdate = useCallback(
    (payload: BroadcastPayload<PipelineRealtimePayload>) => {
      const { type, record, old_record } = payload

      // Notify on new opportunity
      if (notifyOnNew && type === 'INSERT' && record.id) {
        toast.success('New opportunity created!', {
          description: `${record.name} - $${record.value?.toLocaleString() ?? '0'}`,
        })
      }

      // Notify on stage change
      if (notifyOnStageChange && type === 'UPDATE' && old_record?.stage !== record.stage) {
        const isWon = record.stage === 'closed_won'
        const isLost = record.stage === 'closed_lost'

        if (isWon) {
          toast.success('Deal won! 🎉', {
            description: `${record.name} - $${record.value?.toLocaleString() ?? '0'}`,
          })
        } else if (isLost) {
          toast.warning('Deal lost', {
            description: `${record.name} moved to ${getStageLabel(record.stage)}`,
          })
        } else {
          toast.info('Deal moved', {
            description: `${record.name} → ${getStageLabel(record.stage)}`,
          })
        }
      }

      // Call custom handler
      if (onPipelineUpdate) {
        onPipelineUpdate(payload)
      }
    },
    [notifyOnNew, notifyOnStageChange, onPipelineUpdate]
  )

  return useRealtimeBroadcast<PipelineRealtimePayload>({
    channel: `pipeline:${organizationId}`,
    event: 'db_changes',
    queryKeys: [
      ['pipeline'],
      ['pipeline', 'board'],
      ['opportunities'],
      ['opportunities', organizationId],
      ['deals'],
      ['quotes'],
      ['dashboard', 'pipeline'],
      ['dashboard', 'stats'],
    ],
    onUpdate: handleUpdate,
    enabled: enabled && !!organizationId,
  })
}

// ============================================================================
// STAGE-FILTERED HOOK
// ============================================================================

export interface UsePipelineByStageOptions extends UsePipelineRealtimeOptions {
  /**
   * Filter updates to specific stage
   */
  stage: string
}

/**
 * Subscribe to pipeline updates filtered to a specific stage
 * Useful for stage-specific components like kanban columns
 */
export function usePipelineByStage(
  options: UsePipelineByStageOptions
): UsePipelineRealtimeResult {
  const {
    organizationId,
    stage,
    notifyOnStageChange = false,
    notifyOnNew = false,
    enabled = true,
    onPipelineUpdate,
  } = options

  const handleUpdate = useCallback(
    (payload: BroadcastPayload<PipelineRealtimePayload>) => {
      const { type, record, old_record } = payload

      // Only process if related to our stage
      const isRelevant =
        record.stage === stage ||
        old_record?.stage === stage

      if (!isRelevant) return

      // Notify on new opportunity in this stage
      if (notifyOnNew && type === 'INSERT' && record.stage === stage) {
        toast.info(`New ${getStageLabel(stage)} opportunity`, {
          description: record.name,
        })
      }

      // Notify when deal enters/leaves this stage
      if (notifyOnStageChange && type === 'UPDATE') {
        if (old_record?.stage !== stage && record.stage === stage) {
          toast.info(`Deal entered ${getStageLabel(stage)}`, {
            description: record.name,
          })
        } else if (old_record?.stage === stage && record.stage !== stage) {
          toast.info(`Deal left ${getStageLabel(stage)}`, {
            description: `${record.name} → ${getStageLabel(record.stage)}`,
          })
        }
      }

      // Call custom handler
      if (onPipelineUpdate) {
        onPipelineUpdate(payload)
      }
    },
    [stage, notifyOnNew, notifyOnStageChange, onPipelineUpdate]
  )

  return useRealtimeBroadcast<PipelineRealtimePayload>({
    channel: `pipeline:${organizationId}`,
    event: 'db_changes',
    queryKeys: [
      ['pipeline'],
      ['pipeline', 'stage', stage],
      ['opportunities', 'stage', stage],
    ],
    onUpdate: handleUpdate,
    enabled: enabled && !!organizationId,
  })
}
