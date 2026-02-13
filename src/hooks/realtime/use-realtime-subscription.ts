/**
 * Realtime Subscription Hook
 *
 * Generic hook for subscribing to Supabase realtime channels.
 * Automatically invalidates TanStack Query caches on updates.
 *
 * @example
 * ```tsx
 * // Subscribe to orders table changes
 * const { status } = useRealtimeSubscription({
 *   channel: 'orders',
 *   table: 'orders',
 *   queryKeys: [['orders']],
 * })
 *
 * // Subscribe with filter
 * const { status } = useRealtimeSubscription({
 *   channel: 'my-orders',
 *   table: 'orders',
 *   filter: `user_id=eq.${userId}`,
 *   queryKeys: [['orders', userId]],
 * })
 * ```
 */
import { useEffect, useState, useRef } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type {
  RealtimeChannel,
  RealtimePostgresChangesFilter,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

// Simplified payload type for our use case
export interface RealtimePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Partial<T>;
  old: Partial<T>;
}

// ============================================================================
// TYPES
// ============================================================================

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface RealtimeSubscriptionOptions<T = unknown> {
  /**
   * Unique channel name for this subscription
   */
  channel: string;
  /**
   * Database table to listen to
   */
  table: string;
  /**
   * Schema name (default: 'public')
   */
  schema?: string;
  /**
   * Postgres filter (e.g., 'user_id=eq.123')
   */
  filter?: string;
  /**
   * Events to listen for (default: '*')
   */
  event?: RealtimeEvent;
  /**
   * Query keys to invalidate on updates
   */
  queryKeys: QueryKey[];
  /**
   * Optional callback for custom handling
   */
  onUpdate?: (payload: RealtimePayload<T>) => void;
  /**
   * Enable/disable the subscription (default: true)
   */
  enabled?: boolean;
}

export interface UseRealtimeSubscriptionResult {
  /**
   * Current connection status
   */
  status: ConnectionStatus;
  /**
   * Manually reconnect to the channel
   */
  reconnect: () => void;
  /**
   * Manually disconnect from the channel
   */
  disconnect: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useRealtimeSubscription<T = unknown>(
  options: RealtimeSubscriptionOptions<T>
): UseRealtimeSubscriptionResult {
  const {
    channel: channelName,
    table,
    schema = 'public',
    filter,
    event = '*',
    queryKeys,
    onUpdate,
    enabled = true,
  } = options;

  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Connect to the realtime channel
  const connect = () => {
    // Clean up any existing connection
    disconnect();

    if (!enabled) {
      setStatus('disconnected');
      return;
    }

    setStatus('connecting');

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    // Build the channel configuration
    const channelConfig: Parameters<typeof supabase.channel>[1] = {
      config: {
        broadcast: { self: true },
      },
    };

    // Create the channel
    const channel = supabase.channel(channelName, channelConfig);

    // Configure postgres changes listener
    const pgChangesConfig = {
      event,
      schema,
      table,
      ...(filter && { filter }),
    };

    channel.on(
      'postgres_changes',
      pgChangesConfig as RealtimePostgresChangesFilter<'*'>,
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      // Check if aborted
      if (abortControllerRef.current?.signal.aborted) return;

      // Invalidate query caches
      queryKeys.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey });
      });

      // Call custom handler if provided with simplified payload
      if (onUpdate) {
        const simplifiedPayload: RealtimePayload<T> = {
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: (payload.new || {}) as Partial<T>,
          old: (payload.old || {}) as Partial<T>,
        };
        onUpdate(simplifiedPayload);
      }
    }
    );

    // Handle connection status
    channel.subscribe((status) => {
      if (abortControllerRef.current?.signal.aborted) return;

      switch (status) {
        case 'SUBSCRIBED':
          setStatus('connected');
          break;
        case 'CHANNEL_ERROR':
          setStatus('error');
          break;
        case 'TIMED_OUT':
          setStatus('error');
          break;
        case 'CLOSED':
          setStatus('disconnected');
          break;
      }
    });

    channelRef.current = channel;
  };

  // Disconnect from the channel
  const disconnect = () => {
    // Abort any pending operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Remove channel subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setStatus('disconnected');
  };

  // Reconnect helper
  const reconnect = () => {
    connect();
  };

  // Setup and cleanup
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, table, schema, filter, event, enabled]);

  return {
    status,
    reconnect,
    disconnect,
  };
}

// ============================================================================
// CONNECTION STATUS INDICATOR
// ============================================================================

export function getStatusColor(status: ConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'bg-green-500';
    case 'connecting':
      return 'bg-yellow-500';
    case 'error':
      return 'bg-red-500';
    case 'disconnected':
    default:
      return 'bg-gray-400';
  }
}

export function getStatusLabel(status: ConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'Live';
    case 'connecting':
      return 'Connecting...';
    case 'error':
      return 'Connection error';
    case 'disconnected':
    default:
      return 'Offline';
  }
}
