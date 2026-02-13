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
import { isPast, isBefore, addDays } from 'date-fns';
import {
  Edit,
  Copy,
  Printer,
  XCircle,
  Package,
  Send,
  CheckCircle,
  ClipboardList,
  Link2,
  PanelRight,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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
import { EntityActivityLogger } from '@/components/shared/activity';
import { EntityHeaderActions } from '@/components/shared';
import { useEntityActivityLogging } from '@/hooks/activities/use-entity-activity-logging';
import { GoodsReceiptDialog } from '../receive/goods-receipt-dialog';
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
import { useTrackView } from '@/hooks/search';
import { useAlertDismissals, generateAlertId } from '@/hooks/_shared/use-alert-dismissals';
import { useDetailBreadcrumb } from '@/components/layout/use-detail-breadcrumb';
import {
  purchaseOrderStatusEnum,
  type PurchaseOrderStatus,
} from '@/lib/schemas/purchase-orders';
import { PODetailView } from '../views/po-detail-view';
import type {
  PurchaseOrderWithDetails,
  PODetailHeaderConfig,
  POAlert,
} from '@/lib/schemas/purchase-orders';
import { canEditPO, canDeletePO } from '../po-status-config';

// ============================================================================
// TYPES
// ============================================================================

export interface PODetailContainerRenderProps {
  /** Header action buttons (optional - view may render its own header) */
  headerActions?: React.ReactNode;
  /** Main content (includes EntityHeader with actions) */
  content: React.ReactNode;
}

export interface PODetailContainerProps {
  /** Purchase Order ID to display */
  poId: string;
  /** Callback when user navigates back */
  onBack?: () => void;
  /** Callback when user clicks edit */
  onEdit?: () => void;
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
  children,
  className,
}: PODetailContainerProps) {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [activeTab, setActiveTab] = useState('overview');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [showMetaPanel, setShowMetaPanel] = useState(true);

  // ---------------------------------------------------------------------------
  // Panel Toggle Handler
  // ---------------------------------------------------------------------------
  const handleToggleMetaPanel = useCallback(() => {
    setShowMetaPanel((prev) => !prev);
  }, []);

  const handleViewReceipts = useCallback(() => {
    setActiveTab('receipts');
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
  useTrackView('purchase_order', po?.id, po?.poNumber, po?.supplierName ?? undefined, `/purchase-orders/${poId}`);
  useDetailBreadcrumb(`/purchase-orders/${poId}`, po ? (po.poNumber ?? poId) : undefined, !!po);

  const {
    activities,
    isLoading: activitiesLoading,
    error: activitiesError,
  } = useUnifiedActivities({
    entityType: 'purchase_order',
    entityId: poId,
  });

  const { onLogActivity, loggerProps } = useEntityActivityLogging({
    entityType: 'purchase_order',
    entityId: poId,
    entityLabel: `Purchase Order: ${po?.poNumber ?? poId}`,
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
      toastSuccess('Purchase order approved', {
        action: {
          label: 'Receive Goods',
          onClick: () => setReceiveDialogOpen(true),
        },
      });
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
      toastSuccess('Purchase order marked as ordered', {
        action: {
          label: 'Receive Goods',
          onClick: () => setReceiveDialogOpen(true),
        },
      });
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
  const canEdit = useMemo(() => {
    if (!po) return false;
    const parsed = purchaseOrderStatusEnum.safeParse(po.status);
    return parsed.success && canEditPO(parsed.data);
  }, [po]);

  const canDelete = useMemo(() => {
    if (!po) return false;
    const parsed = purchaseOrderStatusEnum.safeParse(po.status);
    return parsed.success && canDeletePO(parsed.data);
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
  // Alerts (Zone 3) - must be before early returns (hooks rules)
  // ---------------------------------------------------------------------------
  const { dismiss, isAlertDismissed } = useAlertDismissals();

  const alerts = useMemo<POAlert[]>(() => {
    if (!po?.requiredDate) return [];
    const due = new Date(po.requiredDate);
    const now = new Date();
    const isOverdue = isPast(due);
    const isUrgent = !isOverdue && isBefore(due, addDays(now, 7));

    const result: POAlert[] = [];
    if (isOverdue) {
      result.push({
        id: generateAlertId('purchase_order', po.id, 'required_date_overdue'),
        type: 'required_date_overdue',
        severity: 'critical',
        title: 'Required date overdue',
        description: `This PO was required by ${po.requiredDate}. Consider following up with the supplier.`,
      });
    } else if (isUrgent) {
      result.push({
        id: generateAlertId('purchase_order', po.id, 'required_date_urgent'),
        type: 'required_date_urgent',
        severity: 'warning',
        title: 'Required date approaching',
        description: `Required by ${po.requiredDate}. Ensure delivery is on track.`,
      });
    }
    return result.filter((a) => !isAlertDismissed(a.id));
  }, [po, isAlertDismissed]);

  const handleDismissAlert = useCallback(
    (alertId: string) => {
      dismiss(alertId);
    },
    [dismiss]
  );

  // ---------------------------------------------------------------------------
  // Render: Loading
  // ---------------------------------------------------------------------------
  if (isLoading) {
    const loadingContent = <PODetailSkeleton />;
    if (children) {
      return (
        <>
          {children({
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
  const parseResult = purchaseOrderStatusEnum.safeParse(po.status);
  const status: PurchaseOrderStatus = parseResult.success ? parseResult.data : 'draft';

  const transformedPO: PurchaseOrderWithDetails = {
    id: po.id,
    poNumber: po.poNumber,
    supplierId: po.supplierId,
    status,
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
  // Render: Header Config (for EntityHeader in view)
  // ---------------------------------------------------------------------------
  const isPending = submitMutation.isPending || approveMutation.isPending || orderMutation.isPending;

  const headerConfig: PODetailHeaderConfig = {
    primaryAction:
      po.status === 'draft'
        ? {
            label: submitMutation.isPending ? 'Submitting...' : 'Submit for Approval',
            onClick: handleSubmitForApproval,
            icon: <Send className="h-4 w-4 mr-2" />,
            disabled: isPending,
          }
        : po.status === 'pending_approval'
          ? {
              label: approveMutation.isPending ? 'Approving...' : 'Approve',
              onClick: handleApprove,
              icon: <CheckCircle className="h-4 w-4 mr-2" />,
              disabled: isPending,
            }
          : po.status === 'approved'
            ? {
                label: orderMutation.isPending ? 'Processing...' : 'Mark as Ordered',
                onClick: handleMarkAsOrdered,
                icon: <Send className="h-4 w-4 mr-2" />,
                disabled: isPending,
              }
            : canReceive
              ? {
                  label: 'Receive Goods',
                  onClick: () => setReceiveDialogOpen(true),
                  icon: <Package className="h-4 w-4 mr-2" />,
                }
              : undefined,
    secondaryActions: [
      {
        label: 'Receiving History',
        onClick: handleViewReceipts,
        icon: <ClipboardList className="h-4 w-4 mr-2" />,
      },
      {
        label: 'Print',
        onClick: handlePrint,
        icon: <Printer className="h-4 w-4 mr-2" />,
      },
      {
        label: 'Copy link',
        onClick: () => navigator.clipboard.writeText(window.location.href),
        icon: <Link2 className="h-4 w-4 mr-2" />,
      },
      {
        label: 'Copy PO Number',
        onClick: () => navigator.clipboard.writeText(po.poNumber),
        icon: <Copy className="h-4 w-4 mr-2" />,
      },
      {
        label: showMetaPanel ? 'Hide' : 'Show details panel',
        onClick: handleToggleMetaPanel,
        icon: <PanelRight className="h-4 w-4 mr-2" />,
      },
      ...(canEdit && onEdit
        ? [
            {
              label: 'Edit Order',
              onClick: onEdit,
              icon: <Edit className="h-4 w-4 mr-2" />,
            },
          ]
        : []),
      ...(po.status === 'pending_approval'
        ? [
            {
              label: 'Reject',
              onClick: handleReject,
              icon: <XCircle className="h-4 w-4 mr-2" />,
              disabled: isPending,
            },
          ]
        : []),
      ...(canCancel
        ? [
            {
              label: 'Cancel Order',
              onClick: () => setCancelDialogOpen(true),
              icon: <XCircle className="h-4 w-4 mr-2" />,
              destructive: true,
            },
          ]
        : []),
    ],
    onEdit: canEdit && onEdit ? onEdit : undefined,
    onDelete: canDelete ? () => setDeleteDialogOpen(true) : undefined,
  };


  // When using render props (layout pattern), actions go in PageLayout.Header.
  // Pass headerConfig without actions so EntityHeader only shows identity.
  const headerConfigForView = children
    ? { ...headerConfig, primaryAction: undefined, secondaryActions: [], onEdit: undefined, onDelete: undefined }
    : headerConfig;

  const headerActions = children ? (
    <EntityHeaderActions
      primaryAction={headerConfig.primaryAction}
      secondaryActions={headerConfig.secondaryActions}
      onEdit={headerConfig.onEdit}
      onDelete={headerConfig.onDelete}
    />
  ) : undefined;

  // ---------------------------------------------------------------------------
  // Render: Main Content
  // ---------------------------------------------------------------------------
  const content = (
    <>
      <PODetailView
        alerts={alerts}
        onDismissAlert={handleDismissAlert}
        po={transformedPO}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showMetaPanel={showMetaPanel}
        onToggleMetaPanel={handleToggleMetaPanel}
        headerConfig={headerConfigForView}
        activities={activities}
        activitiesLoading={activitiesLoading}
        activitiesError={activitiesError}
        onLogActivity={onLogActivity}
        className={className}
      />

      <EntityActivityLogger {...loggerProps} />

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

      {/* Goods Receipt Dialog */}
      {canReceive && (
        <GoodsReceiptDialog
          open={receiveDialogOpen}
          onOpenChange={setReceiveDialogOpen}
          poId={po.id}
          poNumber={po.poNumber}
          items={transformedPO.items}
          onReceiptComplete={() => setActiveTab('receipts')}
        />
      )}
    </>
  );

  // ---------------------------------------------------------------------------
  // Render: With Render Props or Default
  // ---------------------------------------------------------------------------
  if (children) {
    return <>{children({ headerActions, content })}</>;
  }

  return <div className={className}>{content}</div>;
}

export default PODetailContainer;
