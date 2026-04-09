/**
 * Order Detail Container
 *
 * Thin orchestration layer that handles loading/error states.
 * Uses useOrderDetailComposite hook for all data and actions.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md (Container Pattern)
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { useMemo, useCallback, useState } from 'react';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { DisabledMenuItem } from '@/components/shared/disabled-with-tooltip';
import { EntityActivityLogger } from '@/components/shared/activity';
import { useEntityActivityLogging } from '@/hooks/activities/use-entity-activity-logging';
import { useOrderDetailComposite } from '@/hooks/orders/use-order-detail-composite';
import { toastError, toastSuccess } from '@/hooks';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { useTrackView } from '@/hooks/search';
import { useDetailBreadcrumb } from '@/components/layout/use-detail-breadcrumb';
import type { OrderWorkflowAction } from '@/lib/schemas/orders';
import { useOrderShipments, useReopenShipment } from '@/hooks/orders';
import { OrderDetailView } from '../views/order-detail-view';
import { OrderEditDialog } from '../cards/order-edit-dialog';
import { PickItemsDialog } from '../fulfillment/pick-items-dialog';
import { ShipOrderDialog } from '../fulfillment/ship-order-dialog';
import { ConfirmDeliveryDialog } from '../fulfillment/confirm-delivery-dialog';
import { summarizeOrderShipmentAvailability } from '../fulfillment/shipment-availability';
import { AmendmentRequestDialogContainer, AmendmentReviewDialog } from '../amendments';
import { RecordPaymentDialog } from '../dialogs/record-payment-dialog';
import { RefundPaymentDialog } from '../dialogs/refund-payment-dialog';
import { RmaCreateDialog } from '@/components/domain/support/rma/rma-create-dialog';
import { useCreateRma } from '@/hooks/support';
import { useOrderDetailDialogState } from './use-order-detail-dialog-state';
import { useOrderDetailRouteIntents } from './use-order-detail-route-intents';
import { useOrderDetailContainerActions } from './use-order-detail-container-actions';
import { resolveDispatchNoteAction } from './order-dispatch-note-routing';
import {
  useOrderWorkflowOptions,
  useChangeOrderStatusManaged,
} from '@/hooks/orders/use-order-status';

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
  workflowActions?: OrderWorkflowAction[];
  isRunningWorkflowAction: boolean;
  isDuplicating: boolean;
  isDeleting: boolean;
  onWorkflowAction: (action: OrderWorkflowAction) => void;
  onDuplicate: () => void;
  onPrint: () => void;
  onDeleteClick: () => void;
  onRequestAmendment?: () => void;
  onRecordPayment?: () => void;
  onCreateRma?: () => void;
  canCreateRma?: boolean;
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
  workflowActions = [],
  isRunningWorkflowAction,
  isDuplicating,
  isDeleting,
  onWorkflowAction,
  onDuplicate,
  onPrint,
  onDeleteClick,
  onRequestAmendment,
  onRecordPayment,
  onCreateRma,
  canCreateRma,
  backLinkSearch,
  includeBack = true,
}: HeaderActionsProps) {
  const primaryWorkflowAction = workflowActions.find((action) => action.category === 'next');

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

      {primaryWorkflowAction && (
        <Button
          onClick={() => onWorkflowAction(primaryWorkflowAction)}
          disabled={isRunningWorkflowAction}
        >
          {isRunningWorkflowAction ? 'Working...' : primaryWorkflowAction.label}
        </Button>
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

      {/* More Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={isRunningWorkflowAction}>
              {isRunningWorkflowAction ? 'Working...' : 'Workflow'}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-72">
              <DropdownMenuLabel>Current: {orderStatus}</DropdownMenuLabel>
              {workflowActions.filter((action) => action.category === 'next').length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Next Steps</DropdownMenuLabel>
                  {workflowActions
                    .filter((action) => action.category === 'next')
                    .map((action) => (
                      <DropdownMenuItem
                        key={`next-${action.key}-${action.shipmentId ?? 'none'}`}
                        onClick={() => onWorkflowAction(action)}
                      >
                        <div className="flex flex-col">
                          <span>{action.label}</span>
                          {action.description && (
                            <span className="text-xs text-muted-foreground">
                              {action.description}
                            </span>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                </>
              )}
              {workflowActions.filter((action) => action.category === 'recovery').length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Recovery</DropdownMenuLabel>
                  {workflowActions
                    .filter((action) => action.category === 'recovery')
                    .map((action) => (
                      <DropdownMenuItem
                        key={`recovery-${action.key}-${action.shipmentId ?? 'none'}`}
                        onClick={() => onWorkflowAction(action)}
                      >
                        <div className="flex flex-col">
                          <span>{action.label}</span>
                          {action.description && (
                            <span className="text-xs text-muted-foreground">
                              {action.description}
                            </span>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                </>
              )}
              {workflowActions.filter((action) => action.category === 'blocked').length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Unavailable</DropdownMenuLabel>
                  {workflowActions
                    .filter((action) => action.category === 'blocked')
                    .map((action) => (
                      <DisabledMenuItem
                        key={`blocked-${action.key}-${action.shipmentId ?? 'none'}`}
                        disabledReason={action.disabledReason}
                      >
                        {action.label}
                      </DisabledMenuItem>
                    ))}
                </>
              )}
              {workflowActions.length === 0 && (
                <DisabledMenuItem disabledReason="No workflow actions are available right now.">
                  No workflow actions available
                </DisabledMenuItem>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="p-0">
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
          {onCreateRma && (
            canCreateRma ? (
              <DropdownMenuItem onClick={onCreateRma}>
                <Package className="h-4 w-4 mr-2" />
                Create RMA
              </DropdownMenuItem>
            ) : (
              <DisabledMenuItem disabledReason="RMAs can be created once items have been shipped.">
                <Package className="h-4 w-4 mr-2" />
                Create RMA
              </DisabledMenuItem>
            )
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
  const [reviewAmendmentId, setReviewAmendmentId] = useState<string | null>(null);
  const [refundPaymentId, setRefundPaymentId] = useState<string | null>(null);
  const [pendingOperationalDocument, setPendingOperationalDocument] = useState<
    'packing-slip' | 'dispatch-note' | 'delivery-note' | null
  >(null);
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
  const containerActions = useOrderDetailContainerActions({
    orderId,
    orderStatus: detail.order?.status,
    orderVersion: detail.order?.version,
    refetch: detail.refetch,
  });
  const refundPayment = useMemo(
    () =>
      refundPaymentId
        ? containerActions.payments.find((payment) => payment.id === refundPaymentId) ?? null
        : null,
    [containerActions.payments, refundPaymentId]
  );
  const refundableAmount = useMemo(() => {
    if (!refundPayment) return 0;
    const refundedSoFar = containerActions.payments
      .filter(
        (payment) => payment.isRefund && payment.relatedPaymentId === refundPayment.id
      )
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    return Math.max(0, Number(refundPayment.amount) - refundedSoFar);
  }, [containerActions.payments, refundPayment]);
  const workflowOptionsQuery = useOrderWorkflowOptions(orderId, !!detail.order);
  const shipmentsQuery = useOrderShipments(orderId, !!detail.order);
  const workflowMutation = useChangeOrderStatusManaged({
    onSuccess: () => {
      toastSuccess('Order workflow updated');
      detail.refetch();
    },
    onError: (error) => {
      toastError(error.message || 'Unable to update the order workflow.');
      detail.refetch();
    },
  });
  const reopenShipmentMutation = useReopenShipment();
  const orderStatus = detail.order?.status;
  const shipmentAvailability = useMemo(
    () =>
      summarizeOrderShipmentAvailability(
        detail.order?.lineItems ?? [],
        shipmentsQuery.data ?? []
      ),
    [detail.order?.lineItems, shipmentsQuery.data]
  );
  const canShipFromStatus =
    orderStatus === 'picked' || orderStatus === 'partially_shipped';
  const canShipFromAvailability =
    canShipFromStatus && shipmentAvailability.hasReservableItems;
  const shipBlockedReason = !canShipFromStatus
    ? 'status'
    : shipmentAvailability.totalReservedQty > 0
      ? 'reserved_in_draft'
      : 'unavailable';
  const { shipIntentBlockedReason } = useOrderDetailRouteIntents({
    orderStatus,
    shipChecksReady: !!detail.order && !shipmentsQuery.isLoading,
    canShip: canShipFromAvailability,
    shipBlockedReason,
    dialogOpen: dialogState.open,
    editFromSearch,
    pickFromSearch,
    shipFromSearch,
    paymentFromSearch,
    clearSearch,
    openPick,
    openEdit,
    openShip,
    openPayment,
    closeDialog,
  });

  const generateShipmentOperationalDocument = useCallback(
    async (
      documentType: 'packing-slip' | 'dispatch-note' | 'delivery-note',
      shipmentId: string
    ) => {
      try {
        const mutation =
          documentType === 'packing-slip'
            ? containerActions.generateShipmentPackingSlip
            : documentType === 'dispatch-note'
              ? containerActions.generateShipmentDispatchNote
              : containerActions.generateShipmentDeliveryNote;
        const result = await mutation.mutateAsync({ shipmentId });
        const label =
          documentType === 'packing-slip'
            ? 'Packing slip'
            : documentType === 'dispatch-note'
              ? 'Dispatch note'
              : 'Delivery note';
        toastSuccess(`${label} generated`);
        window.open(result.url, '_blank', 'noopener,noreferrer');
      } catch (error) {
        toastError(
          error instanceof Error ? error.message : `Failed to generate ${documentType}`
        );
      }
    },
    [
      containerActions.generateShipmentDeliveryNote,
      containerActions.generateShipmentDispatchNote,
      containerActions.generateShipmentPackingSlip,
    ]
  );

  const launchOperationalDocumentFlow = useCallback(
    async (documentType: 'packing-slip' | 'dispatch-note' | 'delivery-note') => {
      if (shipmentsQuery.isLoading) {
        toast.info('Loading shipment details...');
        return;
      }

      const shipments = shipmentsQuery.data ?? [];

      if (documentType === 'dispatch-note') {
        const resolution = resolveDispatchNoteAction({
          shipments,
          orderStatus: detail.order?.status,
        });

        if (resolution.kind === 'generate') {
          await generateShipmentOperationalDocument(documentType, resolution.shipmentId);
          return;
        }

        detail.onTabChange('fulfillment');

        if (resolution.kind === 'blocked') {
          toast.warning('Dispatch note not ready yet', {
            description: resolution.reason,
          });
          return;
        }

        if (resolution.kind === 'choose-shipment') {
          toast.info('Choose a shipment in Fulfillment to generate the dispatch note.');
          return;
        }

        if (resolution.kind === 'create-shipment') {
          if (!canShipFromAvailability) {
            toast.info('No picked units are currently available to ship. Review fulfillment first.');
            return;
          }
          setPendingOperationalDocument(documentType);
          openShip();
          toast.info('Create the shipment and we will continue with the dispatch note.');
          return;
        }

        toast.info('Finish the fulfillment steps first, then generate the dispatch note from the shipment.');
        return;
      }

      if (shipments.length === 1) {
        const [shipment] = shipments;
        if (documentType === 'delivery-note' && shipment.canGenerateDeliveryNote === false) {
          detail.onTabChange('fulfillment');
          toast.warning('Delivery note not ready yet', {
            description:
              shipment.deliveryNoteBlockedReason ??
              'Confirm delivery on the shipment before generating the delivery note.',
          });
          return;
        }

        await generateShipmentOperationalDocument(documentType, shipment.id);
        return;
      }

      if (shipments.length > 1) {
        detail.onTabChange('fulfillment');
        toast.info(
          `Choose a shipment in Fulfillment to generate the ${
            documentType === 'packing-slip'
              ? 'packing slip'
              : 'delivery note'
          }.`
        );
        return;
      }

      if (canShipFromAvailability) {
        setPendingOperationalDocument(documentType);
        openShip();
        toast.info('Create the shipment and we will continue with the document.');
        return;
      }

      detail.onTabChange('fulfillment');
      toast.info('Operational documents are generated from shipment records in Fulfillment.');
    },
    [
      canShipFromAvailability,
      detail,
      generateShipmentOperationalDocument,
      openShip,
      shipmentsQuery.data,
      shipmentsQuery.isLoading,
    ]
  );

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
  const canCreateGenericRma = rmaOrderLineItems.length > 0;

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
  if (shipIntentBlockedReason) {
    contextualBanners.push(
      <Alert key="ship-intent-blocked" className="border-amber-500/50 bg-amber-500/10">
        <Package className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>
            {shipIntentBlockedReason === 'status'
              ? 'This order must be picked before it can be shipped.'
              : shipIntentBlockedReason === 'reserved_in_draft'
                ? 'Picked stock is already reserved in pending shipment drafts. Review those drafts in Fulfillment.'
                : 'No picked units are currently available to ship. Review fulfillment or adjust picking first.'}
          </span>
          {shipIntentBlockedReason === 'status' ? (
            <Button size="sm" variant="outline" onClick={openPick}>
              Pick Items
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => detail.onTabChange('fulfillment')}>
              Open Fulfillment
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  const documentActions = {
    ...containerActions.documentActions,
    onGeneratePackingSlip: async () => {
      await launchOperationalDocumentFlow('packing-slip');
    },
    onGenerateDeliveryNote: async () => {
      await launchOperationalDocumentFlow('delivery-note');
    },
    onGenerateDispatchNote: async () => {
      await launchOperationalDocumentFlow('dispatch-note');
    },
    isGeneratingPackingSlip: containerActions.generateShipmentPackingSlip.isPending,
    isGeneratingDeliveryNote: containerActions.generateShipmentDeliveryNote.isPending,
    isGeneratingDispatchNote: containerActions.generateShipmentDispatchNote.isPending,
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Success State
  // ─────────────────────────────────────────────────────────────────────────
  const headerActionsEl = (
    <HeaderActions
      orderId={orderId}
      orderStatus={detail.order.status}
      paymentStatus={detail.order.paymentStatus}
      balanceDue={Number(detail.order.balanceDue || 0)}
      workflowActions={workflowOptionsQuery.data?.actions}
      isRunningWorkflowAction={workflowMutation.isPending || reopenShipmentMutation.isPending}
      isDuplicating={detail.isDuplicating}
      isDeleting={detail.isDeleting}
      onWorkflowAction={(action) => {
        switch (action.key) {
          case 'confirm_order':
            workflowMutation.mutate({
              orderId,
              targetStatus: 'confirmed',
              reason: 'Confirmed from order workflow control',
            });
            return;
          case 'open_pick':
            openPick();
            return;
          case 'open_ship':
            openShip();
            return;
          case 'open_shipments':
            detail.onTabChange('fulfillment');
            return;
          case 'confirm_delivery':
            if (action.shipmentId) {
              openConfirmDelivery(action.shipmentId);
            } else {
              detail.onTabChange('fulfillment');
            }
            return;
          case 'reopen_shipment':
            if (!action.shipmentId) {
              detail.onTabChange('fulfillment');
              return;
            }
            if (!window.confirm('Reopen this shipment for correction? Shipped quantities will be reversed back into the pending shipment draft.')) {
              return;
            }
            reopenShipmentMutation.mutate(
              {
                id: action.shipmentId,
                idempotencyKey: `shipment-reopen:${action.shipmentId}`,
                reason: 'Reopened from order workflow control',
              },
              {
                onSuccess: () => {
                  toastSuccess('Shipment reopened');
                  detail.refetch();
                },
                onError: (error) => {
                  toastError(error.message || 'Unable to reopen the shipment.');
                  detail.refetch();
                },
              }
            );
            return;
          case 'cancel_order':
            if (!window.confirm('Cancel this order? This stops operational work before anything ships.')) {
              return;
            }
            workflowMutation.mutate({
              orderId,
              targetStatus: 'cancelled',
              reason: 'Cancelled from order workflow control',
            });
            return;
          default:
            return;
        }
      }}
      onDuplicate={() => detail.actions.onDuplicate()}
      onPrint={detail.actions.onPrint}
      onDeleteClick={() => detail.setDeleteDialogOpen(true)}
      onRequestAmendment={openAmendment}
      onRecordPayment={openPayment}
      onCreateRma={openRma}
      canCreateRma={canCreateGenericRma}
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
        onOrderUpdated={detail.refetch}
        fulfillmentActions={{
          onPickItems: openPick,
          onShipOrder: openShip,
          onConfirmDelivery: openConfirmDelivery,
          onApplyAmendment: containerActions.handleApplyAmendment,
          onReviewAmendment: (amendmentId) => setReviewAmendmentId(amendmentId),
        }}
        paymentActions={{
          payments: containerActions.payments.map(p => ({
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
          summary: containerActions.paymentSummary ?? {
            totalPayments: 0,
            totalPaid: 0,
            totalRefunds: 0,
            netAmount: 0,
          },
          onRecordPayment: openPayment,
          onRefundPayment: (paymentId: string) => {
            const payment = containerActions.payments.find((item) => item.id === paymentId);
            if (!payment) {
              toastError('Payment not found for refund.');
              return;
            }
            setRefundPaymentId(paymentId);
          },
        }}
        headerActions={children ? null : headerActionsEl}
        className={className}
      />

      <AmendmentReviewDialog
        open={reviewAmendmentId !== null}
        onOpenChange={(open) => {
          if (!open) setReviewAmendmentId(null);
        }}
        amendmentId={reviewAmendmentId ?? ''}
        onSuccess={() => {
          setReviewAmendmentId(null);
          detail.refetch();
        }}
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
        onReviewFulfillment={() => {
          detail.refetch();
          detail.onTabChange('fulfillment');
        }}
        onShipOrder={openShip}
      />
      <ShipOrderDialog
        open={dialogState.open === 'ship'}
        onOpenChange={(open) => {
          if (!open) {
            setPendingOperationalDocument(null);
          }
          handleShipDialogOpenChange(open);
        }}
        orderId={orderId}
        onSuccess={async (result) => {
          detail.refetch();
          if (!pendingOperationalDocument || !result?.shipmentId) {
            setPendingOperationalDocument(null);
            return;
          }

          if (pendingOperationalDocument === 'delivery-note') {
            detail.onTabChange('fulfillment');
            toast.info('Confirm delivery on the shipment, then generate the delivery note.');
            setPendingOperationalDocument(null);
            return;
          }

          await generateShipmentOperationalDocument(pendingOperationalDocument, result.shipmentId);
          setPendingOperationalDocument(null);
        }}
        onViewShipments={() => {
          setPendingOperationalDocument(null);
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
          await containerActions.createPaymentMutation.mutateAsync(data);
          toastSuccess('Payment recorded successfully');
          containerActions.refetchPayments();
          containerActions.refetchSummary();
        }}
        isSubmitting={containerActions.createPaymentMutation.isPending}
      />

      {refundPayment && (
        <RefundPaymentDialog
          open={refundPaymentId !== null}
          onOpenChange={(open) => {
            if (!open) setRefundPaymentId(null);
          }}
          orderNumber={detail.order.orderNumber}
          originalPaymentAmount={Number(refundPayment.amount)}
          refundableAmount={refundableAmount}
          onSubmit={async ({ amount, notes }) => {
            await containerActions.createRefundMutation.mutateAsync({
              originalPaymentId: refundPayment.id,
              amount,
              notes,
            });
            toastSuccess('Refund recorded successfully');
            containerActions.refetchPayments();
            containerActions.refetchSummary();
            detail.refetch();
            setRefundPaymentId(null);
          }}
          isSubmitting={containerActions.createRefundMutation.isPending}
        />
      )}

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
          shippingAddress: detail.order.shippingAddress ?? null,
        }}
        customers={containerActions.customers}
        isLoadingCustomers={false}
        onSubmit={containerActions.handleEditSubmit}
        isSubmitting={containerActions.updateOrderMutation.isPending}
        submitError={containerActions.updateOrderMutation.error?.message}
      />

      {/* RMA Create Dialog */}
      {(fromIssueId || canCreateGenericRma) && (
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
