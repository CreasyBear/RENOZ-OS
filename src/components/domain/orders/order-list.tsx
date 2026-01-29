/**
 * OrderList Component (Presenter)
 *
 * Pure UI component for displaying orders in table/card format.
 * Responsive layout: mobile (cards), tablet (compact), desktop (full table).
 *
 * @source orders from useOrders hook via OrderListContainer
 * @source customer names from orders.customer join in listOrders server function
 * @source itemCount from order_items aggregate in listOrders server function
 *
 * @see STANDARDS.md Section 2: Component Architecture
 * @see src/hooks/orders/use-orders.ts (Hook)
 * @see src/server/functions/orders/orders.ts listOrders (Server)
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-LIST-UI)
 */

import { memo, useState, useCallback, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useOrders } from "@/hooks/orders";
// OrderListItem type is used via ReturnType<typeof useOrders>
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
  ChevronUp,
  ChevronDown,
  AlertCircle,
  ShoppingCart,
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
import type { OrderStatus, PaymentStatus } from "@/lib/schemas/orders";

// ============================================================================
// TYPES
// ============================================================================

export interface OrderListProps {
  filters: OrderFilters;
  onViewOrder?: (orderId: string) => void;
  onDuplicateOrder?: (orderId: string) => void;
  onDeleteOrder?: (orderId: string) => void;
  className?: string;
}

export interface OrderFilters {
  search?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  customerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minTotal?: number;
  maxTotal?: number;
}

type SortField = "orderNumber" | "orderDate" | "status" | "total" | "createdAt";
type SortDirection = "asc" | "desc";

