/**
 * OrderListContent Component
 *
 * Presentational component that displays order list data.
 * Receives orders via props - data fetching happens at parent level.
 *
 * @see OrderList for the data-fetching wrapper
 */

import { memo, useState, useCallback, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  MoreHorizontal,
  Eye,
  Copy,
  Trash2,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { TruncateTooltip } from "@/components/shared/truncate-tooltip";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FormatAmount } from "@/components/shared/format";
import { format } from "date-fns";
// Order list item type - mirrors server function response
interface OrderListItem {
  id: string;
  orderNumber: string;
  customerId: string;
  status: string;
  paymentStatus: string;
  orderDate: string | null;
  dueDate: string | null;
  total: number | null;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: string;
    name: string;
  } | null;
}
import type { OrderStatus } from "@/lib/schemas/orders";

// ============================================================================
// TYPES
// ============================================================================

export interface OrderListContentProps {
  orders: OrderListItem[];
  isLoading?: boolean;
  error?: Error | null;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onViewOrder?: (orderId: string) => void;
  onDuplicateOrder?: (orderId: string) => void;
  onDeleteOrder?: (orderId: string) => void;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Package }
> = {
  draft: { label: "Draft", variant: "secondary", icon: Clock },
  confirmed: { label: "Confirmed", variant: "default", icon: CheckCircle },
  picking: { label: "Picking", variant: "default", icon: Package },
  picked: { label: "Picked", variant: "default", icon: Package },
  shipped: { label: "Shipped", variant: "default", icon: Truck },
  delivered: { label: "Delivered", variant: "outline", icon: CheckCircle },
  cancelled: { label: "Cancelled", variant: "destructive", icon: XCircle },
};

function getStatusBadge(status: OrderStatus) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export const OrderListContent = memo(function OrderListContent({
  orders,
  isLoading,
  error,
  page = 1,
  pageSize = 20,
  total = 0,
  onPageChange,
  onViewOrder,
  onDuplicateOrder,
  onDeleteOrder,
  className,
}: OrderListContentProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const totalPages = Math.ceil(total / pageSize);

  // Selection handlers
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(orders.map((o) => o.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [orders]
  );

  const handleSelectOrder = useCallback((orderId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(orderId);
      } else {
        next.delete(orderId);
      }
      return next;
    });
  }, []);

  const isAllSelected = useMemo(
    () => orders.length > 0 && orders.every((o: OrderListItem) => selectedIds.has(o.id)),
    [orders, selectedIds]
  );

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="text-center text-destructive">
            <XCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load orders</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Desktop skeleton */}
        <div className="hidden md:block">
          <div className="border rounded-lg">
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32 flex-1" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-8" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile skeleton */}
        <div className="md:hidden space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-32 mb-3" />
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (orders.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No orders found</p>
            <p className="text-sm mt-1">
              No orders match the current filters
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Desktop Table */}
      <div className="hidden md:block border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all orders"
                />
              </TableHead>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order: OrderListItem) => (
              <TableRow
                key={order.id}
                className={cn(selectedIds.has(order.id) && "bg-muted/50")}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(order.id)}
                    onCheckedChange={(checked) =>
                      handleSelectOrder(order.id, checked as boolean)
                    }
                    aria-label={`Select order ${order.orderNumber}`}
                  />
                </TableCell>
                <TableCell>
                  <Link
                    to="/orders/$orderId"
                    params={{ orderId: order.id }}
                    className="font-medium hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <span className="text-muted-foreground text-sm">
                    <TruncateTooltip
                      text={order.customer?.name || order.customerId}
                      maxLength={20}
                    />
                  </span>
                </TableCell>
                <TableCell>
                  {order.orderDate
                    ? format(new Date(order.orderDate), "dd/MM/yyyy")
                    : "-"}
                </TableCell>
                <TableCell>{getStatusBadge(order.status as OrderStatus)}</TableCell>
                <TableCell className="text-right font-medium">
                  <FormatAmount amount={Number(order.total)} cents={false} />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Order actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewOrder?.(order.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDuplicateOrder?.(order.id)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDeleteOrder?.(order.id)}
                        className="text-destructive"
                        disabled={order.status !== "draft"}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {orders.map((order: OrderListItem) => (
          <Card
            key={order.id}
            tabIndex={0}
            role="button"
            aria-label={`View order ${order.orderNumber}`}
            className={cn(
              "cursor-pointer hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary",
              selectedIds.has(order.id) && "bg-muted/50 ring-1 ring-primary"
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onViewOrder?.(order.id);
              }
            }}
            onClick={() => onViewOrder?.(order.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium">{order.orderNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.orderDate
                      ? format(new Date(order.orderDate), "dd/MM/yyyy")
                      : "-"}
                  </p>
                </div>
                {getStatusBadge(order.status as OrderStatus)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {order.customer?.name || order.customerId.slice(0, 8)}...
                </span>
                <span className="font-semibold">
                  <FormatAmount amount={Number(order.total)} cents={false} />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, total)} of {total} orders
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

export default OrderListContent;
