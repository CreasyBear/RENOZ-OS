/**
 * FulfillmentDashboard Presenter
 *
 * Pure UI component for order fulfillment workflow dashboard.
 * Shows orders in various fulfillment stages with quick actions.
 *
 * Container/Presenter Pattern:
 * - Use FulfillmentDashboardContainer in routes (handles data fetching)
 * - Use FulfillmentDashboardPresenter for storybook/testing
 *
 * Features:
 * - Summary cards: Orders to pick, Ready to ship, shipment recovery queue, Overdue
 * - Picking queue table: Orders in "confirmed" status
 * - Shipping queue table: Orders in "picked" status
 * - Delivery tracking section: recovery-focused shipment queue
 *
 * @see ./fulfillment-dashboard-container.tsx (container)
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-FULFILLMENT-DASHBOARD)
 */

import { memo, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { UseMutationResult } from "@tanstack/react-query";
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Eye,
  MapPin,
  ExternalLink,
  Upload,
} from "lucide-react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { FormatAmount, MetricCard } from "@/components/shared";
import type { OrderStatus, ShipmentStatus } from "@/lib/schemas/orders";
import type { FulfillmentImport } from "@/lib/schemas/orders/shipments";
import type { FulfillmentImportResult } from "@/hooks/orders/use-fulfillment-import-workflow";
import { getSummaryMetricSubtitle } from '@/lib/metrics/metric-display';
import type { SummaryState } from '@/lib/metrics/summary-health';
import {
  buildFulfillmentStats,
  isOverdueOrder,
  type FulfillmentStats,
} from "./fulfillment-metrics";
import { FulfillmentImportDialog } from "./fulfillment-import-dialog";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Order list result type for presenter
 */
interface OrderListResult {
  orders: Array<{
    id: string;
    orderNumber: string;
    customerId: string;
    total: number | null;
    orderDate: Date | string | null;
    createdAt: Date;
    status: string;
  }>;
  total: number;
}

/**
 * Shipment list result type for presenter
 */
interface ShipmentListResult {
  shipments: Array<{
    id: string;
    shipmentNumber: string;
    orderId: string;
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    status: ShipmentStatus;
    shippedAt: Date | null;
  }>;
  total: number;
}

/**
 * Container props - what parent components pass
 */
export interface FulfillmentDashboardContainerProps {
  onPickOrder?: (orderId: string) => void;
  onShipOrder?: (orderId: string) => void;
  onViewOrder?: (orderId: string) => void;
  onConfirmDelivery?: (shipmentId: string) => void;
  /** Order IDs to highlight when navigated from orders list "Go to Fulfillment" */
  highlightOrderIds?: string[];
  className?: string;
}

/**
 * Presenter props - what the container passes to the presenter
 */
export interface FulfillmentDashboardPresenterProps
  extends FulfillmentDashboardContainerProps {
  /** @source useOrders({ status: 'confirmed' }) hook */
  confirmedOrders: OrderListResult | null;
  /** @source useOrders({ status: 'picked' }) hook */
  pickedOrders: OrderListResult | null;
  /** @source useShipments() hook */
  activeShipments: ShipmentListResult | null;
  /** @source useFulfillmentDashboardSummary() hook */
  fulfillmentSummary: FulfillmentStats | null;
  /** Authoritative summary state for headline metrics */
  summaryState: SummaryState;
  /** Warning to show when summary metrics are unavailable */
  summaryWarning?: string | null;
  /** Loading state for confirmed orders */
  loadingConfirmed: boolean;
  /** Loading state for picked orders */
  loadingPicked: boolean;
  /** Loading state for shipments */
  loadingShipments: boolean;
  /** Loading state for fulfillment summary metrics */
  loadingSummary: boolean;
  /** @source useFulfillmentImport hook */
  importFulfillmentMutation: UseMutationResult<FulfillmentImportResult, Error, FulfillmentImport>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Package }
