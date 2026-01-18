# Realtime Subscription Hooks

React hooks for subscribing to Supabase Realtime broadcast channels with TanStack Query integration.

## Overview

These hooks provide live updates from the database using Supabase Realtime's **Broadcast** pattern. All channels are org-scoped for multi-tenant isolation (e.g., `orders:{organization_id}`).

## Available Hooks

### Generic Hook

```typescript
import { useRealtimeBroadcast } from '@/hooks/realtime'

const { status, reconnect, disconnect } = useRealtimeBroadcast({
  channel: `custom:${organizationId}`,
  event: 'db_changes',
  queryKeys: [['myData']],
  onUpdate: (payload) => console.log('Update:', payload),
})
```

### Domain-Specific Hooks

```typescript
import {
  useOrdersRealtime,
  usePipelineRealtime,
  useInventoryRealtime,
} from '@/hooks/realtime'

// Orders channel
const { status } = useOrdersRealtime({
  organizationId,
  notifyOnNew: true,
  notifyOnStatusChange: true,
})

// Pipeline channel
const { status } = usePipelineRealtime({
  organizationId,
  notifyOnStageChange: true,
})

// Inventory channel with low stock alerts
const { status } = useInventoryRealtime({
  organizationId,
  notifyOnLowStock: true,
  onLowStockAlert: (payload) => {
    // Handle low stock alert
  },
})
```

## Features

### Automatic Query Invalidation

When updates are received, the hooks automatically invalidate relevant TanStack Query caches:

```typescript
// Orders hook invalidates:
['orders'], ['orders', 'list'], ['dashboard', 'orders'], etc.

// Pipeline hook invalidates:
['pipeline'], ['opportunities'], ['deals'], ['quotes'], etc.

// Inventory hook invalidates:
['inventory'], ['inventory', 'alerts'], ['products', 'stock'], etc.
```

### Toast Notifications

Hooks can optionally show toast notifications for events:

```typescript
// New order notification
useOrdersRealtime({ organizationId, notifyOnNew: true })

// Stage change notifications with special handling for won/lost
usePipelineRealtime({ organizationId, notifyOnStageChange: true })

// Low stock alerts
useInventoryRealtime({ organizationId, notifyOnLowStock: true })
```

### Exponential Backoff Reconnection

On connection errors, hooks automatically reconnect with exponential backoff:

- Base delay: 1 second
- Max delay: 30 seconds
- Max attempts: 5 (configurable)
- Jitter: ±20% to prevent thundering herd

```typescript
useRealtimeBroadcast({
  channel: `orders:${organizationId}`,
  queryKeys: [['orders']],
  autoReconnect: true,
  maxReconnectAttempts: 10,
})
```

### Connection Status

All hooks expose connection status for UI indicators:

```typescript
const { status, reconnectAttempts } = useOrdersRealtime({ organizationId })

// status: 'connecting' | 'connected' | 'disconnected' | 'error'

// Use with status indicator
import { getStatusColor, getStatusLabel } from '@/hooks/realtime'

<div className={getStatusColor(status)} />
<span>{getStatusLabel(status)}</span>
```

## Channel Architecture

### Broadcast Pattern

Unlike `postgres_changes` which uses logical replication, these hooks use **Broadcast** channels that receive messages from database triggers:

```
Database Trigger → realtime.broadcast_changes() → Broadcast Channel → React Hook
```

Benefits:
- Org-scoped channels for multi-tenant isolation
- Custom payload shaping (exclude sensitive data)
- Works with RLS policies
- Lower database load

### Channel Names

| Domain | Channel Pattern |
|--------|-----------------|
| Orders | `orders:{organization_id}` |
| Pipeline | `pipeline:{organization_id}` |
| Inventory | `inventory:{organization_id}` |

## Payload Types

```typescript
interface BroadcastPayload<T> {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: T
  old_record?: Partial<T>
  alert?: boolean  // Inventory-specific
}

// Order payload
interface OrderRealtimePayload {
  id: string
  order_number: string
  status: string
  payment_status: string
  customer_id: string
  total: number
  updated_at: string
}

// Pipeline payload
interface PipelineRealtimePayload {
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

// Inventory payload
interface InventoryRealtimePayload {
  id: string
  product_id: string
  location_id: string
  quantity: number
  reserved_quantity: number
  reorder_point: number
  reorder_quantity: number
  updated_at: string
}
```

## Example: Dashboard with Live Updates

```tsx
function Dashboard() {
  const { organizationId } = useCurrentOrg()

  // Subscribe to all channels
  const { status: ordersStatus } = useOrdersRealtime({
    organizationId,
    notifyOnNew: true,
  })

  const { status: pipelineStatus } = usePipelineRealtime({
    organizationId,
    notifyOnStageChange: true,
  })

  const { status: inventoryStatus } = useInventoryRealtime({
    organizationId,
    notifyOnLowStock: true,
  })

  // Queries will auto-refresh on updates
  const { data: orders } = useQuery({ queryKey: ['orders'] })
  const { data: deals } = useQuery({ queryKey: ['pipeline'] })
  const { data: inventory } = useQuery({ queryKey: ['inventory'] })

  return (
    <div>
      <RealtimeIndicator
        statuses={[ordersStatus, pipelineStatus, inventoryStatus]}
      />
      {/* Dashboard content */}
    </div>
  )
}
```

## Error Handling

```typescript
const { status, reconnect, reconnectAttempts } = useOrdersRealtime({
  organizationId,
})

// Show reconnection status
{status === 'error' && (
  <Alert>
    Connection lost. Attempt {reconnectAttempts}/5.
    <Button onClick={reconnect}>Retry Now</Button>
  </Alert>
)}
```

## Migration from postgres_changes

If you're migrating from `useRealtimeSubscription` (postgres_changes):

**Before:**
```typescript
useRealtimeSubscription({
  channel: 'orders-realtime',
  table: 'orders',
  filter: `organization_id=eq.${orgId}`,
  queryKeys: [['orders']],
})
```

**After:**
```typescript
useOrdersRealtime({
  organizationId: orgId,
  // Org-scoping is automatic
})
```

Key differences:
1. Channel names are auto-generated with org scope
2. No need for filter - org isolation is built-in
3. Uses Broadcast instead of postgres_changes
4. Includes exponential backoff reconnection
