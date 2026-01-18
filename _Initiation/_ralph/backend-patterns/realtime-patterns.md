# Supabase Realtime Patterns

Reference: https://supabase.com/docs/guides/realtime

## Overview

Supabase Realtime provides three mechanisms for real-time communication:

| Feature | Use Case | Scalability | Cost |
|---------|----------|-------------|------|
| **Broadcast** | Ephemeral events (typing indicators, presence) | High | Per message |
| **Postgres Changes** | Database sync, CRUD notifications | Medium | Per change |
| **Presence** | User online status, cursors | Medium | Per sync |

---

## 1. Broadcast vs Postgres Changes

### When to Use Broadcast

- **Ephemeral events** that don't need persistence (typing indicators, cursor position)
- **High-frequency updates** where you control the payload
- **Custom event shapes** not tied to database schema
- **Lower latency** requirements (bypasses database)

```typescript
// Broadcast: Typing indicator
const channel = supabase.channel('chat:org-123')

// Send
channel.send({
  type: 'broadcast',
  event: 'typing',
  payload: { userId: 'user-456', isTyping: true }
})

// Receive
channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
  console.log(`${payload.userId} is typing: ${payload.isTyping}`)
})
```

### When to Use Postgres Changes

- **Database synchronization** - keep UI in sync with DB state
- **CRUD operations** - INSERT, UPDATE, DELETE notifications
- **Audit/activity feeds** - leverages existing data flow
- **RLS enforcement** - inherits row-level security

```typescript
// Postgres Changes: Project updates
const channel = supabase.channel('projects:org-123')
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'projects',
      filter: 'org_id=eq.org-123'
    },
    (payload) => {
      console.log('Change:', payload.eventType, payload.new)
    }
  )
  .subscribe()
```

### Scalability Considerations

| Concern | Broadcast | Postgres Changes |
|---------|-----------|------------------|
| **Throughput** | ~1000 msg/sec/channel | ~500 changes/sec/table |
| **Latency** | ~50ms | ~100-200ms (through DB) |
| **Payload size** | Up to 1MB | Row data (limited) |
| **Filtering** | Client-side | Server-side (filter param) |

**Recommendation**: Use Broadcast for high-frequency ephemeral events. Use Postgres Changes for data sync where RLS matters.

---

## 2. Channel Naming Conventions

### Multi-Tenant Scoping Pattern

Always scope channels to prevent cross-tenant data leakage:

```typescript
// Pattern: ${entity}:${orgId}[:${resourceId}]

// Organization-wide channels
const orgChannel = `updates:${orgId}`           // org updates
const chatChannel = `chat:${orgId}`             // org chat

// Resource-specific channels
const projectChannel = `project:${orgId}:${projectId}`
const documentChannel = `document:${orgId}:${docId}`

// User-specific within org
const userNotifications = `notifications:${orgId}:${userId}`
```

### Channel Naming Best Practices

```typescript
// Good: Hierarchical, predictable
'projects:org-abc123'
'project:org-abc123:proj-xyz789'
'chat:org-abc123:room-general'

// Bad: Flat, collision-prone
'projects'           // No tenant isolation
'project_xyz789'     // No org context
'chat-general'       // Ambiguous scope
```

### Type-Safe Channel Names

```typescript
// types/realtime.ts
export type ChannelName =
  | `updates:${string}`
  | `project:${string}:${string}`
  | `chat:${string}:${string}`
  | `notifications:${string}:${string}`

export function createChannelName(
  type: 'updates' | 'project' | 'chat' | 'notifications',
  orgId: string,
  resourceId?: string
): ChannelName {
  if (resourceId) {
    return `${type}:${orgId}:${resourceId}` as ChannelName
  }
  return `${type}:${orgId}` as ChannelName
}

// Usage
const channel = createChannelName('project', orgId, projectId)
// Result: 'project:org-123:proj-456'
```

---

## 3. Subscription Lifecycle (React Hooks)

### Basic Subscription Hook

```typescript
// hooks/useRealtimeSubscription.ts
import { useEffect, useRef, useCallback } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface UseRealtimeOptions<T> {
  channelName: string
  table: string
  filter?: string
  onInsert?: (payload: T) => void
  onUpdate?: (payload: T) => void
  onDelete?: (payload: { old: T }) => void
  enabled?: boolean
}

export function useRealtimeSubscription<T>({
  channelName,
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true
}: UseRealtimeOptions<T>) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!enabled) return

    const channel = supabase.channel(channelName)

    // Subscribe to postgres changes
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table,
        filter
      },
      (payload) => onInsert?.(payload.new as T)
    )

    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table,
        filter
      },
      (payload) => onUpdate?.(payload.new as T)
    )

    channel.on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table,
        filter
      },
      (payload) => onDelete?.({ old: payload.old as T })
    )

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Subscribed to ${channelName}`)
      }
    })

    channelRef.current = channel

    // Cleanup on unmount or dependency change
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [channelName, table, filter, enabled, onInsert, onUpdate, onDelete])

  return channelRef.current
}
```

### Usage Example

```typescript
// components/ProjectList.tsx
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription'
import { useQueryClient } from '@tanstack/react-query'

