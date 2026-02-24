/**
 * Order Detail Container
 *
 * Thin orchestration layer that handles loading/error states.
 * Uses useOrderDetailComposite hook for all data and actions.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md (Container Pattern)
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { useMemo, useEffect, useRef, useCallback, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  Edit,
  Copy,
  Printer,
  MoreHorizontal,
  XCircle,
  ArrowLeft,
  FileEdit,
  CreditCard,
  Package,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ErrorState } from '@/components/shared/error-state';
import { ordersLogger } from '@/lib/logger';
import { DisabledMenuItem } from '@/components/shared/disabled-with-tooltip';
import { EntityActivityLogger } from '@/components/shared/activity';
import { useEntityActivityLogging } from '@/hooks/activities/use-entity-activity-logging';
import { useOrderDetailComposite } from '@/hooks/orders/use-order-detail-composite';
import {
  useOrderPayments,
  useOrderPaymentSummary,
  useCreateOrderPayment,
} from '@/hooks/orders/use-order-payments';
import {
  useApplyAmendment,
} from '@/hooks/orders';
import {
  useGenerateOrderQuote,
  useGenerateOrderInvoice,
  useGenerateOrderPackingSlip,
  useGenerateOrderDeliveryNote,
} from '@/hooks/documents';
import { toastSuccess, toastError } from '@/hooks';
import { cn } from '@/lib/utils';
import { useCustomers } from '@/hooks/customers';
import { useUpdateOrder } from '@/hooks/orders/use-orders';
import { useTrackView } from '@/hooks/search';
import { useDetailBreadcrumb } from '@/components/layout/use-detail-breadcrumb';
import { OrderDetailView } from '../views/order-detail-view';
import { OrderEditDialog } from '../cards/order-edit-dialog';
import type { EditOrderFormData } from '../cards/order-edit-dialog.schema';
import { PickItemsDialog } from '../fulfillment/pick-items-dialog';
import { ShipOrderDialog } from '../fulfillment/ship-order-dialog';
import { ConfirmDeliveryDialog } from '../fulfillment/confirm-delivery-dialog';
import { AmendmentRequestDialogContainer } from '../amendments';
import { RecordPaymentDialog } from '../dialogs/record-payment-dialog';
import { ORDER_STATUS_DETAIL_CONFIG } from '../order-status-config';
import { RmaCreateDialog } from '@/components/domain/support/rma/rma-create-dialog';
import { useCreateRma } from '@/hooks/support';
import { useOrderDetailDialogState } from './use-order-detail-dialog-state';

export interface OrderDetailContainerRenderProps {
  /** Header actions (CTAs) for PageLayout.Header when using layout pattern */
  headerActions?: React.ReactNode;
  /** Optional search params for Back link (e.g. when fromIssueId) */
  backLinkSearch?: Record<string, string>;
  /** Main content */
  content: React.ReactNode;
}

