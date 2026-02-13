/**
 * Realtime Subscription Hook
 *
 * Generic hook for subscribing to Supabase Realtime broadcast channels.
 * Supports org-scoped channels with automatic TanStack Query invalidation.
 *
 * Uses the Broadcast pattern (not postgres_changes) for multi-tenant isolation.
 * Database triggers broadcast to channels like `orders:{org_id}`.
 *
 * @example
 * ```tsx
 * const { status } = useRealtimeBroadcast({
 *   channel: `orders:${organizationId}`,
 *   event: 'db_changes',
 *   queryKeys: [['orders']],
 * })
 * ```
 *
 * @see https://supabase.com/docs/guides/realtime/subscribing-to-database-changes
 */
import { useEffect, useState, useRef, useCallback } from 'react'
import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ============================================================================
// TYPES
// ============================================================================

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * Payload structure from database broadcast triggers
 */
export interface BroadcastPayload<T = Record<string, unknown>> {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: T
  old_record?: Partial<T>
  /** For inventory changes - indicates low stock alert */
  alert?: boolean
}

export interface UseRealtimeBroadcastOptions<T = unknown> {
  /**
   * Channel name to subscribe to (e.g., 'orders:org-123')
   * Should match the channel name used in database triggers
   */
  channel: string
  /**
   * Event name to listen for (default: 'db_changes')
   * This matches the event name in realtime.broadcast_changes()
   */
  event?: string
  /**
   * Query keys to invalidate on updates
   */
  queryKeys: QueryKey[]
  /**
   * Optional callback for custom handling
   */
  onUpdate?: (payload: BroadcastPayload<T>) => void
  /**
   * Enable/disable the subscription (default: true)
   */
  enabled?: boolean
  /**
   * Enable exponential backoff reconnection (default: true)
   */
  autoReconnect?: boolean
  /**
   * Maximum reconnection attempts (default: 5)
   */
  maxReconnectAttempts?: number
}

export interface UseRealtimeBroadcastResult {
  /**
   * Current connection status
   */
  status: ConnectionStatus
  /**
   * Number of reconnection attempts
   */
  reconnectAttempts: number
  /**
   * Manually reconnect to the channel
   */
  reconnect: () => void
  /**
   * Manually disconnect from the channel
   */
  disconnect: () => void
}

// ============================================================================
// EXPONENTIAL BACKOFF
// ============================================================================

const BASE_DELAY_MS = 1000
const MAX_DELAY_MS = 30000

function getReconnectDelay(attempt: number): number {
  const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS)
  // Add jitter (±20%)
  const jitter = delay * 0.2 * (Math.random() * 2 - 1)
  return Math.floor(delay + jitter)
}

// ============================================================================
// HOOK
// ============================================================================

export function useRealtimeBroadcast<T = unknown>(
  options: UseRealtimeBroadcastOptions<T>
): UseRealtimeBroadcastResult {
  const {
    channel: channelName,
    event = 'db_changes',
    queryKeys,
    onUpdate,
    enabled = true,
    autoReconnect = true,
    maxReconnectAttempts = 5,
  } = options

  const queryClient = useQueryClient()
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const connectRef = useRef<() => void>(() => {})

  // Clear reconnect timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  // Disconnect from the channel
  const disconnect = useCallback(() => {
    clearReconnectTimeout()

    // Abort any pending operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // Remove channel subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    setStatus('disconnected')
    setReconnectAttempts(0)
  }, [clearReconnectTimeout])

  // Connect to the realtime channel
  const connect = useCallback(() => {
    // Clean up any existing connection
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    clearReconnectTimeout()

    if (!enabled) {
      setStatus('disconnected')
      return
    }

    setStatus('connecting')

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()

    // Create the channel with broadcast configuration
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false }, // Don't receive own broadcasts
        private: true, // Require authentication
      },
    })

    // Listen for broadcast events from database triggers
    channel.on('broadcast', { event }, (payload) => {
      // Check if aborted
      if (abortControllerRef.current?.signal.aborted) return

      const data = payload.payload as BroadcastPayload<T>

      // Invalidate query caches
      queryKeys.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey })
      })

      // Call custom handler if provided
      if (onUpdate) {
        onUpdate(data)
      }
    })

    // Handle connection status
    channel.subscribe((subscribeStatus, err) => {
      if (abortControllerRef.current?.signal.aborted) return

      switch (subscribeStatus) {
        case 'SUBSCRIBED':
          setStatus('connected')
          setReconnectAttempts(0) // Reset on successful connection
          break
        case 'CHANNEL_ERROR':
        case 'TIMED_OUT':
          console.error(`Realtime channel error for ${channelName}:`, err)
          setStatus('error')

          // Schedule reconnection with exponential backoff
          if (autoReconnect && reconnectAttempts < maxReconnectAttempts) {
            const delay = getReconnectDelay(reconnectAttempts)
            console.log(`Reconnecting to ${channelName} in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`)

            reconnectTimeoutRef.current = setTimeout(() => {
              setReconnectAttempts((prev) => prev + 1)
              connectRef.current()
            }, delay)
          }
          break
        case 'CLOSED':
          setStatus('disconnected')
          break
      }
    })

    channelRef.current = channel
  }, [
    channelName,
    event,
    queryKeys,
    onUpdate,
    enabled,
    autoReconnect,
    maxReconnectAttempts,
    reconnectAttempts,
    queryClient,
    clearReconnectTimeout,
  ])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  // Reconnect helper (resets attempts)
  const reconnect = useCallback(() => {
    setReconnectAttempts(0)
    connect()
  }, [connect])

  // Setup and cleanup
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- connect() sets up subscription
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    status,
    reconnectAttempts,
    reconnect,
    disconnect,
  }
}

// ============================================================================
// CONNECTION STATUS UTILITIES
// ============================================================================

export function getStatusColor(status: ConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'bg-green-500'
    case 'connecting':
      return 'bg-yellow-500'
    case 'error':
      return 'bg-red-500'
    case 'disconnected':
    default:
      return 'bg-gray-400'
  }
}

export function getStatusLabel(status: ConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'Live'
    case 'connecting':
      return 'Connecting...'
    case 'error':
      return 'Connection error'
    case 'disconnected':
    default:
      return 'Offline'
  }
}

// ============================================================================
// RE-EXPORT LEGACY HOOK FOR BACKWARDS COMPATIBILITY
// ============================================================================

// The original postgres_changes hook is still available at ../use-realtime-subscription
// This new hook uses broadcast channels which is the preferred pattern for multi-tenant apps