function ProjectList({ orgId }: { orgId: string }) {
  const queryClient = useQueryClient()

  useRealtimeSubscription<Project>({
    channelName: `projects:${orgId}`,
    table: 'projects',
    filter: `org_id=eq.${orgId}`,
    onInsert: (project) => {
      queryClient.setQueryData<Project[]>(['projects', orgId], (old) =>
        old ? [...old, project] : [project]
      )
    },
    onUpdate: (project) => {
      queryClient.setQueryData<Project[]>(['projects', orgId], (old) =>
        old?.map((p) => (p.id === project.id ? project : p)) ?? []
      )
    },
    onDelete: ({ old }) => {
      queryClient.setQueryData<Project[]>(['projects', orgId], (old) =>
        old?.filter((p) => p.id !== old.id) ?? []
      )
    }
  })

  // ... rest of component
}
```

### Subscription Status Hook

```typescript
// hooks/useRealtimeStatus.ts
import { useState, useEffect } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'

type SubscriptionStatus =
  | 'SUBSCRIBED'
  | 'TIMED_OUT'
  | 'CLOSED'
  | 'CHANNEL_ERROR'

export function useRealtimeStatus(channel: RealtimeChannel | null) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)

  useEffect(() => {
    if (!channel) return

    const callback = (status: SubscriptionStatus) => {
      setStatus(status)
    }

    channel.subscribe(callback)

    return () => {
      // Status will update on channel removal
    }
  }, [channel])

  return {
    status,
    isConnected: status === 'SUBSCRIBED',
    hasError: status === 'CHANNEL_ERROR' || status === 'TIMED_OUT'
  }
}
```

---

## 4. Database Triggers for Broadcast

### Using `realtime.broadcast_changes()`

For complex scenarios where you need to broadcast custom payloads or aggregate data:

```sql
-- Enable the broadcast_changes function
-- (Available in Supabase with realtime extension)

