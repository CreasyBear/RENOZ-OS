/**
 * Order Detail Container
 *
 * Thin orchestration layer that handles loading/error states.
 * Uses useOrderDetailComposite hook for all data and actions.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md (Container Pattern)
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { useMemo, useEffect, useReducer } from 'react';
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
import { AmendmentRequestDialog } from '../amendments';
import { RecordPaymentDialog } from '../dialogs/record-payment-dialog';
import { ORDER_STATUS_DETAIL_CONFIG } from '../order-status-config';
import { RmaCreateDialog } from '@/components/domain/support';
import { useCreateRma } from '@/hooks/support';

// ============================================================================
// TYPES
// ============================================================================

type DialogType = 'pick' | 'edit' | 'ship' | 'confirmDelivery' | 'rma' | 'amendment' | 'payment' | null;

interface DialogState {
  open: DialogType;
  confirmDeliveryShipmentId: string | null;
}

type DialogAction =
  | { type: 'OPEN_PICK' }
  | { type: 'OPEN_EDIT' }
  | { type: 'OPEN_SHIP' }
  | { type: 'OPEN_CONFIRM_DELIVERY'; payload: { shipmentId: string } }
  | { type: 'OPEN_RMA' }
  | { type: 'OPEN_AMENDMENT' }
  | { type: 'OPEN_PAYMENT' }
  | { type: 'CLOSE' };

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case 'OPEN_PICK':
      return { ...state, open: 'pick', confirmDeliveryShipmentId: null };
    case 'OPEN_EDIT':
      return { ...state, open: 'edit', confirmDeliveryShipmentId: null };
    case 'OPEN_SHIP':
      return { ...state, open: 'ship', confirmDeliveryShipmentId: null };
    case 'OPEN_CONFIRM_DELIVERY':
      return { ...state, open: 'confirmDelivery', confirmDeliveryShipmentId: action.payload.shipmentId };
    case 'OPEN_RMA':
      return { ...state, open: 'rma', confirmDeliveryShipmentId: null };
    case 'OPEN_AMENDMENT':
      return { ...state, open: 'amendment', confirmDeliveryShipmentId: null };
    case 'OPEN_PAYMENT':
      return { ...state, open: 'payment', confirmDeliveryShipmentId: null };
    case 'CLOSE':
      return { ...state, open: null, confirmDeliveryShipmentId: null };
    default:
      return state;
  }
}

function getInitialDialogState(pickFromSearch: boolean, editFromSearch: boolean): DialogState {
  return {
    open: pickFromSearch ? 'pick' : editFromSearch ? 'edit' : null,
    confirmDeliveryShipmentId: null,
  };
}

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
          {/* Request Amendment - only for non-draft orders */}
          {orderStatus !== 'draft' && (
            <DropdownMenuItem
              onClick={onRequestAmendment}
            >
              <FileEdit className="h-4 w-4 mr-2" />
              Request Amendment
            </DropdownMenuItem>
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
  children,
  className,
}: OrderDetailContainerProps) {
  const navigate = useNavigate();
  const [dialogState, dispatch] = useReducer(
    dialogReducer,
    getInitialDialogState(pickFromSearch, editFromSearch)
  );
  const createRmaMutation = useCreateRma();

  const detail = useOrderDetailComposite(orderId, {
    onOpenShipDialog: () => dispatch({ type: 'OPEN_SHIP' }),
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

  // Edit order (for ?edit=true flow)
  const { data: customersData } = useCustomers({ pageSize: 100 });
  const customers = useMemo(
    () => (customersData?.items ?? []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })),
    [customersData]
  );
  const updateOrderMutation = useUpdateOrder();

  const handleEditDialogClose = (open: boolean) => {
    if (!open) {
      dispatch({ type: 'CLOSE' });
      navigate({ to: '/orders/$orderId', params: { orderId }, search: {} });
    } else {
      dispatch({ type: 'OPEN_EDIT' });
    }
  };

  const handlePickDialogClose = (open: boolean) => {
    if (!open) {
      dispatch({ type: 'CLOSE' });
      if (pickFromSearch) {
        navigate({ to: '/orders/$orderId', params: { orderId }, search: {} });
      }
    } else {
      dispatch({ type: 'OPEN_PICK' });
    }
  };

  // Open Ship dialog when ?ship=1 and order is picked/partially_shipped
  useEffect(() => {
    if (
      shipFromSearch &&
      detail.order &&
      (detail.order.status === 'picked' || detail.order.status === 'partially_shipped')
    ) {
      dispatch({ type: 'OPEN_SHIP' });
    }
  }, [shipFromSearch, detail.order?.id, detail.order?.status]);

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
  const rmaOrderLineItems = useMemo(() => {
    if (!detail.order?.lineItems) return [];
    return detail.order.lineItems.map((li) => {
      const liWithProduct = li as { id: string; productId?: string; quantity: number; unitPrice?: number; description?: string; product?: { name?: string } };
      return {
        id: liWithProduct.id,
        productId: liWithProduct.productId ?? '',
        productName: liWithProduct.product?.name ?? liWithProduct.description ?? 'Unknown',
        quantity: Number(liWithProduct.quantity),
        unitPrice: Number(liWithProduct.unitPrice ?? 0),
        serialNumber: null as string | null,
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

  const fromIssueBanner = fromIssueId ? (
    <Alert className="border-blue-500/50 bg-blue-500/10">
      <Package className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>Creating RMA from issue — select items below and create the return authorization.</span>
        <Button size="sm" onClick={() => dispatch({ type: 'OPEN_RMA' })}>
          <Package className="h-4 w-4 mr-2" />
          Create RMA
        </Button>
      </AlertDescription>
    </Alert>
  ) : undefined;

  // ─────────────────────────────────────────────────────────────────────────
  // Success State
  // ─────────────────────────────────────────────────────────────────────────
  const headerActionsEl = (
    <HeaderActions
      orderId={orderId}
      orderStatus={detail.order.status}
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
      onRequestAmendment={() => dispatch({ type: 'OPEN_AMENDMENT' })}
      onRecordPayment={() => dispatch({ type: 'OPEN_PAYMENT' })}
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
        fromIssueBanner={fromIssueBanner}
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
          onPickItems: () => dispatch({ type: 'OPEN_PICK' }),
          onShipOrder: () => dispatch({ type: 'OPEN_SHIP' }),
          onConfirmDelivery: (shipmentId) =>
            dispatch({ type: 'OPEN_CONFIRM_DELIVERY', payload: { shipmentId } }),
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
          onRecordPayment: () => dispatch({ type: 'OPEN_PAYMENT' }),
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
        onOpenChange={handlePickDialogClose}
        orderId={orderId}
        onSuccess={() => detail.refetch()}
        onShipOrder={() => dispatch({ type: 'OPEN_SHIP' })}
      />
      <ShipOrderDialog
        open={dialogState.open === 'ship'}
        onOpenChange={(open) => {
          if (!open) {
            dispatch({ type: 'CLOSE' });
            if (shipFromSearch) {
              navigate({ to: '/orders/$orderId', params: { orderId }, search: {} });
            }
          } else {
            dispatch({ type: 'OPEN_SHIP' });
          }
        }}
        orderId={orderId}
        onSuccess={() => detail.refetch()}
        onViewShipments={() => {
          dispatch({ type: 'CLOSE' });
          detail.onTabChange('fulfillment');
        }}
      />

      {dialogState.confirmDeliveryShipmentId && (
        <ConfirmDeliveryDialog
          open={dialogState.open === 'confirmDelivery'}
          onOpenChange={(open) => {
            if (!open) dispatch({ type: 'CLOSE' });
          }}
          shipmentId={dialogState.confirmDeliveryShipmentId}
          onSuccess={() => {
            detail.refetch();
            dispatch({ type: 'CLOSE' });
          }}
        />
      )}

      {/* Amendment Request Dialog */}
      <AmendmentRequestDialog
        open={dialogState.open === 'amendment'}
        onOpenChange={(open) => {
          if (!open) dispatch({ type: 'CLOSE' });
          else dispatch({ type: 'OPEN_AMENDMENT' });
        }}
        orderId={orderId}
        onSuccess={() => {
          detail.refetch();
        }}
      />

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        open={dialogState.open === 'payment'}
        onOpenChange={(open) => {
          if (!open) dispatch({ type: 'CLOSE' });
          else dispatch({ type: 'OPEN_PAYMENT' });
        }}
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
          onOpenChange={handleEditDialogClose}
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
        />
      )}

      {/* RMA Create Dialog (from issue flow) */}
      {fromIssueId && (
        <RmaCreateDialog
          open={dialogState.open === 'rma'}
          onOpenChange={(open) => {
            if (!open) dispatch({ type: 'CLOSE' });
            else dispatch({ type: 'OPEN_RMA' });
          }}
          orderId={orderId}
          orderLineItems={rmaOrderLineItems}
          issueId={fromIssueId}
          customerId={detail.order.customerId ?? undefined}
          onSuccess={(rmaId) => {
            dispatch({ type: 'CLOSE' });
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