> = {
  draft: { label: "Draft", variant: "secondary", icon: Clock },
  confirmed: { label: "Confirmed", variant: "default", icon: CheckCircle },
  picking: { label: "Picking", variant: "default", icon: Package },
  picked: { label: "Picked", variant: "default", icon: Package },
  partially_shipped: { label: "Partial", variant: "default", icon: Truck },
  shipped: { label: "Shipped", variant: "default", icon: Truck },
  delivered: { label: "Delivered", variant: "outline", icon: CheckCircle },
  cancelled: { label: "Cancelled", variant: "destructive", icon: Clock },
};

const SHIPMENT_STATUS_CONFIG: Record<
  ShipmentStatus,
  { label: string; color: string; icon: typeof Package }
> = {
  pending: { label: "Pending", color: "bg-gray-100 text-gray-800", icon: Clock },
  in_transit: { label: "In Transit", color: "bg-blue-100 text-blue-800", icon: Truck },
  out_for_delivery: { label: "Out for Delivery", color: "bg-yellow-100 text-yellow-800", icon: MapPin },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800", icon: CheckCircle },
  failed: { label: "Failed", color: "bg-red-100 text-red-800", icon: AlertTriangle },
  returned: { label: "Returned", color: "bg-orange-100 text-orange-800", icon: RefreshCw },
};

// ============================================================================
// HELPERS
// ============================================================================

