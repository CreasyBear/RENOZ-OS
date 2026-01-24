# Fulfillment Kanban API Documentation

## Overview

The Fulfillment Kanban is a comprehensive order management system that provides real-time visibility and control over the order fulfillment workflow. This document outlines the complete API surface for developers integrating with or extending the fulfillment system.

## Core Architecture

### Data Flow
```
Server Functions → React Hooks → UI Components → User Interactions
     ↓              ↓              ↓              ↓
listFulfillmentKanbanOrders → useFulfillmentKanban → FulfillmentDashboard → Drag & Drop
updateOrderStatus → useUpdateFulfillmentOrderStatus → FulfillmentBoard → Bulk Operations
createDataExport → useFulfillmentKanbanExport → FulfillmentHeader → Export Actions
```

### Real-time Updates
- **Broadcast Channel**: `orders:{organizationId}`
- **Polling Interval**: 30 seconds (with exponential backoff)
- **Conflict Resolution**: Optimistic updates with rollback
- **Connection Recovery**: Automatic reconnection with user feedback

## Server Functions

### `listFulfillmentKanbanOrders`

Retrieves orders grouped by fulfillment workflow stages.

**Endpoint**: `GET /api/orders/fulfillment-kanban`

**Input Schema**:
```typescript
{
  customerId?: string;    // UUID of customer to filter by
  dateFrom?: Date;        // Start date for filtering
  dateTo?: Date;          // End date for filtering
  search?: string;        // Text search across order numbers and notes
}
```

**Response Schema**:
```typescript
interface FulfillmentKanbanResult {
  stages: {
    to_allocate: FulfillmentKanbanOrder[];
    to_pick: FulfillmentKanbanOrder[];
    picking: FulfillmentKanbanOrder[];
    to_ship: FulfillmentKanbanOrder[];
    shipped_today: FulfillmentKanbanOrder[];
  };
  total: number;
  filters: {
    customerId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    search?: string;
  };
}

interface FulfillmentKanbanOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  orderDate: Date;
  dueDate?: Date;
  shippedDate?: Date;
  total: number;
  metadata: OrderMetadata;
  createdAt: Date;
  updatedAt: Date;
  itemCount: number;  // Count from order_line_items
}
```

**Workflow Stage Mapping**:
- `confirmed` → `to_allocate`
- `picking` → `picking` (if status = 'picking')
- `picked` → `to_ship`
- `shipped` → `shipped_today` (if shipped today)

### `updateOrderStatus`

Updates an order's status with optional metadata changes.

**Endpoint**: `PATCH /api/orders/{id}/status`

**Input Schema**:
```typescript
{
  status: OrderStatus;
  notes?: string;
  metadata?: Partial<OrderMetadata>;  // For priority/assignment changes
}
```

### `bulkUpdateOrderStatus`

Updates multiple orders' status in a single transaction.

**Endpoint**: `PATCH /api/orders/bulk/status`

**Input Schema**:
```typescript
{
  orderIds: string[];
  status: OrderStatus;
  notes?: string;
}
```

### `createDataExport`

Creates an export job for fulfillment data.

**Endpoint**: `POST /api/settings/data-exports`

**Input Schema**:
```typescript
{
  entities: ['orders'];
  format: 'csv' | 'json' | 'xlsx';
  filters: {
    customerId?: string;
    status?: string;
    priority?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    status_in?: string[];  // Always includes fulfillment workflow statuses
  };
  includedFields: string[];  // Order fields to export
}
```

## React Hooks

### `useFulfillmentKanban`

Main hook for kanban data management with real-time updates.

**Parameters**:
```typescript
interface UseFulfillmentKanbanOptions {
  customerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  enabled?: boolean;  // Default: true
}
```

**Return Value**:
```typescript
{
  data: FulfillmentKanbanResult | null;
  isLoading: boolean;
  error: Error | null;
  realtimeStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  reconnectAttempts: number;
  reconnect: () => void;
}
```

**Real-time Features**:
- Automatic query invalidation on order changes
- Connection status monitoring
- Manual reconnection capability
- Exponential backoff retry logic

### `useUpdateFulfillmentOrderStatus`

Handles individual order status updates with optimistic UI.

**Parameters**:
```typescript
interface UseUpdateFulfillmentOrderStatusOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}
```

