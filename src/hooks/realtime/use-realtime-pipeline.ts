/**
 * Realtime Pipeline Hook
 *
 * Subscribes to the quotes/deals table for live pipeline updates.
 * Automatically invalidates pipeline-related queries.
 *
 * @example
 * ```tsx
 * function PipelineBoard() {
 *   const { status } = useRealtimePipeline()
 *   const { data: deals } = useQuery({ queryKey: ['pipeline'], ... })
 *
 *   return (
 *     <div>
 *       <StatusIndicator status={status} />
 *       <KanbanBoard deals={deals} />
 *     </div>
 *   )
 * }
 * ```
 */
import { useCallback } from 'react';
import {
  useRealtimeSubscription,
  type ConnectionStatus,
  type UseRealtimeSubscriptionResult,
  type RealtimePayload,
} from './use-realtime-subscription';
import { toast } from '../_shared/use-toast';

// ============================================================================
// TYPES
// ============================================================================

interface DealPayload {
  id: string;
  stage: string;
  value: number;
  title?: string;
  customer_name?: string;
}

interface UseRealtimePipelineOptions {
  /**
   * Enable/disable notifications for stage changes
   */
  notifyOnStageChange?: boolean;
  /**
   * Enable/disable the subscription
   */
  enabled?: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useRealtimePipeline(
  options: UseRealtimePipelineOptions = {}
): UseRealtimeSubscriptionResult & {
  status: ConnectionStatus;
} {
  const { notifyOnStageChange = false, enabled = true } = options;

  const handleUpdate = useCallback(
    (payload: RealtimePayload<DealPayload>) => {
      if (notifyOnStageChange && payload.eventType === 'UPDATE') {
        // Notify only if stage changed
        if (payload.old.stage !== payload.new.stage && payload.new.stage) {
          toast.info(`Deal moved to ${payload.new.stage}`, {
            description: payload.new.title || `Deal #${payload.new.id?.slice(0, 8) || 'Unknown'}`,
          });
        }
      }
    },
    [notifyOnStageChange]
  );

  return useRealtimeSubscription<DealPayload>({
    channel: 'pipeline-realtime',
    table: 'quotes', // or 'deals' depending on your schema
    queryKeys: [
      ['pipeline'],
      ['pipeline', 'board'],
      ['quotes'],
      ['deals'],
      ['dashboard', 'pipeline'],
    ],
    onUpdate: handleUpdate,
    enabled,
  });
}

// ============================================================================
// STAGE-SPECIFIC VARIANT
// ============================================================================

interface UseRealtimePipelineByStageOptions extends UseRealtimePipelineOptions {
  stage: string;
}

/**
 * Subscribe to pipeline deals filtered by stage
 */
export function useRealtimePipelineByStage(
  options: UseRealtimePipelineByStageOptions
): UseRealtimeSubscriptionResult {
  const { stage, enabled = true, notifyOnStageChange = false } = options;

  const handleUpdate = useCallback(
    (payload: RealtimePayload<DealPayload>) => {
      if (notifyOnStageChange && payload.eventType === 'INSERT' && payload.new.id) {
        toast.info(`New deal in ${stage}`, {
          description: payload.new.title || `Deal #${payload.new.id.slice(0, 8)}`,
        });
      }
    },
    [notifyOnStageChange, stage]
  );

  return useRealtimeSubscription<DealPayload>({
    channel: `pipeline-${stage}`,
    table: 'quotes',
    filter: `stage=eq.${stage}`,
    queryKeys: [['pipeline'], ['pipeline', 'stage', stage]],
    onUpdate: handleUpdate,
    enabled,
  });
}

// ============================================================================
// HOT LEADS VARIANT
// ============================================================================

/**
 * Subscribe specifically to hot leads (high priority deals)
 */
export function useRealtimeHotLeads(
  options: UseRealtimePipelineOptions = {}
): UseRealtimeSubscriptionResult {
  const { notifyOnStageChange = true, enabled = true } = options;

  const handleUpdate = useCallback((payload: RealtimePayload<DealPayload>) => {
    if (payload.eventType === 'INSERT' && payload.new.id) {
      toast.warning('New hot lead!', {
        description:
          payload.new.title ||
          `High-value opportunity: $${payload.new.value?.toLocaleString() || '0'}`,
      });
    }
  }, []);

  return useRealtimeSubscription<DealPayload>({
    channel: 'hot-leads',
    table: 'quotes',
    filter: 'priority=eq.high',
    queryKeys: [['pipeline'], ['pipeline', 'hot-leads'], ['dashboard', 'hot-leads']],
    onUpdate: handleUpdate,
    enabled: enabled && notifyOnStageChange,
  });
}