interface SortState {
  field: SortField;
  direction: SortDirection;
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

// Check if order is overdue
function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

// Format due date with relative indicator
function formatDueDate(dueDate: string | null | undefined): { text: string; isOverdue: boolean; variant: 'default' | 'destructive' } {
  if (!dueDate) return { text: '-', isOverdue: false, variant: 'default' };
  
  const due = new Date(dueDate);
  const now = new Date();
  const isOver = due < now;
  
  // Calculate days difference
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  if (isOver) {
    return { 
      text: `${Math.abs(diffDays)}d overdue`, 
      isOverdue: true, 
      variant: 'destructive' 
    };
  }
  
  if (diffDays === 0) return { text: 'Today', isOverdue: false, variant: 'default' };
  if (diffDays === 1) return { text: 'Tomorrow', isOverdue: false, variant: 'default' };
  if (diffDays <= 7) return { text: `${diffDays}d`, isOverdue: false, variant: 'default' };
  
  return { text: format(due, 'dd/MM/yyyy'), isOverdue: false, variant: 'default' };
}

const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Pending", variant: "secondary" },
  partial: { label: "Partial", variant: "outline" },
  paid: { label: "Paid", variant: "default" },
  refunded: { label: "Refunded", variant: "outline" },
  overdue: { label: "Overdue", variant: "destructive" },
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

function getPaymentStatusBadge(paymentStatus: PaymentStatus) {
  const config = PAYMENT_STATUS_CONFIG[paymentStatus] ?? PAYMENT_STATUS_CONFIG.pending;
  
  return (
    <Badge variant={config.variant} className="text-xs">
      {config.label}
    </Badge>
  );
}

// ============================================================================
// SORT HEADER COMPONENT
// ============================================================================

function SortHeader({
  label,
  field,
  currentSort,
  onSort,
}: {
  label: string;
  field: SortField;
  currentSort: SortState;
  onSort: (field: SortField) => void;
}) {
  const isActive = currentSort.field === field;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 -ml-2 font-medium"
      onClick={() => onSort(field)}
    >
      {label}
      {isActive &&
        (currentSort.direction === "asc" ? (
          <ChevronUp className="ml-1 h-4 w-4" />
        ) : (
          <ChevronDown className="ml-1 h-4 w-4" />
        ))}
    </Button>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export const OrderList = memo(function OrderList({
  filters,
  onViewOrder,
  onDuplicateOrder,
  onDeleteOrder,
  className,
}: OrderListProps) {
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortState>({
    field: "createdAt",
    direction: "desc",
  });
  const pageSize = 20;

  // Handle sort toggle
  const handleSort = useCallback((field: SortField) => {
    setSort((current) => ({
      field,
      direction:
        current.field === field && current.direction === "asc"
          ? "desc"
          : "asc",
    }));
    setPage(1); // Reset to first page on sort change
  }, []);

  // Fetch orders using centralized hook (follows STANDARDS.md)
  const { data, isLoading, error } = useOrders({
    page,
    pageSize,
    search: filters.search,
    status: filters.status,
    paymentStatus: filters.paymentStatus,
    customerId: filters.customerId,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    minTotal: filters.minTotal,
    maxTotal: filters.maxTotal,
    sortBy: sort.field,
    sortOrder: sort.direction,
  });

  const orders = data?.orders ?? [];
  const total = data?.total ?? 0;
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
    () => orders.length > 0 && orders.every((o) => selectedIds.has(o.id)),
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
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-4 w-20" />
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
              {filters.search || filters.status
                ? "Try adjusting your filters"
                : "Create your first order to get started"}
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
              <TableHead className="min-w-[120px]">
                <SortHeader
                  label="Order #"
                  field="orderNumber"
                  currentSort={sort}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="min-w-[160px]">Customer</TableHead>
              <TableHead className="w-[100px]">
                <SortHeader
                  label="Date"
                  field="orderDate"
                  currentSort={sort}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="w-[90px]">Due</TableHead>
              <TableHead className="w-[110px]">
                <SortHeader
                  label="Status"
                  field="status"
                  currentSort={sort}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="w-[100px]">Payment</TableHead>
              <TableHead className="w-[70px] text-center">Items</TableHead>
              <TableHead className="w-[100px] text-right">
                <SortHeader
                  label="Total"
                  field="total"
                  currentSort={sort}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
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
                <TableCell className="max-w-[160px]">
                  <span className="text-sm truncate block">
                    {order.customer?.name ?? (
                      <span className="text-muted-foreground">
                        <TruncateTooltip text={order.customerId} maxLength={18} />
                      </span>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-sm">
                  {order.orderDate ? format(new Date(order.orderDate), "dd/MM/yyyy") : '-'}
                </TableCell>
                <TableCell>
                  {(() => {
                    const due = formatDueDate(order.dueDate);
                    return (
                      <div className={cn(
                        "flex items-center gap-1 text-xs",
                        due.isOverdue && "text-destructive font-medium"
                      )}>
                        {due.isOverdue && <AlertCircle className="h-3 w-3" />}
                        <span title={order.dueDate ? format(new Date(order.dueDate), 'dd/MM/yyyy') : undefined}>
                          {due.text}
                        </span>
                      </div>
                    );
                  })()}
                </TableCell>
                <TableCell>{getStatusBadge(order.status as OrderStatus)}</TableCell>
                <TableCell>{getPaymentStatusBadge(order.paymentStatus as PaymentStatus)}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                    <ShoppingCart className="h-3 w-3" />
                    <span>{order.itemCount ?? 0}</span>
                  </div>
                </TableCell>
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
                      <DropdownMenuItem
                        onClick={() => onViewOrder?.(order.id)}
                      >
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
        {orders.map((order) => (
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
                    {order.orderDate ? format(new Date(order.orderDate), "dd/MM/yyyy") : '-'}
                    {order.dueDate && (
                      <span className={cn(
                        "ml-2",
                        isOverdue(order.dueDate) && "text-destructive"
                      )}>
                        · Due {formatDueDate(order.dueDate).text}
                      </span>
                    )}
                  </p>
                </div>
                {getStatusBadge(order.status as OrderStatus)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground truncate max-w-[140px]">
                  {order.customer?.name ?? order.customerId.slice(0, 8)}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <ShoppingCart className="h-3 w-3" />
                    {order.itemCount ?? 0}
                  </span>
                  <span className="font-semibold">
                    <FormatAmount amount={Number(order.total)} cents={false} />
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, total)} of {total} orders
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
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
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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

export default OrderList;