**Return Value**:
```typescript
{
  mutateAsync: (input: {
    orderId: string;
    status: OrderStatus;
    notes?: string;
  }) => Promise<void>;
  mutate: (input: { ... }) => void;  // For optimistic updates
  isPending: boolean;
  error: Error | null;
}
```

### `useBulkUpdateFulfillmentOrders`

Handles bulk order operations.

**Return Value**:
```typescript
{
  mutateAsync: (input: {
    orderIds: string[];
    status: OrderStatus;
    notes?: string;
  }) => Promise<void>;
  isPending: boolean;
  error: Error | null;
}
```

### `useFulfillmentKanbanExport`

Manages data export operations with filter awareness.

**Return Value**:
```typescript
{
  exportData: (options: {
    filters: FulfillmentFiltersState;
    format?: 'csv' | 'json' | 'xlsx';
  }) => Promise<ExportJob>;
  isExporting: boolean;
  error: Error | null;
}
```

### `useAssignees`

Fetches available users for order assignment.

**Return Value**:
```typescript
{
  assignees: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
  }>;
  isLoading: boolean;
  error: Error | null;
}
```

**Filtering**: Only returns users with roles: `admin`, `manager`, `operations`, `sales`

## UI Components

### `FulfillmentDashboard`

Main kanban board component with full workflow management.

**Props**:
```typescript
interface FulfillmentDashboardProps {
  orders?: FulfillmentOrdersData;
  shipments?: FulfillmentShipmentsData;
  isLoadingOrders?: boolean;
  isLoadingShipments?: boolean;
  exportFilters?: FulfillmentFiltersState;  // For export functionality
  onViewOrder?: (orderId: string) => void;
  onAddOrder?: (stage?: string) => void;
  onColumnAction?: (stage: string, action: string) => void;
  onOrderMove?: (orderId: string, fromStage: string, toStage: string) => void;
  onBulkAllocate?: (orderIds: string[]) => void;
  onBulkShip?: (orderIds: string[]) => void;
  onCreateOrder?: (customerId: string, targetStage: string, notes?: string) => void;
  availableCustomers?: Array<{ id: string; name: string }>;
  realtimeStatus?: 'connecting' | 'connected' | 'disconnected' | 'error';
  reconnectAttempts?: number;
  onReconnect?: () => void;
  activeUserCount?: number;
}
```

### `FulfillmentBoard`

Core kanban board with drag-and-drop functionality.

**Key Features**:
- 5-column layout (To Allocate, To Pick, Picking, To Ship, Shipped Today)
- Real-time drag feedback
- Accessibility-compliant keyboard navigation
- Screen reader announcements
- Bulk selection and operations

### `FulfillmentColumn`

Individual workflow stage columns.

**Features**:
- Virtual scrolling for >50 orders
- Empty state with "Add order" actions
- Bulk selection checkboxes
- Column-specific action buttons
- Responsive design with mobile optimization

### `FulfillmentCard`

Individual order cards with comprehensive information.

**Features**:
- Priority indicators (normal/high/urgent)
- Customer and order details
- Progress indicators for picking status
- Assignee information
- Due date with overdue styling
- Drag handles with accessibility labels
- Context menu for quick actions

## Data Models

### Order Status Workflow

```typescript
type FulfillmentStage =
  | 'to_allocate'    // Confirmed orders awaiting stock allocation
  | 'to_pick'        // Orders ready for picking (from allocation)
  | 'picking'        // Orders currently being picked
  | 'to_ship'        // Picked orders ready for shipping
  | 'shipped_today'  // Orders shipped today

// Status to Stage Mapping
const STATUS_TO_STAGE: Record<OrderStatus, FulfillmentStage> = {
  'draft': null,           // Not shown in kanban
  'confirmed': 'to_allocate',
  'picking': 'picking',    // Assumes status tracks workflow
  'picked': 'to_ship',
  'shipped': 'shipped_today', // Only if shippedDate is today
  'delivered': null,       // Completed, not in active workflow
  'cancelled': null,       // Completed, not in active workflow
}
```

### Priority System

```typescript
type OrderPriority = 'normal' | 'high' | 'urgent';

interface PriorityConfig {
  normal: { label: 'Normal'; bg: string; text: string };
  high: { label: 'High'; bg: string; text: string };
  urgent: { label: 'Urgent'; bg: string; text: string };
}
```

