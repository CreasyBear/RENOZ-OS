/**
 * Order Detail Container
 *
 * Handles data fetching, mutations, and state management for order detail view.
 * Implements render props pattern for flexible header/action composition.
 *
 * @source order from useOrderWithCustomer hook
 * @source activities from useUnifiedActivities hook
 *
 * @see STANDARDS.md - Container/Presenter pattern
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Edit,
  Copy,
  Printer,
  MoreHorizontal,
  XCircle,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ErrorState } from '@/components/shared/error-state';
import { cn } from '@/lib/utils';
import { toastSuccess, toastError } from '@/hooks';
import {
  useOrderWithCustomer,
  useOrderDetailStatusUpdate,
  useDeleteOrderWithConfirmation,
  useDuplicateOrderById,
} from '@/hooks/orders/use-order-detail';
import { useUnifiedActivities } from '@/hooks/activities';
import type { OrderStatus } from '@/lib/schemas/orders';
import { OrderDetailView } from '../views/order-detail-view';
import { ORDER_STATUS_DETAIL_CONFIG } from '../order-status-config';

// ============================================================================
// TYPES
// ============================================================================

export interface OrderDetailContainerRenderProps {
  /** Header title element */
  headerTitle: React.ReactNode;
  /** Header action buttons */
  headerActions: React.ReactNode;
  /** Main content */
  content: React.ReactNode;
}

export interface OrderDetailContainerProps {
  /** Order ID to display */
  orderId: string;
  /** Callback when user navigates back */
  onBack?: () => void;
  /** Callback when user clicks edit */
  onEdit?: () => void;
  /** Callback after successful duplication */
  onDuplicate?: (newOrderId: string) => void;
  /** Render props pattern for layout composition */
  children?: (props: OrderDetailContainerRenderProps) => React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// STATUS WORKFLOW
// ============================================================================

const STATUS_NEXT_ACTIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['picking', 'cancelled'],
  picking: ['picked', 'cancelled'],
  picked: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

// ============================================================================
// LOADING SKELETON
// ============================================================================

function OrderDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OrderDetailContainer({
  orderId,
  onBack,
  onEdit,
  onDuplicate,
  children,
  className,
}: OrderDetailContainerProps) {
  // ─────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('overview');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showMetaPanel, setShowMetaPanel] = useState(true);

  // ─────────────────────────────────────────────────────────────────────────
  // Panel Toggle Handler
  // ─────────────────────────────────────────────────────────────────────────
  const handleToggleMetaPanel = useCallback(() => {
    setShowMetaPanel((prev) => !prev);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────────────────
  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useOrderWithCustomer({ orderId });

  const {
    activities,
    isLoading: activitiesLoading,
    error: activitiesError,
  } = useUnifiedActivities({
    entityType: 'order',
    entityId: orderId,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────────────────────────────────
  const statusMutation = useOrderDetailStatusUpdate(orderId);
  const deleteMutation = useDeleteOrderWithConfirmation(orderId);
  const duplicateMutation = useDuplicateOrderById(orderId);

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleStatusChange = useCallback(
    async (status: OrderStatus) => {
      try {
        await statusMutation.mutateAsync({ status });
        toastSuccess('Order status updated');
      } catch {
        toastError('Failed to update status');
      }
    },
    [statusMutation]
  );

  const handleDuplicate = useCallback(async () => {
    try {
      const result = await duplicateMutation.mutateAsync();
      toastSuccess(`Order duplicated as ${result.orderNumber}`);
      onDuplicate?.(result.id);
    } catch {
      toastError('Failed to duplicate order');
    }
  }, [duplicateMutation, onDuplicate]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteMutation.mutateAsync();
      toastSuccess('Order deleted');
      setDeleteDialogOpen(false);
      onBack?.();
    } catch {
      toastError('Failed to delete order');
    }
  }, [deleteMutation, onBack]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Derived State
  // ─────────────────────────────────────────────────────────────────────────
  const statusConfig = useMemo(() => {
    if (!order) return null;
    return ORDER_STATUS_DETAIL_CONFIG[order.status as OrderStatus] ?? ORDER_STATUS_DETAIL_CONFIG.draft;
  }, [order]);

  const nextActions = useMemo(() => {
    if (!order) return [];
    return STATUS_NEXT_ACTIONS[order.status as OrderStatus] ?? [];
  }, [order]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Loading
  // ─────────────────────────────────────────────────────────────────────────
  if (isLoading) {
    const loadingContent = <OrderDetailSkeleton />;
    if (children) {
      return (
        <>
          {children({
            headerTitle: <Skeleton className="h-8 w-48" />,
            headerActions: <Skeleton className="h-10 w-32" />,
            content: loadingContent,
          })}
        </>
      );
    }
    return loadingContent;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Error
  // ─────────────────────────────────────────────────────────────────────────
  if (error || !order) {
    const errorContent = (
      <ErrorState
        title="Order not found"
        message="The order you're looking for doesn't exist or has been deleted."
        onRetry={() => refetch()}
        retryLabel="Try Again"
      />
    );
    if (children) {
      return (
        <>
          {children({
            headerTitle: 'Order Not Found',
            headerActions: null,
            content: errorContent,
          })}
        </>
      );
    }
    return errorContent;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Header Elements
  // ─────────────────────────────────────────────────────────────────────────
  const StatusIcon = statusConfig?.icon ?? Package;

  const headerTitle = (
    <div className="flex items-center gap-3">
      <span className="text-xl font-semibold">{order.orderNumber}</span>
      {statusConfig && (
        <Badge className={cn('gap-1', statusConfig.color)}>
          <StatusIcon className="h-3 w-3" />
          {statusConfig.label}
        </Badge>
      )}
    </div>
  );

  const headerActions = (
    <div className="flex items-center gap-2">
      {/* Status Actions */}
      {nextActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={statusMutation.isPending}>
              {statusMutation.isPending ? 'Updating...' : 'Update Status'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {nextActions.map((nextStatus) => (
              <DropdownMenuItem
                key={nextStatus}
                onClick={() => handleStatusChange(nextStatus)}
              >
                Mark as {ORDER_STATUS_DETAIL_CONFIG[nextStatus].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* More Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onEdit && order.status === 'draft' && (
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Order
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={handleDuplicate}
            disabled={duplicateMutation.isPending}
          >
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </DropdownMenuItem>
          {order.status === 'draft' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Main Content
  // ─────────────────────────────────────────────────────────────────────────
  const content = (
    <>
      <OrderDetailView
        order={order}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showMetaPanel={showMetaPanel}
        onToggleMetaPanel={handleToggleMetaPanel}
        activities={activities}
        activitiesLoading={activitiesLoading}
        activitiesError={activitiesError}
        className={className}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order {order.orderNumber}? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render: With Render Props or Default
  // ─────────────────────────────────────────────────────────────────────────
  if (children) {
    return <>{children({ headerTitle, headerActions, content })}</>;
  }

  // Default rendering (standalone usage)
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        {headerTitle}
        {headerActions}
      </div>
      {content}
    </div>
  );
}

export default OrderDetailContainer;