-- Create a trigger function that broadcasts custom data
CREATE OR REPLACE FUNCTION broadcast_project_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Broadcast to org-scoped channel
  PERFORM realtime.broadcast_changes(
    'project:' || NEW.org_id || ':' || NEW.id,  -- channel
    'project_updated',                           -- event
    'UPDATE',                                    -- operation
    'public',                                    -- schema
    'projects',                                  -- table
    jsonb_build_object(                         -- payload
      'id', NEW.id,
      'name', NEW.name,
      'status', NEW.status,
      'updated_by', NEW.updated_by,
      'updated_at', NEW.updated_at
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
CREATE TRIGGER on_project_update
  AFTER UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION broadcast_project_update();
```

### Selective Broadcasting

```sql
-- Only broadcast significant changes
CREATE OR REPLACE FUNCTION broadcast_significant_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only broadcast status changes, not every update
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM realtime.broadcast_changes(
      'status:' || NEW.org_id,
      'status_change',
      'UPDATE',
      'public',
      'projects',
      jsonb_build_object(
        'project_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 5. RLS Authorization for Channels

### Private Channels with JWT

```typescript
// For private channels, Supabase uses JWT claims for authorization
// The user must have a valid session to subscribe

const channel = supabase.channel('private:org-123', {
  config: {
    // Enable RLS for this channel
    private: true
  }
})

channel.subscribe(async (status) => {
  if (status === 'SUBSCRIBED') {
    console.log('Authorized and subscribed')
  }
  if (status === 'CHANNEL_ERROR') {
    console.error('Authorization failed')
  }
})
```

### RLS Policies for Realtime

```sql
-- Postgres Changes respects RLS automatically
-- Ensure your table has appropriate policies

-- Example: Users can only see projects in their org
CREATE POLICY "Users can view org projects"
ON projects FOR SELECT
USING (
  org_id IN (
    SELECT org_id FROM org_members
    WHERE user_id = auth.uid()
  )
);

-- The realtime subscription will only receive changes
-- that pass this RLS policy
```

### Custom Authorization via Edge Functions

```typescript
// For complex authorization logic, use Edge Functions

// supabase/functions/authorize-channel/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { channelName, userId } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Parse channel name
  const [type, orgId, resourceId] = channelName.split(':')

  // Check membership
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .single()

  if (!membership) {
    return new Response(JSON.stringify({ authorized: false }), { status: 403 })
  }

  return new Response(JSON.stringify({ authorized: true }))
})
```

---

## 6. TanStack Query Integration

### Invalidation Pattern

```typescript
// hooks/useProjectsRealtime.ts
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useProjectsRealtime(orgId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel(`projects:${orgId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `org_id=eq.${orgId}`
        },
        (payload) => {
          // Strategy 1: Invalidate and refetch (simple, always fresh)
          queryClient.invalidateQueries({
            queryKey: ['projects', orgId]
          })

          // Strategy 2: Optimistic update (faster, less network)
          // See below for implementation
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orgId, queryClient])
}
```

### Optimistic Cache Updates

```typescript
// hooks/useProjectsRealtime.ts (optimistic version)
export function useProjectsRealtimeOptimistic(orgId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel(`projects:${orgId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'projects',
          filter: `org_id=eq.${orgId}`
        },
        (payload) => {
          queryClient.setQueryData<Project[]>(
            ['projects', orgId],
            (old) => old ? [...old, payload.new as Project] : [payload.new as Project]
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `org_id=eq.${orgId}`
        },
        (payload) => {
          queryClient.setQueryData<Project[]>(
            ['projects', orgId],
            (old) => old?.map((p) =>
              p.id === (payload.new as Project).id
                ? (payload.new as Project)
                : p
            ) ?? []
          )

          // Also update individual project query
          queryClient.setQueryData(
            ['project', (payload.new as Project).id],
            payload.new
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'projects',
          filter: `org_id=eq.${orgId}`
        },
        (payload) => {
          const deletedId = (payload.old as Project).id
          queryClient.setQueryData<Project[]>(
            ['projects', orgId],
            (old) => old?.filter((p) => p.id !== deletedId) ?? []
          )
          queryClient.removeQueries({ queryKey: ['project', deletedId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orgId, queryClient])
}
```

### Combined Hook Pattern

```typescript
// hooks/useProjects.ts
import { useQuery } from '@tanstack/react-query'
import { useProjectsRealtimeOptimistic } from './useProjectsRealtime'

export function useProjects(orgId: string) {
  // Subscribe to realtime updates
  useProjectsRealtimeOptimistic(orgId)

  // Return query with initial/cached data
  return useQuery({
    queryKey: ['projects', orgId],
    queryFn: () => fetchProjects(orgId),
    staleTime: Infinity, // Realtime handles freshness
  })
}
```

---

## 7. Error Handling & Reconnection

### Subscription Status Handling

```typescript
// hooks/useRealtimeWithRetry.ts
import { useEffect, useRef, useState } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  retryCount: number
  lastError?: string
}

export function useRealtimeWithRetry(
  channelName: string,
  options: {
    maxRetries?: number
    retryDelayMs?: number
    onMessage: (payload: any) => void
  }
) {
  const { maxRetries = 5, retryDelayMs = 1000, onMessage } = options
  const [state, setState] = useState<ConnectionState>({
    status: 'connecting',
    retryCount: 0
  })
  const channelRef = useRef<RealtimeChannel | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = () => {
    const channel = supabase.channel(channelName)

    channel.on('broadcast', { event: '*' }, ({ payload }) => {
      onMessage(payload)
    })

    channel.subscribe((status, err) => {
      switch (status) {
        case 'SUBSCRIBED':
          setState({ status: 'connected', retryCount: 0 })
          break

        case 'TIMED_OUT':
        case 'CHANNEL_ERROR':
          setState((prev) => ({
            status: 'error',
            retryCount: prev.retryCount + 1,
            lastError: err?.message ?? status
          }))

          // Attempt reconnection
          if (state.retryCount < maxRetries) {
            retryTimeoutRef.current = setTimeout(() => {
              supabase.removeChannel(channel)
              connect()
            }, retryDelayMs * Math.pow(2, state.retryCount)) // Exponential backoff
          }
          break

        case 'CLOSED':
          setState({ status: 'disconnected', retryCount: 0 })
          break
      }
    })

    channelRef.current = channel
  }

  useEffect(() => {
    connect()

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [channelName])

  return {
    ...state,
    isConnected: state.status === 'connected',
    retry: () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
      setState({ status: 'connecting', retryCount: 0 })
      connect()
    }
  }
}
```

### UI Connection Indicator

```typescript
// components/RealtimeStatus.tsx
import { useRealtimeWithRetry } from '@/hooks/useRealtimeWithRetry'

function RealtimeStatus({ channelName }: { channelName: string }) {
  const { status, retryCount, lastError, retry } = useRealtimeWithRetry(
    channelName,
    { onMessage: () => {} }
  )

  if (status === 'connected') {
    return <span className="text-green-500">Live</span>
  }

  if (status === 'connecting') {
    return <span className="text-yellow-500">Connecting...</span>
  }

  if (status === 'error') {
    return (
      <div className="text-red-500">
        <span>Disconnected ({retryCount} retries)</span>
        <button onClick={retry} className="ml-2 underline">
          Retry
        </button>
      </div>
    )
  }

  return null
}
```

### Global Reconnection Handler

```typescript
// lib/realtime-manager.ts
class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map()
  private reconnecting = false

  async reconnectAll() {
    if (this.reconnecting) return
    this.reconnecting = true

    for (const [name, channel] of this.channels) {
      await supabase.removeChannel(channel)
    }

    // Wait for network to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000))

    for (const [name] of this.channels) {
      const newChannel = supabase.channel(name)
      // Re-attach handlers...
      await newChannel.subscribe()
      this.channels.set(name, newChannel)
    }

    this.reconnecting = false
  }
}

// Listen for network changes
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    realtimeManager.reconnectAll()
  })
}
```

---

## 8. Pricing Considerations

### Supabase Realtime Pricing (as of 2024)

| Tier | Concurrent Connections | Messages/Month | Cost |
|------|------------------------|----------------|------|
| Free | 200 | 2 million | $0 |
| Pro | 500 | 5 million | $25/mo |
| Team | 1000 | 10 million | $599/mo |
| Enterprise | Custom | Custom | Custom |

### Cost Optimization Strategies

#### 1. Minimize Connections

```typescript
// Bad: One channel per resource
projects.forEach(p => {
  supabase.channel(`project:${p.id}`).subscribe()
})

// Good: Single channel with filters
supabase.channel(`projects:${orgId}`)
  .on('postgres_changes', {
    filter: `org_id=eq.${orgId}`,
    // ...
  })
  .subscribe()
```

#### 2. Debounce High-Frequency Events

```typescript
// For typing indicators, debounce broadcasts
import { useDebouncedCallback } from 'use-debounce'

function ChatInput() {
  const sendTyping = useDebouncedCallback(
    () => {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, isTyping: true }
      })
    },
    300 // Only send every 300ms
  )

  return <input onChange={() => sendTyping()} />
}
```

#### 3. Use Server-Side Filters

```typescript
// Bad: Receive all, filter client-side
channel.on('postgres_changes', { event: '*', table: 'projects' }, (payload) => {
  if (payload.new.org_id === currentOrgId) {
    // handle
  }
})

// Good: Filter server-side
channel.on('postgres_changes', {
  event: '*',
  table: 'projects',
  filter: `org_id=eq.${currentOrgId}` // Only receives matching rows
}, handleChange)
```

#### 4. Unsubscribe When Not Needed

```typescript
// Unsubscribe when component unmounts or tab hidden
useEffect(() => {
  const channel = supabase.channel(channelName).subscribe()

  const handleVisibilityChange = () => {
    if (document.hidden) {
      supabase.removeChannel(channel)
    } else {
      // Resubscribe when visible
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)

  return () => {
    supabase.removeChannel(channel)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}, [])
```

#### 5. Batch Database Operations

```sql
-- Instead of individual updates that trigger multiple broadcasts
UPDATE projects SET status = 'active' WHERE id = '1';
UPDATE projects SET status = 'active' WHERE id = '2';
UPDATE projects SET status = 'active' WHERE id = '3';

-- Use a single batch update (1 broadcast instead of 3)
UPDATE projects SET status = 'active' WHERE id IN ('1', '2', '3');
```

### Message Count Estimation

```
Messages/month =
  (Active users) x
  (Sessions/day) x
  (Events/session) x
  (Days/month)

Example:
  100 users x 2 sessions x 50 events x 30 days = 300,000 messages/month
```

---

## Quick Reference

### Subscription Checklist

- [ ] Channel name includes org/tenant scope
- [ ] Cleanup in useEffect return
- [ ] Handle subscription errors
- [ ] Consider reconnection strategy
- [ ] Filter server-side when possible
- [ ] Integrate with TanStack Query cache

### Common Patterns

```typescript
// Quick subscription
const channel = supabase
  .channel(`${table}:${orgId}`)
  .on('postgres_changes', { event: '*', schema: 'public', table, filter }, handler)
  .subscribe()

// Cleanup
return () => supabase.removeChannel(channel)

// Query invalidation
queryClient.invalidateQueries({ queryKey: ['resource', id] })

// Optimistic update
queryClient.setQueryData(['resource', id], newData)
```