function getOrderStatusBadge(status: OrderStatus) {
  const config = ORDER_STATUS_CONFIG[status] ?? ORDER_STATUS_CONFIG.draft;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function getShipmentStatusBadge(status: ShipmentStatus) {
  const config = SHIPMENT_STATUS_CONFIG[status] ?? SHIPMENT_STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", config.color)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

// ============================================================================
// STAT CARD VARIANT STYLES
// ============================================================================

// Variant styles for fulfillment stat cards
const STAT_CARD_STYLES = {
  default: { className: "border-gray-200", iconClassName: "text-gray-400" },
  warning: { className: "border-orange-200 bg-orange-50", iconClassName: "text-orange-500" },
  success: { className: "border-green-200 bg-green-50", iconClassName: "text-green-500" },
  info: { className: "border-blue-200 bg-blue-50", iconClassName: "text-blue-500" },
} as const;

// Note: Using shared MetricCard from @/components/shared

// ============================================================================
// MAIN COMPONENT (PRESENTER)
// ============================================================================

export const FulfillmentDashboardPresenter = memo(function FulfillmentDashboardPresenter({
  confirmedOrders,
  pickedOrders,
  activeShipments,
  fulfillmentSummary,
  summaryState,
  summaryWarning,
  loadingConfirmed,
  loadingPicked,
  loadingShipments,
  loadingSummary,
  importFulfillmentMutation,
  onPickOrder,
  onShipOrder,
  onViewOrder,
  onConfirmDelivery,
  highlightOrderIds,
  className,
}: FulfillmentDashboardPresenterProps) {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const trackedShipments = (activeShipments?.shipments ?? []).filter(
    (shipment) => shipment.status !== 'delivered' && shipment.status !== 'returned'
  );

  const stats = buildFulfillmentStats({
    fulfillmentSummary,
    summaryState,
  });

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: queryKeys.orders.fulfillment() });
    await queryClient.invalidateQueries({ queryKey: queryKeys.orders.shipments() });
    setIsRefreshing(false);
  }, [queryClient]);

  const isLoading = loadingConfirmed || loadingPicked || loadingShipments || loadingSummary;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Banner when navigated from orders list with selected orders */}
      {highlightOrderIds && highlightOrderIds.length > 0 && (
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
          <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle>Orders selected from list</AlertTitle>
          <AlertDescription>
            {highlightOrderIds.length} order{highlightOrderIds.length !== 1 ? "s" : ""} selected.
            Use the Ship button per order in the shipping queue to create shipments with carrier and
            tracking details.
          </AlertDescription>
        </Alert>
      )}

      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Fulfillment Overview</h2>
          <p className="text-sm text-muted-foreground">
            Live order processing status (updates every 30s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportDialogOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import Shipments
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {summaryWarning ? (
        <Alert className="border-amber-300 bg-amber-50 text-amber-950">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{summaryWarning}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Orders to Pick"
          value={stats.toPick ?? '—'}
          subtitle={getSummaryMetricSubtitle({
            summaryState,
            readySubtitle: 'Open or in progress',
          })}
          icon={Package}
          className={STAT_CARD_STYLES.info.className}
          iconClassName={STAT_CARD_STYLES.info.iconClassName}
          isLoading={isLoading}
        />
        <MetricCard
          title="Ready to Ship"
          value={stats.readyToShip ?? '—'}
          subtitle={getSummaryMetricSubtitle({
            summaryState,
            readySubtitle: 'Packed and waiting',
          })}
          icon={Truck}
          className={STAT_CARD_STYLES.success.className}
          iconClassName={STAT_CARD_STYLES.success.iconClassName}
          isLoading={isLoading}
        />
        <MetricCard
          title="Shipment Queue"
          value={stats.inTransit ?? '—'}
          subtitle={getSummaryMetricSubtitle({
            summaryState,
            readySubtitle: 'Pending follow-up',
          })}
          icon={MapPin}
          className={STAT_CARD_STYLES.default.className}
          iconClassName={STAT_CARD_STYLES.default.iconClassName}
          isLoading={isLoading}
        />
        <MetricCard
          title="Overdue"
          value={stats.overdue ?? '—'}
          subtitle={getSummaryMetricSubtitle({
            summaryState,
            readySubtitle: 'Needs attention',
          })}
          icon={AlertTriangle}
          className={stats.overdue != null && stats.overdue > 0 ? STAT_CARD_STYLES.warning.className : STAT_CARD_STYLES.default.className}
          iconClassName={stats.overdue != null && stats.overdue > 0 ? STAT_CARD_STYLES.warning.iconClassName : STAT_CARD_STYLES.default.iconClassName}
          isLoading={isLoading}
        />
      </div>

      {/* Picking Queue */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Picking Queue</CardTitle>
              <CardDescription>
                Orders ready to start or resume picking
              </CardDescription>
            </div>
            <Link
              to="/orders"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <PickingQueueTable
            orders={(confirmedOrders?.orders ?? []).map(order => ({
              ...order,
              total: order.total ?? 0,
              status: order.status as "draft" | "confirmed" | "picking" | "picked" | "shipped" | "delivered" | "cancelled"
            }))}
            isLoading={loadingConfirmed}
            onOpenPicking={onPickOrder}
            onViewOrder={onViewOrder}
          />
        </CardContent>
      </Card>

      {/* Shipping Queue */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Shipping Queue</CardTitle>
              <CardDescription>
                Orders picked and ready to ship
              </CardDescription>
            </div>
            <Link
              to="/orders"
              search={{ status: "picked" }}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <ShippingQueueTable
            orders={(pickedOrders?.orders ?? []).map(order => ({
              ...order,
              total: order.total ?? 0,
              status: order.status as "draft" | "confirmed" | "picking" | "picked" | "shipped" | "delivered" | "cancelled"
            }))}
            isLoading={loadingPicked}
            onShipOrder={onShipOrder}
            onViewOrder={onViewOrder}
          />
        </CardContent>
      </Card>

      <FulfillmentImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        importMutation={importFulfillmentMutation}
      />

      {/* Shipment Recovery Queue */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Shipment Recovery Queue</CardTitle>
              <CardDescription>
                Pending, in transit, out for delivery, and failed shipments
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DeliveryTrackingTable
            shipments={trackedShipments}
            isLoading={loadingShipments}
            onConfirmDelivery={onConfirmDelivery}
          />
        </CardContent>
      </Card>
    </div>
  );
});

// ============================================================================
// PICKING QUEUE TABLE
// ============================================================================

interface PickingQueueTableProps {
  orders: Array<{
    id: string;
    orderNumber: string;
    customerId: string;
    total: number;
    orderDate: Date | string | null;
    createdAt: Date;
    status: OrderStatus;
  }>;
  isLoading: boolean;
  onOpenPicking?: (orderId: string) => void;
  onViewOrder?: (orderId: string) => void;
}

function PickingQueueTable({
  orders,
  isLoading,
  onOpenPicking,
  onViewOrder,
}: PickingQueueTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32 flex-1" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No orders waiting to be picked</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order #</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="w-[180px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => {
          const overdue = isOverdueOrder(order.orderDate);

          return (
            <TableRow key={order.id} className={cn(overdue && "bg-orange-50")}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Link
                    to="/orders/$orderId"
                    params={{ orderId: order.id }}
                    className="font-medium hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                  {overdue && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Order is overdue (3+ days)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(order.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell>{getOrderStatusBadge(order.status)}</TableCell>
              <TableCell className="text-right font-medium">
                <FormatAmount amount={order.total} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenPicking?.(order.id)}
                  >
                    <Package className="h-4 w-4 mr-1" />
                    {order.status === "picking" ? "Resume Picking" : "Open Picking"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onViewOrder?.(order.id)}
                    aria-label={`View order ${order.orderNumber}`}
                  >
                    <Eye className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ============================================================================
// SHIPPING QUEUE TABLE
// ============================================================================

interface ShippingQueueTableProps {
  orders: Array<{
    id: string;
    orderNumber: string;
    customerId: string;
    total: number;
    orderDate: Date | string | null;
    createdAt: Date;
    status: OrderStatus;
  }>;
  isLoading: boolean;
  onShipOrder?: (orderId: string) => void;
  onViewOrder?: (orderId: string) => void;
}

function ShippingQueueTable({
  orders,
  isLoading,
  onShipOrder,
  onViewOrder,
}: ShippingQueueTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32 flex-1" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No orders ready to ship</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order #</TableHead>
          <TableHead>Picked Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="w-[180px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => {
          const overdue = isOverdueOrder(order.orderDate);

          return (
            <TableRow key={order.id} className={cn(overdue && "bg-orange-50")}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Link
                    to="/orders/$orderId"
                    params={{ orderId: order.id }}
                    className="font-medium hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                  {overdue && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Order is overdue (3+ days)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(order.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell>{getOrderStatusBadge(order.status)}</TableCell>
              <TableCell className="text-right font-medium">
                <FormatAmount amount={order.total} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => onShipOrder?.(order.id)}
                  >
                    <Truck className="h-4 w-4 mr-1" />
                    Ship
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onViewOrder?.(order.id)}
                    aria-label={`View order ${order.orderNumber}`}
                  >
                    <Eye className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ============================================================================
// DELIVERY TRACKING TABLE
// ============================================================================

interface DeliveryTrackingTableProps {
  shipments: Array<{
    id: string;
    shipmentNumber: string;
    orderId: string;
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    status: ShipmentStatus;
    shippedAt: Date | null;
  }>;
  isLoading: boolean;
  onConfirmDelivery?: (shipmentId: string) => void;
}

function DeliveryTrackingTable({
  shipments,
  isLoading,
  onConfirmDelivery,
}: DeliveryTrackingTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32 flex-1" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (shipments.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No shipments in transit</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Shipment #</TableHead>
          <TableHead>Carrier</TableHead>
          <TableHead>Tracking</TableHead>
          <TableHead>Shipped</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[120px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {shipments.map((shipment) => (
          <TableRow key={shipment.id}>
            <TableCell>
              <span className="font-medium">{shipment.shipmentNumber}</span>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {shipment.carrier ?? "N/A"}
            </TableCell>
            <TableCell>
              {shipment.trackingNumber ? (
                shipment.trackingUrl ? (
                  <a
                    href={shipment.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {shipment.trackingNumber}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span>{shipment.trackingNumber}</span>
                )
              ) : (
                <span className="text-muted-foreground">No tracking</span>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {shipment.shippedAt
                ? format(new Date(shipment.shippedAt), "MMM d, yyyy")
                : "N/A"}
            </TableCell>
            <TableCell>{getShipmentStatusBadge(shipment.status)}</TableCell>
            <TableCell>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onConfirmDelivery?.(shipment.id)}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Confirm
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ============================================================================
// BACKWARDS COMPATIBILITY
// ============================================================================

/** @deprecated Use FulfillmentDashboardContainer instead */
export const FulfillmentDashboard = FulfillmentDashboardPresenter;

/** @deprecated Use FulfillmentDashboardContainerProps instead */
export type FulfillmentDashboardProps = FulfillmentDashboardContainerProps;
