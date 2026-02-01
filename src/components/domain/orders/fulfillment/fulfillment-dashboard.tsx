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
 * - Summary cards: Orders to pick, Ready to ship, In transit, Overdue
 * - Picking queue table: Orders in "confirmed" status
 * - Shipping queue table: Orders in "picked" status
 * - Delivery tracking section: Active shipments
 *
 * @see ./fulfillment-dashboard-container.tsx (container)
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-FULFILLMENT-DASHBOARD)
 */

import { memo, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { UseMutationResult } from "@tanstack/react-query";
import type { UpdateOrderStatusInput } from "@/hooks/orders/use-order-status";
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
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { FormatAmount, MetricCard } from "@/components/shared";
import { toastSuccess, toastError } from "@/hooks";
import type { OrderStatus, ShipmentStatus } from "@/lib/schemas/orders";

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
  onShipOrder?: (orderId: string) => void;
  onViewOrder?: (orderId: string) => void;
  onConfirmDelivery?: (shipmentId: string) => void;
  className?: string;
}

/**
 * Presenter props - what the container passes to the presenter
 */
export interface FulfillmentDashboardPresenterProps extends FulfillmentDashboardContainerProps {
  /** @source useOrders({ status: 'confirmed' }) hook */
  confirmedOrders: OrderListResult | null;
  /** @source useOrders({ status: 'picked' }) hook */
  pickedOrders: OrderListResult | null;
  /** @source useShipments({ status: 'in_transit' }) hook */
  activeShipments: ShipmentListResult | null;
  /** Loading state for confirmed orders */
  loadingConfirmed: boolean;
  /** Loading state for picked orders */
  loadingPicked: boolean;
  /** Loading state for shipments */
  loadingShipments: boolean;
  /** @source useUpdateOrderStatus hook */
  updateOrderStatusMutation: UseMutationResult<unknown, Error, UpdateOrderStatusInput>;
}

interface FulfillmentStats {
  toPick: number;
  readyToShip: number;
  inTransit: number;
  overdue: number;
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

function isOverdue(orderDate: string | Date): boolean {
  const date = typeof orderDate === "string" ? parseISO(orderDate) : orderDate;
  return differenceInDays(new Date(), date) > 3;
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
  loadingConfirmed,
  loadingPicked,
  loadingShipments,
  updateOrderStatusMutation,
  onShipOrder,
  onViewOrder,
  onConfirmDelivery,
  className,
}: FulfillmentDashboardPresenterProps) {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mutation handlers with toast feedback
  const handleStartPicking = useCallback((orderId: string) => {
    updateOrderStatusMutation.mutate(
      { id: orderId, status: 'picking' },
      {
        onSuccess: () => toastSuccess("Order moved to picking"),
        onError: () => toastError("Failed to start picking"),
      }
    );
  }, [updateOrderStatusMutation]);

  const handleCompletePicking = useCallback((orderId: string) => {
    updateOrderStatusMutation.mutate(
      { id: orderId, status: 'picked' },
      {
        onSuccess: () => toastSuccess("Order ready for shipping"),
        onError: () => toastError("Failed to complete picking"),
      }
    );
  }, [updateOrderStatusMutation]);

  // Calculate stats
  const stats: FulfillmentStats = {
    toPick: confirmedOrders?.total ?? 0,
    readyToShip: pickedOrders?.total ?? 0,
    inTransit: activeShipments?.total ?? 0,
    overdue: (confirmedOrders?.orders ?? []).filter((o) => isOverdue(o.createdAt)).length +
             (pickedOrders?.orders ?? []).filter((o) => isOverdue(o.createdAt)).length,
  };

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: queryKeys.orders.fulfillment() });
    await queryClient.invalidateQueries({ queryKey: queryKeys.orders.shipments() });
    setIsRefreshing(false);
  }, [queryClient]);

  const isLoading = loadingConfirmed || loadingPicked || loadingShipments;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Fulfillment Overview</h2>
          <p className="text-sm text-muted-foreground">
            Live order processing status (updates every 30s)
          </p>
        </div>
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

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Orders to Pick"
          value={stats.toPick}
          subtitle="Awaiting fulfillment"
          icon={Package}
          className={STAT_CARD_STYLES.info.className}
          iconClassName={STAT_CARD_STYLES.info.iconClassName}
          isLoading={isLoading}
        />
        <MetricCard
          title="Ready to Ship"
          value={stats.readyToShip}
          subtitle="Packed and waiting"
          icon={Truck}
          className={STAT_CARD_STYLES.success.className}
          iconClassName={STAT_CARD_STYLES.success.iconClassName}
          isLoading={isLoading}
        />
        <MetricCard
          title="In Transit"
          value={stats.inTransit}
          subtitle="Active shipments"
          icon={MapPin}
          className={STAT_CARD_STYLES.default.className}
          iconClassName={STAT_CARD_STYLES.default.iconClassName}
          isLoading={isLoading}
        />
        <MetricCard
          title="Overdue"
          value={stats.overdue}
          subtitle="Needs attention"
          icon={AlertTriangle}
          className={stats.overdue > 0 ? STAT_CARD_STYLES.warning.className : STAT_CARD_STYLES.default.className}
          iconClassName={stats.overdue > 0 ? STAT_CARD_STYLES.warning.iconClassName : STAT_CARD_STYLES.default.iconClassName}
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
                Orders confirmed and ready to be picked
              </CardDescription>
            </div>
            <Link
              to="/orders"
              search={{ status: "confirmed" }}
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
            onStartPicking={handleStartPicking}
            onCompletePicking={handleCompletePicking}
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

      {/* Active Shipments */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Delivery Tracking</CardTitle>
              <CardDescription>
                Active shipments in transit
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DeliveryTrackingTable
            shipments={activeShipments?.shipments ?? []}
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
    createdAt: Date;
    status: OrderStatus;
  }>;
  isLoading: boolean;
  onStartPicking: (orderId: string) => void;
  onCompletePicking: (orderId: string) => void;
  onViewOrder?: (orderId: string) => void;
}

function PickingQueueTable({
  orders,
  isLoading,
  onStartPicking,
  onCompletePicking,
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
          const overdue = isOverdue(order.createdAt);
          const isPicking = order.status === "picking";

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
                  {isPicking ? (
                    <Button
                      size="sm"
                      onClick={() => onCompletePicking(order.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Done
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onStartPicking(order.id)}
                    >
                      <Package className="h-4 w-4 mr-1" />
                      Pick
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onViewOrder?.(order.id)}
                  >
                    <Eye className="h-4 w-4" />
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
          const overdue = isOverdue(order.createdAt);

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
                  >
                    <Eye className="h-4 w-4" />
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
