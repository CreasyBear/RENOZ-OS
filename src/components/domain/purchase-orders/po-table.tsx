/**
 * Purchase Order Table Component
 *
 * Data table displaying purchase orders with sorting, status badges and quick actions.
 */

import { useState, useMemo, useCallback } from 'react';
import { MoreHorizontal, Truck, ChevronUp, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import type { PurchaseOrderTableData, PurchaseOrderStatus } from '@/lib/schemas/purchase-orders';

// ============================================================================
// TYPES
// ============================================================================

type SortField = 'poNumber' | 'supplierName' | 'status' | 'orderDate' | 'requiredDate' | 'totalAmount';
type SortDirection = 'asc' | 'desc';

interface POTableProps {
  orders: PurchaseOrderTableData[];
  isLoading?: boolean;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onReceive?: (id: string) => void;
}

// ============================================================================
// STATUS BADGE
// ============================================================================

const statusConfig: Record<
  PurchaseOrderStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  pending_approval: { label: 'Pending Approval', variant: 'outline' },
  approved: { label: 'Approved', variant: 'default' },
  ordered: { label: 'Ordered', variant: 'default' },
  partial_received: { label: 'Partial', variant: 'outline' },
  received: { label: 'Received', variant: 'default' },
  closed: { label: 'Closed', variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  const config = statusConfig[status] || { label: status, variant: 'secondary' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
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
  currentSort: { field: SortField; direction: SortDirection };
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
        (currentSort.direction === 'asc' ? (
          <ChevronUp className="ml-1 h-4 w-4" />
        ) : (
          <ChevronDown className="ml-1 h-4 w-4" />
        ))}
    </Button>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function TableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>PO #</TableHead>
          <TableHead>Supplier</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Order Date</TableHead>
          <TableHead>Required</TableHead>
          <TableHead className="text-right">Value</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-32" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-16" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-20" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-20" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="ml-auto h-4 w-20" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-8 w-8" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Truck className="text-muted-foreground mb-4 h-12 w-12" />
      <h3 className="mb-2 text-lg font-semibold">No purchase orders</h3>
      <p className="text-muted-foreground text-sm">
        Create your first purchase order to start tracking supplier orders.
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function POTable({
  orders,
  isLoading = false,
  onView,
  onEdit,
  onDelete,
  onReceive,
}: POTableProps) {
  const [sort, setSort] = useState<{ field: SortField; direction: SortDirection }>({
    field: 'orderDate',
    direction: 'desc',
  });

  const handleSort = useCallback((field: SortField) => {
    setSort((current) => ({
      field,
      direction: current.field === field && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  // Sort orders
  const sortedOrders = useMemo(() => {
    const sorted = [...orders];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sort.field) {
        case 'poNumber':
          comparison = a.poNumber.localeCompare(b.poNumber);
          break;
        case 'supplierName':
          comparison = (a.supplierName || '').localeCompare(b.supplierName || '');
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'orderDate':
          const dateA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
          const dateB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'requiredDate':
          const reqA = a.requiredDate ? new Date(a.requiredDate).getTime() : 0;
          const reqB = b.requiredDate ? new Date(b.requiredDate).getTime() : 0;
          comparison = reqA - reqB;
          break;
        case 'totalAmount':
          comparison = a.totalAmount - b.totalAmount;
          break;
        default:
          comparison = 0;
      }
      return sort.direction === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [orders, sort]);

  if (isLoading) {
    return <TableSkeleton />;
  }

  if (orders.length === 0) {
    return <EmptyState />;
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <SortHeader label="PO #" field="poNumber" currentSort={sort} onSort={handleSort} />
          </TableHead>
          <TableHead>
            <SortHeader label="Supplier" field="supplierName" currentSort={sort} onSort={handleSort} />
          </TableHead>
          <TableHead>
            <SortHeader label="Status" field="status" currentSort={sort} onSort={handleSort} />
          </TableHead>
          <TableHead>
            <SortHeader label="Order Date" field="orderDate" currentSort={sort} onSort={handleSort} />
          </TableHead>
          <TableHead>
            <SortHeader label="Required" field="requiredDate" currentSort={sort} onSort={handleSort} />
          </TableHead>
          <TableHead className="text-right">
            <SortHeader label="Value" field="totalAmount" currentSort={sort} onSort={handleSort} />
          </TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedOrders.map((order) => (
          <TableRow
            key={order.id}
            className={cn('hover:bg-muted/50 cursor-pointer')}
            onClick={() => onView?.(order.id)}
          >
            <TableCell className="font-medium">{order.poNumber}</TableCell>
            <TableCell>{order.supplierName || 'Unknown Supplier'}</TableCell>
            <TableCell>
              <StatusBadge status={order.status} />
            </TableCell>
            <TableCell>{formatDate(order.orderDate)}</TableCell>
            <TableCell>{formatDate(order.requiredDate)}</TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(order.totalAmount, { cents: false })}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onView?.(order.id)}>
                    View Details
                  </DropdownMenuItem>
                  {(order.status === 'ordered' || order.status === 'partial_received') && (
                    <DropdownMenuItem onClick={() => onReceive?.(order.id)}>
                      Receive Goods
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {order.status === 'draft' && (
                    <DropdownMenuItem onClick={() => onEdit?.(order.id)}>
                      Edit Order
                    </DropdownMenuItem>
                  )}
                  {order.status === 'draft' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete?.(order.id)}
                        className="text-destructive"
                      >
                        Delete Order
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export type { POTableProps, PurchaseOrderTableData };