export interface OrderDetailContainerProps {
  /** Order ID to display */
  orderId: string;
  /** When creating RMA from issue - show Create RMA banner and dialog */
  fromIssueId?: string;
  /** When true, open the Edit Order dialog (e.g. from ?edit=true in URL) */
  edit?: boolean;
  /** When true, open the Pick Items dialog (e.g. from ?pick=1 in URL) */
  pick?: boolean;
  /** When true, open the Ship Order dialog (e.g. from ?ship=1 in URL) — only when order is picked/partially_shipped */
  ship?: boolean;
  /** When true, open the Record Payment dialog (e.g. from ?payment=1 in URL) */
  payment?: boolean;
  /** Render props pattern for layout composition */
  children?: (props: OrderDetailContainerRenderProps) => React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function OrderDetailSkeleton() {
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

// ============================================================================
// HEADER ACTIONS
// ============================================================================

interface HeaderActionsProps {
  orderId: string;
  orderStatus: string;
  paymentStatus?: string;
  balanceDue: number;
  nextStatusActions: string[];
  isUpdatingStatus: boolean;
  isDuplicating: boolean;
  isDeleting: boolean;
  onUpdateStatus: (status: string) => void;
  onDuplicate: () => void;
  onPrint: () => void;
  onDeleteClick: () => void;
  onRequestAmendment?: () => void;
  onRecordPayment?: () => void;
  /** When creating RMA from issue - preserve in Back link */
  backLinkSearch?: Record<string, string>;
  /** When false, Back button is omitted (route provides it in leading) */
  includeBack?: boolean;
}

function HeaderActions({
  orderId,
  orderStatus,
  paymentStatus,
  balanceDue,
  nextStatusActions,
  isUpdatingStatus,
  isDuplicating,
  isDeleting,
  onUpdateStatus,
  onDuplicate,
  onPrint,
  onDeleteClick,
  onRequestAmendment,
  onRecordPayment,
  backLinkSearch,
  includeBack = true,
}: HeaderActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {includeBack && (
        <Link
          to="/orders"
          search={backLinkSearch}
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back to orders</span>
        </Link>
      )}

      {/* Record Payment - prominent when balance due */}
      {balanceDue > 0 && onRecordPayment && (
        <Button
          onClick={onRecordPayment}
          className="bg-green-600 hover:bg-green-700"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Record Payment
        </Button>
      )}

      {/* Status Actions */}
      {nextStatusActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={isUpdatingStatus}>
              {isUpdatingStatus ? 'Updating...' : 'Update Status'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {nextStatusActions.map((nextStatus) => (
              <DropdownMenuItem
                key={nextStatus}
                onClick={() => onUpdateStatus(nextStatus)}
              >
                Mark as {ORDER_STATUS_DETAIL_CONFIG[nextStatus as keyof typeof ORDER_STATUS_DETAIL_CONFIG]?.label || nextStatus}
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
          {/* Edit - always visible, disabled when not draft */}
          {orderStatus === 'draft' ? (
            <DropdownMenuItem className="p-0">
              {/* Avoid DropdownMenuItem asChild + TanStack Link SSR issues */}
              <Link
                to="/orders/$orderId"
                params={{ orderId }}
                search={{ edit: true }}
                className="flex w-full items-center px-2 py-1.5"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Order
              </Link>
            </DropdownMenuItem>
          ) : (
            <DisabledMenuItem
              disabledReason="Orders can only be edited in draft status"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Order
            </DisabledMenuItem>
          )}
          <DropdownMenuItem
            onClick={onDuplicate}
            disabled={isDuplicating}
          >
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onPrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* Record Payment - always available */}
          {onRecordPayment && (
            <DropdownMenuItem
              onClick={onRecordPayment}
              disabled={balanceDue <= 0}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Record Payment
              {balanceDue <= 0 && (
                <span className="ml-auto text-xs text-muted-foreground">
                  Paid
                </span>
              )}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {/* Request Amendment - only for non-draft orders; disabled when cancelled or delivered+paid */}
          {orderStatus !== 'draft' && (
            (orderStatus === 'cancelled' ||
            (orderStatus === 'delivered' &&
              (paymentStatus === 'paid' || Number(balanceDue) <= 0))) ? (
              <DisabledMenuItem
                disabledReason={
                  orderStatus === 'cancelled'
                    ? 'Cannot amend cancelled orders'
                    : 'Cannot amend delivered and fully paid orders'
                }
              >
                <FileEdit className="h-4 w-4 mr-2" />
                Request Amendment
              </DisabledMenuItem>
            ) : (
              <DropdownMenuItem onClick={onRequestAmendment}>
                <FileEdit className="h-4 w-4 mr-2" />
                Request Amendment
              </DropdownMenuItem>
            )
          )}
          <DropdownMenuSeparator />
          {/* Delete - always visible, disabled when not draft */}
          {orderStatus === 'draft' ? (
            <DropdownMenuItem
              onClick={onDeleteClick}
              className="text-destructive"
              disabled={isDeleting}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          ) : (
            <DisabledMenuItem
              disabledReason="Only draft orders can be deleted"
              className="text-destructive opacity-50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Delete
            </DisabledMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OrderDetailContainer({
  orderId,
  fromIssueId,
  edit: editFromSearch = false,
  pick: pickFromSearch = false,
  ship: shipFromSearch = false,
  payment: paymentFromSearch = false,
  children,
  className,
}: OrderDetailContainerProps) {
  const navigate = useNavigate();
  const blockedEditSearchHandledRef = useRef(false);
  const blockedShipSearchHandledRef = useRef(false);
  const [shipIntentBlocked, setShipIntentBlocked] = useState(false);
  const clearSearch = useCallback(() => {
    navigate({ to: '/orders/$orderId', params: { orderId }, search: {} });
  }, [navigate, orderId]);
  const createRmaMutation = useCreateRma();
  const {
    dialogState,
    isInteractionDialogOpen,
    openPick,
    openEdit,
    openShip,
    openConfirmDelivery,
    openRma,
    openAmendment,
    openPayment,
    closeDialog,
    handlePickDialogOpenChange,
    handleShipDialogOpenChange,
    handleEditDialogOpenChange,
    handlePaymentDialogOpenChange,
  } = useOrderDetailDialogState({
    editFromSearch,
    pickFromSearch,
    shipFromSearch,
    paymentFromSearch,
    clearSearch,
  });

  const detail = useOrderDetailComposite(orderId, {
    onOpenShipDialog: openShip,
    refetchInterval: isInteractionDialogOpen ? false : 30000,
  });
  const { onLogActivity, onScheduleFollowUp, loggerProps: activityLoggerProps } =
    useEntityActivityLogging({
      entityType: 'order',
      entityId: orderId,
      entityLabel: `Order ${detail.order?.orderNumber ?? orderId}`,
    });
  useTrackView('order', detail.order?.id, detail.order?.orderNumber, detail.order?.customer?.name ?? undefined, `/orders/${orderId}`);
  useDetailBreadcrumb(
    `/orders/${orderId}`,
    detail.order ? (detail.order.orderNumber ?? detail.order.customer?.name ?? orderId) : undefined,
    !!detail.order
  );

  // Document generation hooks
  const generateQuote = useGenerateOrderQuote();
  const generateInvoice = useGenerateOrderInvoice();
  const generatePackingSlip = useGenerateOrderPackingSlip();
  const generateDeliveryNote = useGenerateOrderDeliveryNote();

  // Payment hooks
  const {
    data: payments = [],
    refetch: refetchPayments,
  } = useOrderPayments(orderId);
  const {
    data: paymentSummary,
    refetch: refetchSummary,
  } = useOrderPaymentSummary(orderId);
  const createPaymentMutation = useCreateOrderPayment(orderId);
  const applyAmendmentMutation = useApplyAmendment();

  const handleApplyAmendment = useCallback(
    async (amendmentId: string) => {
      try {
        await applyAmendmentMutation.mutateAsync({ amendmentId });
        toastSuccess('Amendment applied');
        detail.refetch();
      } catch (e) {
        toastError(e instanceof Error ? e.message : 'Failed to apply amendment');
      }
    },
    [applyAmendmentMutation, detail]
  );

  // Edit order (for ?edit=true flow) - only fetch when order is draft (edit dialog can open)
  const { data: customersData } = useCustomers({
    pageSize: 100,
    enabled: detail.order?.status === 'draft',
  });
  const customers = useMemo(
    () => (customersData?.items ?? []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })),
    [customersData]
  );
  const updateOrderMutation = useUpdateOrder();
  const orderStatus = detail.order?.status;

  useEffect(() => {
    if (pickFromSearch) {
      openPick();
    }
  }, [pickFromSearch, openPick]);

  useEffect(() => {
    if (
      shipFromSearch &&
      (orderStatus === 'picked' || orderStatus === 'partially_shipped') &&
      dialogState.open !== 'ship'
    ) {
      blockedShipSearchHandledRef.current = false;
      globalThis.queueMicrotask(() => setShipIntentBlocked(false));
      openShip();
    }
  }, [shipFromSearch, orderStatus, dialogState.open, openShip]);

  useEffect(() => {
    if (!shipFromSearch) {
      blockedShipSearchHandledRef.current = false;
      globalThis.queueMicrotask(() => setShipIntentBlocked(false));
      return;
    }
    if (!orderStatus) return;

    const canShip = orderStatus === 'picked' || orderStatus === 'partially_shipped';
    if (canShip) {
      blockedShipSearchHandledRef.current = false;
      globalThis.queueMicrotask(() => setShipIntentBlocked(false));
      return;
    }
    if (blockedShipSearchHandledRef.current) return;

    blockedShipSearchHandledRef.current = true;
    globalThis.queueMicrotask(() => setShipIntentBlocked(true));
    clearSearch();
  }, [shipFromSearch, orderStatus, clearSearch]);

  useEffect(() => {
    if (paymentFromSearch && dialogState.open !== 'payment') {
      openPayment();
    }
  }, [paymentFromSearch, dialogState.open, openPayment]);

  useEffect(() => {
    if (!editFromSearch) {
      blockedEditSearchHandledRef.current = false;
      return;
    }
    if (!orderStatus) return;

    if (orderStatus === 'draft') {
      blockedEditSearchHandledRef.current = false;
      if (dialogState.open !== 'edit') {
        openEdit();
      }
      return;
    }
    if (blockedEditSearchHandledRef.current) return;

    blockedEditSearchHandledRef.current = true;
    if (dialogState.open === 'edit') {
      closeDialog();
    }
    toastError('Only draft orders can be edited');
    clearSearch();
  }, [
    editFromSearch,
    orderStatus,
    dialogState.open,
    openEdit,
    closeDialog,
    clearSearch,
  ]);

  const handleEditSubmit = async (data: EditOrderFormData) => {
    if (!detail.order) return;
    await updateOrderMutation.mutateAsync({
      id: detail.order.id,
      customerId: data.customerId,
      orderNumber: data.orderNumber,
      status: data.status,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString().split('T')[0] : undefined,
      internalNotes: data.internalNotes || undefined,
      customerNotes: data.customerNotes || undefined,
    });
    toastSuccess('Order updated');
    detail.refetch();
  };

  // Map order line items to RmaCreateDialog format (must be before early returns - hooks rule)
  // @source detail.order.lineItems from useOrderDetailComposite (filtered to qtyShipped > 0)
  const rmaOrderLineItems = useMemo(() => {
    if (!detail.order?.lineItems) return [];
    const eligible = detail.order.lineItems.filter(
      (li) => ((li as { qtyShipped?: number }).qtyShipped ?? 0) > 0
    );
    return eligible.map((li) => {
      const liWithProduct = li as {
        id: string;
        productId?: string;
        quantity: number;
        unitPrice?: number;
        description?: string;
        product?: { name?: string; isSerialized?: boolean };
        allocatedSerialNumbers?: string[] | null;
      };
      const allocated = (liWithProduct.allocatedSerialNumbers as string[] | null) ?? [];
      const isSerialized = liWithProduct.product?.isSerialized ?? false;
      // For serialized qty=1, pre-fill first allocated serial; otherwise user must enter
      const serialNumber =
        isSerialized && allocated.length > 0 && Number(liWithProduct.quantity) === 1
          ? allocated[0]
          : null;
      return {
        id: liWithProduct.id,
        productId: liWithProduct.productId ?? '',
        productName: liWithProduct.product?.name ?? liWithProduct.description ?? 'Unknown',
        quantity: Number(liWithProduct.quantity),
        unitPrice: Number(liWithProduct.unitPrice ?? 0),
        isSerialized,
        serialNumber: serialNumber as string | null,
      };
    });
  }, [detail.order]);

  // Document generation handlers
  const documentActions = {
    onGenerateQuote: async () => {
      try {
        await generateQuote.mutateAsync({ orderId });
        toastSuccess('Quote PDF generated');
      } catch (error) {
        ordersLogger.error('[OrderDetail] Failed to generate quote', error);
        toastError(error instanceof Error ? error.message : 'Failed to generate quote');
      }
    },
    onGenerateInvoice: async () => {
      try {
        await generateInvoice.mutateAsync({ orderId });
        toastSuccess('Invoice PDF generated');
      } catch (error) {
        ordersLogger.error('[OrderDetail] Failed to generate invoice', error);
        toastError(error instanceof Error ? error.message : 'Failed to generate invoice');
      }
    },
    onGeneratePackingSlip: async () => {
      try {
        await generatePackingSlip.mutateAsync({ orderId });
        toastSuccess('Packing slip generated');
      } catch (error) {
        ordersLogger.error('[OrderDetail] Failed to generate packing slip', error);
        toastError(error instanceof Error ? error.message : 'Failed to generate packing slip');
      }
    },
    onGenerateDeliveryNote: async () => {
      try {
        await generateDeliveryNote.mutateAsync({ orderId });
        toastSuccess('Delivery note generated');
      } catch (error) {
        ordersLogger.error('[OrderDetail] Failed to generate delivery note', error);
        toastError(error instanceof Error ? error.message : 'Failed to generate delivery note');
      }
    },
    isGeneratingQuote: generateQuote.isPending,
    isGeneratingInvoice: generateInvoice.isPending,
    isGeneratingPackingSlip: generatePackingSlip.isPending,
    isGeneratingDeliveryNote: generateDeliveryNote.isPending,
    // Generated URLs from mutations (for immediate download after generation)
    packingSlipUrl: generatePackingSlip.data?.url,
    deliveryNoteUrl: generateDeliveryNote.data?.url,
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Loading State
  // ─────────────────────────────────────────────────────────────────────────
  if (detail.isLoading) {
    const loadingContent = <OrderDetailSkeleton />;
    if (children) {
      return <>{children({ headerActions: <Skeleton className="h-10 w-32" />, backLinkSearch: undefined, content: loadingContent })}</>;
    }
    return loadingContent;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Error State
  // ─────────────────────────────────────────────────────────────────────────
  if (detail.error || !detail.order) {
    const errorContent = (
      <ErrorState
        title="Order not found"
        message="The order you're looking for doesn't exist or has been deleted."
        onRetry={() => detail.refetch()}
        retryLabel="Try Again"
      />
    );
    if (children) {
      return <>{children({ headerActions: null, backLinkSearch: undefined, content: errorContent })}</>;
    }
    return errorContent;
  }

  const contextualBanners: React.ReactNode[] = [];
  if (fromIssueId) {
    contextualBanners.push(
      <Alert key="from-issue" className="border-blue-500/50 bg-blue-500/10">
        <Package className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>Creating RMA from issue — select items below and create the return authorization.</span>
          <Button size="sm" onClick={openRma}>
            <Package className="h-4 w-4 mr-2" />
            Create RMA
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  if (shipIntentBlocked) {
    contextualBanners.push(
      <Alert key="ship-intent-blocked" className="border-amber-500/50 bg-amber-500/10">
        <Package className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>This order must be picked before it can be shipped.</span>
          <Button size="sm" variant="outline" onClick={openPick}>
            Pick Items
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Success State
  // ─────────────────────────────────────────────────────────────────────────
  const headerActionsEl = (
    <HeaderActions
      orderId={orderId}
      orderStatus={detail.order.status}
      paymentStatus={detail.order.paymentStatus}
      balanceDue={Number(detail.order.balanceDue || 0)}
      nextStatusActions={detail.nextStatusActions}
      isUpdatingStatus={detail.isUpdatingStatus}
      isDuplicating={detail.isDuplicating}
      isDeleting={detail.isDeleting}
      onUpdateStatus={(status) => {
        detail.actions.onUpdateStatus(status as import('@/lib/schemas/orders').OrderStatus);
      }}
      onDuplicate={() => detail.actions.onDuplicate()}
      onPrint={detail.actions.onPrint}
      onDeleteClick={() => detail.setDeleteDialogOpen(true)}
      onRequestAmendment={openAmendment}
      onRecordPayment={openPayment}
      backLinkSearch={
        fromIssueId && detail.order?.customerId
          ? { customerId: detail.order.customerId, fromIssueId }
          : undefined
      }
      includeBack={!children}
    />
  );

  const content = (
    <>
      <OrderDetailView
        order={detail.order}
        alerts={detail.alerts}
        fromIssueBanner={contextualBanners.length > 0 ? <div className="space-y-2">{contextualBanners}</div> : undefined}
        activeTab={detail.activeTab}
        onTabChange={detail.onTabChange}
        showMetaPanel={detail.showSidebar}
        onToggleMetaPanel={detail.toggleSidebar}
        activities={detail.activities}
        activitiesLoading={detail.activitiesLoading}
        activitiesError={detail.activitiesError}
        documentActions={documentActions}
        onLogActivity={onLogActivity}
        onScheduleFollowUp={onScheduleFollowUp}
        fulfillmentActions={{
          onPickItems: openPick,
          onShipOrder: openShip,
          onConfirmDelivery: openConfirmDelivery,
          onApplyAmendment: handleApplyAmendment,
        }}
        paymentActions={{
          payments: payments.map(p => ({
            id: p.id,
            amount: Number(p.amount),
            paymentMethod: p.paymentMethod,
            paymentDate: p.paymentDate,
            reference: p.reference,
            notes: p.notes,
            isRefund: p.isRefund,
            relatedPaymentId: p.relatedPaymentId,
            createdAt: p.createdAt.toISOString(),
          })),
          summary: paymentSummary ?? {
            totalPayments: 0,
            totalPaid: 0,
            totalRefunds: 0,
            netAmount: 0,
          },
          onRecordPayment: openPayment,
        }}
        headerActions={children ? null : headerActionsEl}
        className={className}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={detail.deleteDialogOpen}
        onOpenChange={detail.setDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order {detail.order.orderNumber}? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={detail.actions.onDelete}
              disabled={detail.isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {detail.isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activity Logger Dialog */}
      <EntityActivityLogger {...activityLoggerProps} />

      {/* Fulfillment Dialogs */}
      <PickItemsDialog
        open={dialogState.open === 'pick'}
        onOpenChange={handlePickDialogOpenChange}
        orderId={orderId}
        onSuccess={() => detail.refetch()}
        onShipOrder={openShip}
      />
      <ShipOrderDialog
        open={dialogState.open === 'ship'}
        onOpenChange={handleShipDialogOpenChange}
        orderId={orderId}
        onSuccess={() => detail.refetch()}
        onViewShipments={() => {
          closeDialog();
          detail.onTabChange('fulfillment');
        }}
      />

      {dialogState.confirmDeliveryShipmentId && (
        <ConfirmDeliveryDialog
          open={dialogState.open === 'confirmDelivery'}
          onOpenChange={(open) => {
            if (!open) closeDialog();
          }}
          shipmentId={dialogState.confirmDeliveryShipmentId}
          onSuccess={() => {
            detail.refetch();
            closeDialog();
          }}
        />
      )}

      {/* Amendment Request Dialog */}
      <AmendmentRequestDialogContainer
        open={dialogState.open === 'amendment'}
        onOpenChange={(open) => {
          if (!open) closeDialog();
          else openAmendment();
        }}
        order={detail.order}
        orderId={orderId}
        onSuccess={() => {
          detail.refetch();
        }}
      />

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        open={dialogState.open === 'payment'}
        onOpenChange={handlePaymentDialogOpenChange}
        orderId={orderId}
        orderNumber={detail.order.orderNumber}
        balanceDue={Number(detail.order.balanceDue || 0)}
        onSubmit={async (data) => {
          await createPaymentMutation.mutateAsync(data);
          toastSuccess('Payment recorded successfully');
          refetchPayments();
          refetchSummary();
        }}
        isSubmitting={createPaymentMutation.isPending}
      />

      {/* Edit Order Dialog (from ?edit=true in URL) */}
      {detail.order.status === 'draft' && (
        <OrderEditDialog
          open={dialogState.open === 'edit'}
          onOpenChange={handleEditDialogOpenChange}
          order={{
            id: detail.order.id,
            orderNumber: detail.order.orderNumber ?? '',
            customerId: detail.order.customerId ?? '',
            status: detail.order.status ?? 'draft',
            dueDate: detail.order.dueDate
              ? (typeof detail.order.dueDate === 'string' ? new Date(detail.order.dueDate) : detail.order.dueDate)
              : null,
            internalNotes: detail.order.internalNotes ?? null,
            customerNotes: detail.order.customerNotes ?? null,
          }}
          customers={customers}
          isLoadingCustomers={!customersData}
          onSubmit={handleEditSubmit}
          isSubmitting={updateOrderMutation.isPending}
          submitError={updateOrderMutation.error?.message}
        />
      )}

      {/* RMA Create Dialog (from issue flow) */}
      {fromIssueId && (
        <RmaCreateDialog
          open={dialogState.open === 'rma'}
          onOpenChange={(open) => {
            if (!open) closeDialog();
            else openRma();
          }}
          orderId={orderId}
          orderLineItems={rmaOrderLineItems}
          issueId={fromIssueId}
          customerId={detail.order.customerId ?? undefined}
          onSuccess={(rmaId) => {
            closeDialog();
            toastSuccess('RMA created successfully', {
              action: {
                label: 'View RMA',
                onClick: () => navigate({ to: '/support/rmas/$rmaId', params: { rmaId } }),
              },
            });
            navigate({ to: '/support/rmas/$rmaId', params: { rmaId } });
          }}
          onSubmit={async (payload) => {
            const result = await createRmaMutation.mutateAsync({
              orderId: payload.orderId,
              reason: payload.reason,
              lineItems: payload.lineItems,
              issueId: payload.issueId,
              customerId: payload.customerId,
              reasonDetails: payload.reasonDetails,
              customerNotes: payload.customerNotes,
            });
            return { id: result.id };
          }}
          isSubmitting={createRmaMutation.isPending}
        />
      )}
    </>
  );

  if (children) {
    const backLinkSearch =
      fromIssueId && detail.order?.customerId
        ? { customerId: detail.order.customerId, fromIssueId }
        : undefined;
    return <>{children({ headerActions: headerActionsEl, backLinkSearch, content })}</>;
  }

  return content;
}

export default OrderDetailContainer;
