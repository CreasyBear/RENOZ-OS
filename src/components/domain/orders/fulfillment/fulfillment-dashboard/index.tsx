/**
 * FulfillmentDashboard Component
 *
 * Kanban board for order fulfillment workflow.
 * Shows orders across 5 stages: To Allocate, To Pick, Picking, To Ship, Shipped Today.
 *
 * Features:
 * - Kanban board with drag-and-drop
 * - Real-time order movement between stages
 * - Bulk operations (allocate, print pick lists, ship)
 * - Summary cards with key metrics
 * - 30s polling for live updates
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-FULFILLMENT-DASHBOARD)
 */

import { memo, useState, useCallback, useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { StatCard } from './components/fulfillment-stats';
import { FulfillmentBoard } from './fulfillment-board';
import { type FulfillmentFiltersState } from './fulfillment-filters';
import { FulfillmentHeader } from './fulfillment-header';
import type { InlineEditFormData } from '../../cards/order-card-inline-edit.schema';
import { isOverdue, type FulfillmentStats } from './utils';
import type { FulfillmentOrder } from './fulfillment-card';
import { Package, Truck } from 'lucide-react';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface FulfillmentOrderSummary {
  id: string;
  orderNumber: string;
  customer: { name: string };
  customerId?: string;
  status: string;
  total: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  orderDate?: Date | string | null;
  dueDate?: Date;
  itemCount: number;
}

export interface FulfillmentOrdersData {
  orders: FulfillmentOrderSummary[];
  total: number;
}

export interface FulfillmentShipment {
  id: string;
  orderId: string;
  trackingNumber?: string;
  carrier?: string;
  status: string;
  shippedAt?: Date;
  estimatedDelivery?: Date;
}

export interface FulfillmentShipmentsData {
  shipments: FulfillmentShipment[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FulfillmentDashboardProps {
  orders?: FulfillmentOrdersData;
  shipments?: FulfillmentShipmentsData;
  isLoadingOrders?: boolean;
  isLoadingShipments?: boolean;
  exportFilters?: FulfillmentFiltersState;
  onExport?: (filters: FulfillmentFiltersState) => Promise<void>;
  isExporting?: boolean;
  availableAssignees?: Array<{ id: string; name: string }>;
  inlineEditForm?: UseFormReturn<InlineEditFormData>;
  inlineEditSubmitting?: boolean;
  onViewOrder?: (orderId: string) => void;
  onAddOrder?: (stage?: string) => void;
  onColumnAction?: (stage: string, action: string) => void;
  onOrderMove?: (orderId: string, fromStage: string, toStage: string) => void;
  onBulkAllocate?: (orderIds: string[]) => void;
  onBulkShip?: (orderIds: string[]) => void;
  onEditOrder?: (orderId: string) => void;
  onSaveOrderEdit?: (
    orderId: string,
    data: { priority: string; orderNumber: string; dueDate?: Date }
  ) => Promise<void>;
  onDuplicateOrder?: (orderId: string) => void;
  onDeleteOrder?: (orderId: string) => void;
  onChangeOrderPriority?: (orderId: string, priority: string) => void;
  onAssignOrder?: (orderId: string, assigneeId: string) => void;
  onMoveOrderToStage?: (orderId: string, stage: string) => void;
  editingOrderId?: string | null;
  onStartEdit?: (orderId: string) => void;
  onCancelEdit?: () => void;
  availableCustomers?: Array<{ id: string; name: string }>;
  realtimeStatus?: 'connecting' | 'connected' | 'disconnected' | 'error';
  reconnectAttempts?: number;
  onReconnect?: () => void;
  className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const FulfillmentDashboard = memo(function FulfillmentDashboard({
  orders,
  shipments,
  isLoadingOrders,
  isLoadingShipments,
  exportFilters,
  onExport,
  isExporting = false,
  availableAssignees = [],
  inlineEditForm,
  inlineEditSubmitting,
  onViewOrder,
  onAddOrder,
  onColumnAction,
  onOrderMove,
  onBulkAllocate,
  onBulkShip,
  onEditOrder,
  onSaveOrderEdit,
  onDuplicateOrder,
  onDeleteOrder,
  onChangeOrderPriority,
  onAssignOrder,
  onMoveOrderToStage,
  editingOrderId,
  onStartEdit,
  onCancelEdit,
  availableCustomers = [],
  realtimeStatus = 'connecting',
  reconnectAttempts = 0,
  onReconnect,
  className,
}: FulfillmentDashboardProps) {
  type OrderMetadata = {
    priority?: 'normal' | 'high' | 'urgent';
    assignedTo?: string;
    labels?: Array<{ id: string; name: string; color: string }>;
    comments?: number;
    attachments?: number;
    links?: number;
  };

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState<FulfillmentFiltersState>({
    priority: 'all',
    status: 'all',
    customerId: 'all',
    dateRange: 'all',
    searchQuery: '',
  });
  const [sortBy, setSortBy] = useState<string>('priority');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Data comes from props

  // Group orders by fulfillment stage with filtering
  const ordersByStage = useMemo(() => {
    const orderList = orders?.orders ?? [];
    const grouped: Record<string, FulfillmentOrder[]> = {
      to_allocate: [],
      to_pick: [],
      picking: [],
      to_ship: [],
      shipped_today: [],
    };

    // Map order statuses to kanban stages
    const statusToStage: Record<string, string> = {
      confirmed: 'to_allocate', // Confirmed orders waiting for stock allocation
      picking: 'picking', // Orders currently being picked
      picked: 'to_ship', // Picked orders ready to ship
      shipped: 'shipped_today', // Orders shipped today today
    };

    orderList.forEach((order) => {
      const metadata = (order.metadata ?? {}) as OrderMetadata;
      const searchValue = filters.searchQuery.trim().toLowerCase();

      // Apply filters
      if (filters.priority !== 'all' && metadata.priority !== filters.priority) return;
      if (filters.status !== 'all' && order.status !== filters.status) return;
      if (filters.customerId !== 'all' && order.customerId !== filters.customerId) return;
      if (
        searchValue &&
        !order.orderNumber.toLowerCase().includes(searchValue) &&
        !order.customer?.name?.toLowerCase().includes(searchValue)
      )
        return;

      // Apply date filter if set
      if (dateFilter) {
        const dateValue = order.dueDate || order.orderDate;
        if (!dateValue) return;
        const orderDate = new Date(dateValue);
        if (orderDate.toDateString() !== dateFilter.toDateString()) return;
      }

      const stage = statusToStage[order.status] || 'to_allocate';
      if (grouped[stage]) {
        // Add progress for orders in picking stage
        const totalItems = order.itemCount || 0;
        const progress =
          stage === 'picking'
            ? {
                completed: totalItems > 0 ? Math.max(1, Math.floor(totalItems / 2)) : 0,
                total: totalItems || 5,
              }
            : undefined;

        // Add assigned user from metadata if available
        const assignedUserId = metadata.assignedTo;
        const assignedTo = assignedUserId
          ? availableAssignees.find((a) => a.id === assignedUserId)
          : undefined;

        const status = order.status as FulfillmentOrder['status'];
        const priority = metadata.priority ?? 'normal';

        grouped[stage].push({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customer?.name || 'Unknown Customer',
          itemCount: order.itemCount || 0,
          total: order.total || 0,
          requiredDate: order.dueDate ? new Date(order.dueDate).toISOString() : null,
          priority,
          status,
          progress,
          assignedTo,
          metadata: {
            comments: metadata.comments ?? 0,
            attachments: metadata.attachments ?? 0,
            links: metadata.links ?? 0,
            labels: metadata.labels ?? [],
          },
          createdAt: order.createdAt,
        });
      }
    });

    // Apply sorting to each stage
    Object.keys(grouped).forEach((stage) => {
      grouped[stage].sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
          case 'priority': {
            const priorityOrder = { urgent: 3, high: 2, normal: 1 };
            comparison = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
            break;
          }
          case 'date':
            comparison =
              new Date(a.requiredDate || '').getTime() - new Date(b.requiredDate || '').getTime();
            break;
          case 'value':
            comparison = b.total - a.total;
            break;
          case 'customer':
            comparison = a.customerName.localeCompare(b.customerName);
            break;
          default:
            comparison = 0;
        }

        return sortDirection === 'desc' ? comparison : -comparison;
      });
    });

    return grouped;
  }, [orders, filters, dateFilter, sortBy, sortDirection, availableAssignees]);

  // Calculate stats
  const stats: FulfillmentStats = useMemo(() => {
    const orderList: FulfillmentOrdersData['orders'] = orders?.orders ?? [];
    return {
      toPick: orderList.filter((o) => o.status === 'confirmed').length,
      readyToShip: orderList.filter((o) => o.status === 'picked').length,
      inTransit: shipments?.total ?? 0,
      overdue: orderList.filter(
        (o) => isOverdue(o.createdAt) && ['confirmed', 'picking', 'picked'].includes(o.status)
      ).length,
    };
  }, [orders, shipments]);

  // Handlers
  const handleOrderMove = useCallback(
    async (orderId: string, fromStage: string, toStage: string) => {
      await onOrderMove?.(orderId, fromStage, toStage);
    },
    [onOrderMove]
  );

  const handleBulkAllocate = useCallback(
    async (orderIds: string[]) => {
      await onBulkAllocate?.(orderIds);
    },
    [onBulkAllocate]
  );

  const handleBulkShip = useCallback(
    async (orderIds: string[]) => {
      await onBulkShip?.(orderIds);
    },
    [onBulkShip]
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Refresh is handled by the route level - just update the timestamp
    setLastUpdate(new Date());
    setIsRefreshing(false);
  }, []);

  const handleSort = useCallback((newSortBy: string, direction: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortDirection(direction);
  }, []);

  const handleDateFilter = useCallback((date: Date | undefined) => {
    setDateFilter(date);
  }, []);

  const handleImport = useCallback(() => {
    // TODO: Implement import functionality
    logger.info('Import orders functionality triggered', {
      domain: 'fulfillment-kanban',
    });
  }, []);

  const handleExport = useCallback(async () => {
    const filtersToExport = exportFilters || filters;
    await onExport?.(filtersToExport);
  }, [exportFilters, filters, onExport]);

  const handleAddOrder = useCallback(
    (stage?: string) => {
      onAddOrder?.(stage);
    },
    [onAddOrder]
  );

  const isLoading = isLoadingOrders || isLoadingShipments;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Advanced Header */}
      <FulfillmentHeader
        filters={filters}
        onFiltersChange={setFilters}
        availableCustomers={availableCustomers}
        realtimeStatus={realtimeStatus}
        reconnectAttempts={reconnectAttempts}
        onReconnect={onReconnect}
        onSort={handleSort}
        onDateFilter={handleDateFilter}
        onImport={handleImport}
        onExport={handleExport}
        onAddOrder={handleAddOrder as (stage?: string) => void}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        isExporting={isExporting}
        lastUpdate={lastUpdate}
      />

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="To Allocate"
          value={stats.toPick}
          subtitle="Awaiting stock allocation"
          icon={<Package className="h-5 w-5" />}
          variant="info"
          loading={isLoading}
        />
        <StatCard
          title="To Pick"
          value={ordersByStage.to_pick?.length || 0}
          subtitle="Ready for picking"
          icon={<Package className="h-5 w-5" />}
          variant="warning"
          loading={isLoading}
        />
        <StatCard
          title="Picking"
          value={ordersByStage.picking?.length || 0}
          subtitle="Currently being picked"
          icon={<Truck className="h-5 w-5" />}
          variant="default"
          loading={isLoading}
        />
        <StatCard
          title="Ready to Ship"
          value={stats.readyToShip}
          subtitle="Packed and waiting"
          icon={<Truck className="h-5 w-5" />}
          variant="success"
          loading={isLoading}
        />
      </div>

      {/* Kanban Board */}
      <FulfillmentBoard
        ordersByStage={ordersByStage}
        onOrderMove={handleOrderMove}
        onViewOrder={onViewOrder || (() => {})}
        onBulkAllocate={handleBulkAllocate}
        onBulkShip={handleBulkShip}
        onAddOrder={onAddOrder}
        onColumnAction={onColumnAction}
        availableAssignees={availableAssignees}
        onEditOrder={onEditOrder}
        onSaveOrderEdit={onSaveOrderEdit}
        onDuplicateOrder={onDuplicateOrder}
        onDeleteOrder={onDeleteOrder}
        onChangeOrderPriority={onChangeOrderPriority}
        onAssignOrder={onAssignOrder}
        onMoveOrderToStage={onMoveOrderToStage}
        editingOrderId={editingOrderId}
        onStartEdit={onStartEdit}
        onCancelEdit={onCancelEdit}
        inlineEditForm={inlineEditForm}
        inlineEditSubmitting={inlineEditSubmitting}
      />
    </div>
  );
});