### Assignee System

```typescript
interface OrderAssignee {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'operations' | 'sales';
  avatar?: string;
}

// Stored in order metadata
interface OrderMetadata {
  assignedTo?: string;  // User ID
  priority?: OrderPriority;
  // ... other metadata
}
```

## Error Handling

### Client-Side Errors
- **Network failures**: Automatic retry with exponential backoff
- **Validation errors**: Inline form validation with user feedback
- **Optimistic update failures**: Automatic rollback with toast notifications
- **Real-time disconnection**: Visual indicators with manual reconnect option

### Server-Side Errors
- **Authentication errors**: Redirect to login
- **Permission errors**: Show access denied messages
- **Validation errors**: Return detailed field-level error messages
- **System errors**: Log to monitoring service with context

## Performance Optimizations

### Rendering
- **React.memo** on all major components
- **Virtual scrolling** for columns with >50 orders
- **Efficient re-renders** with proper dependency arrays
- **Bundle splitting** with dynamic imports for dialogs

### Data Fetching
- **React.cache()** on server functions for automatic deduplication
- **Optimistic updates** for immediate UI feedback
- **Background polling** every 30 seconds for real-time sync
- **Query invalidation** on data changes

### Memory Management
- **Automatic cleanup** of event listeners and timers
- **Efficient data structures** with Map/Set for lookups
- **Garbage collection** of expired real-time subscriptions

## Accessibility (WCAG 2.1 AA)

### Keyboard Navigation
- **Tab order**: Logical navigation through all interactive elements
- **Enter/Space**: Activate buttons and cards
- **Arrow keys**: Navigate between cards in drag mode
- **Escape**: Cancel drag operations and close menus

### Screen Reader Support
- **ARIA labels**: Comprehensive labeling of interactive elements
- **Live regions**: Real-time announcements for status changes
- **Focus management**: Proper focus restoration after actions
- **Semantic HTML**: Correct heading hierarchy and landmark roles

### Touch and Mobile
- **Touch targets**: Minimum 44px for all interactive elements
- **Gesture support**: Drag-and-drop with touch feedback
- **Responsive design**: Optimized layouts for mobile devices
- **High contrast**: Support for system accessibility preferences

## Monitoring and Analytics

### Performance Metrics
- **Render times**: <16ms for smooth 60fps experience
- **Bundle size**: Lazy-loaded components reduce initial load
- **Memory usage**: Efficient virtualization prevents memory leaks
- **Network requests**: Cached responses reduce server load

### Error Tracking
- **Client errors**: Sentry integration with context
- **Server errors**: Structured logging with correlation IDs
- **Real-time issues**: Connection monitoring and recovery tracking
- **Performance issues**: Slow render detection and alerting

### Business Metrics
- **Order velocity**: Time to move through workflow stages
- **User activity**: Real-time collaboration usage
- **Error rates**: System reliability monitoring
- **Export usage**: Data portability tracking

## Integration Points

### Existing Systems
- **Customer management**: Customer data and relationships
- **Product inventory**: Stock levels and availability
- **Financial system**: Order totals and payment status
- **Shipping system**: Tracking numbers and delivery status
- **User management**: Assignee selection and permissions

### Extension Points
- **Custom workflows**: Additional stages or branching logic
- **Automated actions**: Triggers based on stage transitions
- **Custom fields**: Additional order metadata
- **Integration APIs**: Webhooks for external system updates
- **Custom exports**: Specialized data export formats

## Migration Guide

### From Previous Implementation
1. **Data migration**: Ensure all orders have proper metadata
2. **User training**: Kanban workflow vs. previous interface
3. **Feature parity**: Verify all existing functionality is preserved
4. **Performance validation**: Confirm improved load times
5. **Accessibility audit**: Ensure WCAG 2.1 AA compliance

### Deployment Strategy
1. **Feature flag**: Deploy behind feature flag for gradual rollout
2. **A/B testing**: Compare user adoption and performance
3. **Rollback plan**: Ability to revert to previous implementation
4. **Monitoring**: Real-time performance and error monitoring
5. **User feedback**: Collection and incorporation of user feedback

This API provides a complete foundation for building comprehensive order fulfillment workflows with real-time collaboration, accessibility compliance, and enterprise-grade reliability.