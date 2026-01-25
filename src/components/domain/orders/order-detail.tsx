/**
 * OrderDetail Component
 *
 * Complete order view with tabs for overview, items, fulfillment, and more.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-DETAIL-UI)
 */

import { memo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  Package,
  User,
  Calendar,
  Truck,
  FileText,
  Edit,
  Copy,
  Printer,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { FormatAmount } from "@/components/shared/format";
import { toastSuccess, toastError } from "@/hooks";
import {
  getOrderWithCustomer,
  updateOrderStatus,
  duplicateOrder,
  deleteOrder,
} from "@/lib/server/functions/orders";
import type { OrderStatus } from "@/lib/schemas/orders";

// ============================================================================
// TYPES
// ============================================================================

export interface OrderDetailProps {
  orderId: string;
  onBack?: () => void;
  onEdit?: () => void;
  onDuplicate?: (newOrderId: string) => void;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; icon: typeof Package; nextActions: OrderStatus[] }
> = {
  draft: {
    label: "Draft",
    color: "bg-gray-100 text-gray-800",
    icon: Clock,
    nextActions: ["confirmed", "cancelled"],
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-blue-100 text-blue-800",
    icon: CheckCircle,
    nextActions: ["picking", "cancelled"],
  },
  picking: {
    label: "Picking",
    color: "bg-yellow-100 text-yellow-800",
    icon: Package,
    nextActions: ["picked", "cancelled"],
  },
  picked: {
    label: "Picked",
    color: "bg-orange-100 text-orange-800",
    icon: Package,
    nextActions: ["shipped", "cancelled"],
  },
  shipped: {
    label: "Shipped",
    color: "bg-purple-100 text-purple-800",
    icon: Truck,
    nextActions: ["delivered"],
  },
  delivered: {
    label: "Delivered",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
    nextActions: [],
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-800",
    icon: XCircle,
    nextActions: [],
  },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  partial: { label: "Partial", variant: "outline" },
  paid: { label: "Paid", variant: "default" },
  overdue: { label: "Overdue", variant: "destructive" },
  refunded: { label: "Refunded", variant: "outline" },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const OrderDetail = memo(function OrderDetail({
  orderId,
  onBack,
  onEdit,
  onDuplicate,
  className,
}: OrderDetailProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch order with customer details
  const { data: order, isLoading, error } = useQuery({
    queryKey: queryKeys.orders.withCustomer(orderId),
    queryFn: () => getOrderWithCustomer({ data: { id: orderId } }),
    refetchInterval: 30000, // Poll every 30s for status changes
  });

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: async ({
      status,
      notes,
    }: {
      status: OrderStatus;
      notes?: string;
    }) => {
      return updateOrderStatus({
        data: { id: orderId, data: { status, notes } },
      });
    },
    onSuccess: () => {
      toastSuccess("Order status updated");
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.withCustomer(orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
    onError: () => {
      toastError("Failed to update status");
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async () => {
      return duplicateOrder({ data: { id: orderId } });
    },
    onSuccess: (result) => {
      toastSuccess(`Order duplicated as ${result.orderNumber}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      onDuplicate?.(result.id);
    },
    onError: () => {
      toastError("Failed to duplicate order");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return deleteOrder({ data: { id: orderId } });
    },
    onSuccess: () => {
      toastSuccess("Order deleted");
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      onBack?.();
    },
    onError: () => {
      toastError("Failed to delete order");
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  // Error state
  if (error || !order) {
    return (
      <Card className={className}>
        <CardContent className="py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-lg font-medium">Order not found</p>
            <p className="text-muted-foreground mt-1">
              The order you're looking for doesn't exist or has been deleted.
            </p>
            {onBack && (
              <Button variant="outline" className="mt-4" onClick={onBack}>
                Back to Orders
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status as OrderStatus] ?? STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;
  const paymentConfig = PAYMENT_STATUS_CONFIG[order.paymentStatus as string] ?? PAYMENT_STATUS_CONFIG.pending;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
            <Badge className={cn("gap-1", statusConfig.color)}>
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
            <Badge variant={paymentConfig.variant}>{paymentConfig.label}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Created {format(new Date(order.createdAt), "PPP")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Actions */}
          {statusConfig.nextActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  Update Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {statusConfig.nextActions.map((nextStatus) => (
                  <DropdownMenuItem
                    key={nextStatus}
                    onClick={() => statusMutation.mutate({ status: nextStatus })}
                  >
                    Mark as {STATUS_CONFIG[nextStatus].label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && order.status === "draft" && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Order
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => duplicateMutation.mutate()}
                disabled={duplicateMutation.isPending}
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {order.status === "draft" && (
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="fulfillment">Fulfillment</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{order.customer?.name ?? "Unknown"}</p>
                {order.customer?.email && (
                  <p className="text-sm text-muted-foreground">
                    {order.customer.email}
                  </p>
                )}
                {order.customer?.phone && (
                  <p className="text-sm text-muted-foreground">
                    {order.customer.phone}
                  </p>
                )}
                {order.customer?.taxId && (
                  <p className="text-sm text-muted-foreground">
                    ABN: {order.customer.taxId}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span><FormatAmount amount={Number(order.subtotal)} /></span>
                </div>
                {Number(order.discountAmount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-red-600">
                      -<FormatAmount amount={Number(order.discountAmount)} />
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (GST)</span>
                  <span><FormatAmount amount={Number(order.taxAmount)} /></span>
                </div>
                {Number(order.shippingAmount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span><FormatAmount amount={Number(order.shippingAmount)} /></span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span><FormatAmount amount={Number(order.total)} /></span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid</span>
                  <span><FormatAmount amount={Number(order.paidAmount)} /></span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>Balance Due</span>
                  <span><FormatAmount amount={Number(order.balanceDue)} /></span>
                </div>
              </CardContent>
            </Card>

            {/* Dates & Shipping */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" />
                  Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order Date</span>
                  <span>{format(new Date(order.orderDate), "dd/MM/yyyy")}</span>
                </div>
                {order.dueDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Due Date</span>
                    <span>{format(new Date(order.dueDate), "dd/MM/yyyy")}</span>
                  </div>
                )}
                {order.shippedDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipped</span>
                    <span>
                      {format(new Date(order.shippedDate), "dd/MM/yyyy")}
                    </span>
                  </div>
                )}
                {order.deliveredDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivered</span>
                    <span>
                      {format(new Date(order.deliveredDate), "dd/MM/yyyy")}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {(order.customerNotes || order.internalNotes) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {order.customerNotes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Customer Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">
                      {order.customerNotes}
                    </p>
                  </CardContent>
                </Card>
              )}
              {order.internalNotes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Internal Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">
                      {order.internalNotes}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
              <CardDescription>
                {order.lineItems?.length ?? 0} items in this order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.lineItems?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {item.product?.name ?? item.description}
                          </p>
                          {item.sku && (
                            <p className="text-sm text-muted-foreground">
                              SKU: {item.sku}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {item.notes}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        <FormatAmount amount={Number(item.unitPrice)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <FormatAmount amount={Number(item.taxAmount)} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <FormatAmount amount={Number(item.lineTotal)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fulfillment Tab */}
        <TabsContent value="fulfillment" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Fulfillment Status
              </CardTitle>
              <CardDescription>
                Track picking, packing, and shipping progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Fulfillment Progress */}
              <div className="flex items-center gap-4 mb-6">
                {["confirmed", "picking", "picked", "shipped", "delivered"].map(
                  (stage, index) => {
                    const stageConfig = STATUS_CONFIG[stage as OrderStatus];
                    const currentIndex = [
                      "confirmed",
                      "picking",
                      "picked",
                      "shipped",
                      "delivered",
                    ].indexOf(order.status as string);
                    const isComplete = index <= currentIndex;
                    const isCurrent = index === currentIndex;

                    return (
                      <div
                        key={stage}
                        className={cn(
                          "flex-1 text-center",
                          index > 0 && "border-l border-dashed"
                        )}
                      >
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2",
                            isComplete
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {isComplete ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <span className="text-xs">{index + 1}</span>
                          )}
                        </div>
                        <p
                          className={cn(
                            "text-xs",
                            isCurrent
                              ? "font-medium"
                              : "text-muted-foreground"
                          )}
                        >
                          {stageConfig.label}
                        </p>
                      </div>
                    );
                  }
                )}
              </div>

              {/* Line Item Fulfillment Status */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Ordered</TableHead>
                    <TableHead className="text-center">Picked</TableHead>
                    <TableHead className="text-center">Shipped</TableHead>
                    <TableHead className="text-center">Delivered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.lineItems?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.product?.name ?? item.description}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            Number(item.qtyPicked) >= Number(item.quantity)
                              ? "text-green-600"
                              : Number(item.qtyPicked) > 0
                                ? "text-yellow-600"
                                : ""
                          )}
                        >
                          {item.qtyPicked}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            Number(item.qtyShipped) >= Number(item.quantity)
                              ? "text-green-600"
                              : Number(item.qtyShipped) > 0
                                ? "text-yellow-600"
                                : ""
                          )}
                        >
                          {item.qtyShipped}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            Number(item.qtyDelivered) >= Number(item.quantity)
                              ? "text-green-600"
                              : Number(item.qtyDelivered) > 0
                                ? "text-yellow-600"
                                : ""
                          )}
                        >
                          {item.qtyDelivered}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>
                Order history and status changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Activity logging coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

export default OrderDetail;
