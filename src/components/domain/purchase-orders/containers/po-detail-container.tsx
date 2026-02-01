/**
 * Purchase Order Detail Container
 *
 * Handles data fetching, mutations, and state management for PO detail view.
 * Implements render props pattern for flexible header/action composition.
 *
 * @source po from usePurchaseOrder hook
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
  Send,
  CheckCircle,
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
  usePurchaseOrder,
  useDeletePurchaseOrder,
  useSubmitForApproval,
  useApprovePurchaseOrder,
  useRejectPurchaseOrder,
  useMarkAsOrdered,
  useCancelPurchaseOrder,
} from '@/hooks/suppliers';
import { useUnifiedActivities } from '@/hooks/activities';
import type { PurchaseOrderStatus } from '@/lib/schemas/purchase-orders';
import { PODetailView, type PurchaseOrderWithDetails } from '../views/po-detail-view';
import { PO_STATUS_CONFIG, canEditPO, canDeletePO } from '../po-status-config';

// ============================================================================
// TYPES
// ============================================================================

export interface PODetailContainerRenderProps {
  /** Header title element */
  headerTitle: React.ReactNode;
  /** Header action buttons */
  headerActions: React.ReactNode;
  /** Main content */
  content: React.ReactNode;
}

export interface PODetailContainerProps {
  /** Purchase Order ID to display */
  poId: string;
  /** Callback when user navigates back */
  onBack?: () => void;
  /** Callback when user clicks edit */
  onEdit?: () => void;
  /** Callback when receive goods action is triggered */
  onReceiveGoods?: () => void;
  /** Render props pattern for layout composition */
  children?: (props: PODetailContainerRenderProps) => React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function PODetailSkeleton() {
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

export function PODetailContainer({
  poId,
  onBack,
  onEdit,
  onReceiveGoods,
  children,
  className,
}: PODetailContainerProps) {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [activeTab, setActiveTab] = useState('overview');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [showMetaPanel, setShowMetaPanel] = useState(true);

  // ---------------------------------------------------------------------------
  // Panel Toggle Handler
  // ---------------------------------------------------------------------------
  const handleToggleMetaPanel = useCallback(() => {
    setShowMetaPanel((prev) => !prev);
  }, []);

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------
  const {
    data: po,
    isLoading,
    error,
    refetch,
  } = usePurchaseOrder(poId);

  const {
    activities,
    isLoading: activitiesLoading,
    error: activitiesError,
  } = useUnifiedActivities({
    entityType: 'purchase_order',
    entityId: poId,
  });

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------
  const deleteMutation = useDeletePurchaseOrder();
  const submitMutation = useSubmitForApproval();
  const approveMutation = useApprovePurchaseOrder();
  const rejectMutation = useRejectPurchaseOrder();
  const orderMutation = useMarkAsOrdered();
  const cancelMutation = useCancelPurchaseOrder();

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleSubmitForApproval = useCallback(async () => {
    try {
      await submitMutation.mutateAsync({ id: poId });
      toastSuccess('Purchase order submitted for approval');
    } catch {
      toastError('Failed to submit for approval');
    }
  }, [submitMutation, poId]);

  const handleApprove = useCallback(async () => {
    try {
      await approveMutation.mutateAsync({ id: poId });
      toastSuccess('Purchase order approved');
    } catch {
      toastError('Failed to approve purchase order');
    }
  }, [approveMutation, poId]);

  const handleReject = useCallback(async () => {
    try {
      await rejectMutation.mutateAsync({ id: poId, reason: 'Rejected by approver' });
      toastSuccess('Purchase order rejected');
    } catch {
      toastError('Failed to reject purchase order');
    }
  }, [rejectMutation, poId]);

  const handleMarkAsOrdered = useCallback(async () => {
    try {
      await orderMutation.mutateAsync({ id: poId });
      toastSuccess('Purchase order marked as ordered');
    } catch {
      toastError('Failed to mark as ordered');
    }
  }, [orderMutation, poId]);

  const handleCancel = useCallback(async () => {
    try {
      await cancelMutation.mutateAsync({ id: poId, reason: 'Cancelled by user' });
      toastSuccess('Purchase order cancelled');
      setCancelDialogOpen(false);
      onBack?.();
    } catch {
      toastError('Failed to cancel purchase order');
    }
  }, [cancelMutation, poId, onBack]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteMutation.mutateAsync({ id: poId });
      toastSuccess('Purchase order deleted');
      setDeleteDialogOpen(false);
      onBack?.();
    } catch {
      toastError('Failed to delete purchase order');
    }
  }, [deleteMutation, poId, onBack]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ---------------------------------------------------------------------------
  // Derived State
  // ---------------------------------------------------------------------------
  const statusConfig = useMemo(() => {
    if (!po) return null;
    return PO_STATUS_CONFIG[po.status as PurchaseOrderStatus] ?? PO_STATUS_CONFIG.draft;
  }, [po]);

  const canEdit = useMemo(() => {
    if (!po) return false;
    return canEditPO(po.status as PurchaseOrderStatus);
  }, [po]);

  const canDelete = useMemo(() => {
    if (!po) return false;
    return canDeletePO(po.status as PurchaseOrderStatus);
  }, [po]);

  const canReceive = useMemo(() => {
    if (!po) return false;
    return po.status === 'ordered' || po.status === 'partial_received';
  }, [po]);

  const canCancel = useMemo(() => {
    if (!po) return false;
    return !['received', 'closed', 'cancelled'].includes(po.status);
  }, [po]);

  // ---------------------------------------------------------------------------
  // Render: Loading
  // ---------------------------------------------------------------------------
  if (isLoading) {
    const loadingContent = <PODetailSkeleton />;
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

  // ---------------------------------------------------------------------------
  // Render: Error
  // ---------------------------------------------------------------------------
  if (error || !po) {
    const errorContent = (
      <ErrorState
        title="Purchase order not found"
        message="The purchase order you're looking for doesn't exist or has been deleted."
        onRetry={() => refetch()}
        retryLabel="Try Again"
      />
    );
    if (children) {
      return (
        <>
          {children({
            headerTitle: 'Purchase Order Not Found',
            headerActions: null,
            content: errorContent,
          })}
        </>
      );
    }
    return errorContent;
  }

  // ---------------------------------------------------------------------------
  // Transform data to match view props
  // ---------------------------------------------------------------------------
  const transformedPO: PurchaseOrderWithDetails = {
    id: po.id,
    poNumber: po.poNumber,
    supplierId: po.supplierId,
    status: po.status as PurchaseOrderStatus,
    orderDate: po.orderDate,
    requiredDate: po.requiredDate,
    expectedDeliveryDate: po.expectedDeliveryDate,
    actualDeliveryDate: po.actualDeliveryDate,
    shipToAddress: po.shipToAddress,
    billToAddress: po.billToAddress,
    subtotal: Number(po.subtotal),
    taxAmount: Number(po.taxAmount),
    shippingAmount: Number(po.shippingAmount),
    discountAmount: Number(po.discountAmount),
    totalAmount: Number(po.totalAmount),
    currency: po.currency,
    paymentTerms: po.paymentTerms,
    supplierReference: po.supplierReference,
    internalReference: po.internalReference,
    notes: po.notes,
    internalNotes: po.internalNotes,
    approvedAt: po.approvedAt ? String(po.approvedAt) : null,
    approvedBy: po.approvedBy,
    approvalNotes: po.approvalNotes,
    orderedAt: po.orderedAt ? String(po.orderedAt) : null,
    orderedBy: po.orderedBy,
    closedAt: po.closedAt ? String(po.closedAt) : null,
    closedBy: po.closedBy,
    closedReason: po.closedReason,
    version: po.version,
    createdAt: String(po.createdAt),
    updatedAt: String(po.updatedAt),
    createdBy: po.createdBy,
    supplierName: po.supplierName,
    supplierEmail: po.supplierEmail,
    supplierPhone: po.supplierPhone,
    items: po.items.map((item) => ({
      id: item.id,
      lineNumber: item.lineNumber,
      productId: item.productId,
      productName: item.productName,
      productSku: item.productSku,
      description: item.description,
      quantity: item.quantity,
      unitOfMeasure: item.unitOfMeasure,
      unitPrice: Number(item.unitPrice),
      discountPercent: item.discountPercent,
      taxRate: item.taxRate,
      lineTotal: Number(item.lineTotal),
      quantityReceived: item.quantityReceived,
      quantityRejected: item.quantityRejected,
      quantityPending: item.quantityPending,
      expectedDeliveryDate: item.expectedDeliveryDate,
      actualDeliveryDate: item.actualDeliveryDate,
      notes: item.notes,
    })),
  };

  // ---------------------------------------------------------------------------
  // Render: Header Elements
  // ---------------------------------------------------------------------------
  const StatusIcon = statusConfig?.icon ?? Package;

  const headerTitle = (
    <div className="flex items-center gap-3">
      <span className="text-xl font-semibold">{po.poNumber}</span>
      {statusConfig && (
        <Badge className={cn('gap-1')}>
          <StatusIcon className="h-3 w-3" />
          {statusConfig.label}
        </Badge>
      )}
    </div>
  );

  const isPending = submitMutation.isPending || approveMutation.isPending || orderMutation.isPending;

  const headerActions = (
    <div className="flex items-center gap-2">
      {/* Primary Action Based on Status */}
      {po.status === 'draft' && (
        <Button onClick={handleSubmitForApproval} disabled={isPending}>
          <Send className="h-4 w-4 mr-2" />
          {submitMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
        </Button>
      )}
      {po.status === 'pending_approval' && (
        <div className="flex gap-2">
          <Button onClick={handleApprove} disabled={isPending}>
            <CheckCircle className="h-4 w-4 mr-2" />
            {approveMutation.isPending ? 'Approving...' : 'Approve'}
          </Button>
          <Button variant="outline" onClick={handleReject} disabled={isPending}>
            Reject
          </Button>
        </div>
      )}
      {po.status === 'approved' && (
        <Button onClick={handleMarkAsOrdered} disabled={isPending}>
          <Send className="h-4 w-4 mr-2" />
          {orderMutation.isPending ? 'Processing...' : 'Mark as Ordered'}
        </Button>
      )}
      {canReceive && onReceiveGoods && (
        <Button onClick={onReceiveGoods}>
          <Package className="h-4 w-4 mr-2" />
          Receive Goods
        </Button>
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
          {canEdit && onEdit && (
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Order
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(po.poNumber)}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy PO Number
          </DropdownMenuItem>
          {canCancel && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setCancelDialogOpen(true)}
                className="text-amber-600"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Order
              </DropdownMenuItem>
            </>
          )}
          {canDelete && (
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

  // ---------------------------------------------------------------------------
  // Render: Main Content
  // ---------------------------------------------------------------------------
  const content = (
    <>
      <PODetailView
        po={transformedPO}
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
            <AlertDialogTitle>Delete Purchase Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete purchase order {po.poNumber}? This
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

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Purchase Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel purchase order {po.poNumber}? This
              action will mark the order as cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Order</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  // ---------------------------------------------------------------------------
  // Render: With Render Props or Default
  // ---------------------------------------------------------------------------
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

export default PODetailContainer;
