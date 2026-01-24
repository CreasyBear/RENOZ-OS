/**
 * FulfillmentDashboard Component
 *
 * Operations dashboard for order fulfillment workflow.
 * Shows orders in various fulfillment stages with quick actions.
 *
 * Features:
 * - Summary cards: Orders to pick, Ready to ship, In transit, Overdue
 * - Picking queue table: Orders in "confirmed" status
 * - Shipping queue table: Orders in "picked" status
 * - Delivery tracking section: Active shipments
 * - 30s polling for live updates
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-FULFILLMENT-DASHBOARD)
 */

import { memo, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { FormatAmount } from "@/components/shared/format";
import { toastSuccess, toastError } from "@/hooks/use-toast";
import { listOrders, updateOrderStatus } from "@/lib/server/functions/orders";
import { listShipments } from "@/lib/server/functions/order-shipments";
import type { OrderStatus, ShipmentStatus } from "@/lib/schemas/orders";

// ============================================================================
// TYPES
// ============================================================================

export interface FulfillmentDashboardProps {
  onShipOrder?: (orderId: string) => void;
  onViewOrder?: (orderId: string) => void;
  onConfirmDelivery?: (shipmentId: string) => void;
  className?: string;
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

const POLLING_INTERVAL = 30000; // 30 seconds

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
// STAT CARD COMPONENT
// ============================================================================

interface StatCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  variant?: "default" | "warning" | "success" | "info";
  loading?: boolean;
}

function StatCard({ title, value, subtitle, icon, variant = "default", loading }: StatCardProps) {
  const variantStyles = {
    default: "border-gray-200",
    warning: "border-orange-200 bg-orange-50",
    success: "border-green-200 bg-green-50",
    info: "border-blue-200 bg-blue-50",
  };

  const iconStyles = {
    default: "text-gray-400",
    warning: "text-orange-500",
    success: "text-green-500",
    info: "text-blue-500",
  };

  if (loading) {
    return (
      <Card className={cn("transition-colors", variantStyles[variant])}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-5 rounded" />
          </div>
          <Skeleton className="mt-2 h-8 w-16" />
          <Skeleton className="mt-1 h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("transition-colors", variantStyles[variant])}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">{title}</span>
          <span className={iconStyles[variant]}>{icon}</span>
        </div>
        <div className="mt-2">
          <span className="text-3xl font-semibold text-gray-900">{value}</span>
        </div>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const FulfillmentDashboard = memo(function FulfillmentDashboard({
  onShipOrder,
  onViewOrder,
  onConfirmDelivery,
  className,
}: FulfillmentDashboardProps) {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch orders in "confirmed" status (picking queue)
  const { data: confirmedOrders, isLoading: loadingConfirmed } = useQuery({
    queryKey: ["orders", "fulfillment", "confirmed"],
    queryFn: async () => {
      const result = await listOrders({
        data: {
          page: 1,
          pageSize: 50,
          status: "confirmed",
          sortBy: "createdAt",
          sortOrder: "asc",
        },
      });
      return result;
    },
    refetchInterval: POLLING_INTERVAL,
  });

  // Fetch orders in "picked" status (shipping queue)
  const { data: pickedOrders, isLoading: loadingPicked } = useQuery({
    queryKey: ["orders", "fulfillment", "picked"],
    queryFn: async () => {
      const result = await listOrders({
        data: {
          page: 1,
          pageSize: 50,
          status: "picked",
          sortBy: "createdAt",
          sortOrder: "asc",
        },
      });
      return result;
    },
    refetchInterval: POLLING_INTERVAL,
  });

  // Fetch active shipments (in_transit)
  const { data: activeShipments, isLoading: loadingShipments } = useQuery({
    queryKey: ["shipments", "fulfillment", "active"],
    queryFn: async () => {
      const result = await listShipments({
        data: {
          page: 1,
          pageSize: 50,
          status: "in_transit",
          sortBy: "createdAt",
          sortOrder: "desc",
        },
      });
      return result;
    },
    refetchInterval: POLLING_INTERVAL,
  });

  // Start picking mutation
  const startPickingMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return updateOrderStatus({
        data: {
          id: orderId,
          data: {
            status: "picking",
          },
        },
      });
    },
    onSuccess: () => {
      toastSuccess("Order moved to picking");
      queryClient.invalidateQueries({ queryKey: ["orders", "fulfillment"] });
    },
    onError: () => {
      toastError("Failed to start picking");
    },
  });

  // Complete picking mutation
  const completePickingMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return updateOrderStatus({
        data: {
          id: orderId,
          data: {
            status: "picked",
          },
        },
      });
    },
    onSuccess: () => {
      toastSuccess("Order ready for shipping");
      queryClient.invalidateQueries({ queryKey: ["orders", "fulfillment"] });
    },
    onError: () => {
      toastError("Failed to complete picking");
    },
  });

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
    await queryClient.invalidateQueries({ queryKey: ["orders", "fulfillment"] });
    await queryClient.invalidateQueries({ queryKey: ["shipments", "fulfillment"] });
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
        <StatCard
          title="Orders to Pick"
          value={stats.toPick}
          subtitle="Awaiting fulfillment"
          icon={<Package className="h-5 w-5" />}
          variant="info"
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
        <StatCard
          title="In Transit"
          value={stats.inTransit}
          subtitle="Active shipments"
          icon={<MapPin className="h-5 w-5" />}
          variant="default"
          loading={isLoading}
        />
        <StatCard
          title="Overdue"
          value={stats.overdue}
          subtitle="Needs attention"
          icon={<AlertTriangle className="h-5 w-5" />}
          variant={stats.overdue > 0 ? "warning" : "default"}
          loading={isLoading}
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
            orders={confirmedOrders?.orders ?? []}
            isLoading={loadingConfirmed}
            onStartPicking={(id) => startPickingMutation.mutate(id)}
            onCompletePicking={(id) => completePickingMutation.mutate(id)}
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
            orders={pickedOrders?.orders ?? []}
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
                <FormatAmount amount={order.total} cents={false} />
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
                <FormatAmount amount={order.total} cents={false} />
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
