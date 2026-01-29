/**
 * Pricing Table Component
 *
 * Data table for displaying supplier price lists with sorting.
 * Shows price, quantity tiers, discounts, and validity periods.
 *
 * @see SUPP-PRICING-MANAGEMENT story
 */

import { useState, useMemo, useCallback } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal, Star, Package, Percent, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import {
  type PriceListRow,
  type PriceListStatus,
  priceListStatusLabels,
} from '@/lib/schemas/pricing';

// ============================================================================
// TYPES
// ============================================================================

type SortField = 'productName' | 'supplierName' | 'effectivePrice' | 'minQuantity' | 'discountPercent' | 'effectiveDate' | 'status';
type SortDirection = 'asc' | 'desc';

interface PricingTableProps {
  items: PriceListRow[];
  isLoading?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSetPreferred?: (id: string, preferred: boolean) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

const statusVariants: Record<PriceListStatus, 'default' | 'secondary' | 'destructive' | 'outline'> =
  {
    active: 'default',
    expired: 'destructive',
    draft: 'secondary',
  };

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatQuantityRange(min: number, max: number | null): string {
  if (max === null) {
    return `${min}+`;
  }
  if (min === max) {
    return String(min);
  }
  return `${min}-${max}`;
}

// ============================================================================
// SORT HEADER COMPONENT
// ============================================================================

function SortHeader({
  label,
  field,
  currentSort,
  onSort,
  align = 'left',
}: {
  label: string;
  field: SortField;
  currentSort: { field: SortField; direction: SortDirection };
  onSort: (field: SortField) => void;
  align?: 'left' | 'center' | 'right';
}) {
  const isActive = currentSort.field === field;
  return (
    <Button
      variant="ghost"
      size="sm"
      className={`h-8 px-2 -ml-2 font-medium ${align === 'right' ? 'ml-auto' : ''} ${align === 'center' ? 'mx-auto' : ''}`}
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
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Package className="text-muted-foreground mb-3 h-12 w-12" />
      <p className="font-medium">No Price Lists Found</p>
      <p className="text-muted-foreground text-sm">Add supplier pricing to start tracking costs.</p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function PricingTable({
  items,
  isLoading = false,
  onEdit,
  onDelete,
  onSetPreferred,
}: PricingTableProps) {
  const [sort, setSort] = useState<{ field: SortField; direction: SortDirection }>({
    field: 'effectiveDate',
    direction: 'desc',
  });

  const handleSort = useCallback((field: SortField) => {
    setSort((current) => ({
      field,
      direction: current.field === field && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  // Sort items
  const sortedItems = useMemo(() => {
    const sorted = [...items];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sort.field) {
        case 'productName':
          comparison = (a.productName || '').localeCompare(b.productName || '');
          break;
        case 'supplierName':
          comparison = (a.supplierName || '').localeCompare(b.supplierName || '');
          break;
        case 'effectivePrice':
          comparison = a.effectivePrice - b.effectivePrice;
          break;
        case 'minQuantity':
          comparison = a.minQuantity - b.minQuantity;
          break;
        case 'discountPercent':
          comparison = (a.discountPercent ?? 0) - (b.discountPercent ?? 0);
          break;
        case 'effectiveDate':
          const dateA = a.effectiveDate ? new Date(a.effectiveDate).getTime() : 0;
          const dateB = b.effectiveDate ? new Date(b.effectiveDate).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = 0;
      }
      return sort.direction === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [items, sort]);

  if (isLoading) {
    return <TableSkeleton />;
  }

  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortHeader label="Product" field="productName" currentSort={sort} onSort={handleSort} />
            </TableHead>
            <TableHead>
              <SortHeader label="Supplier" field="supplierName" currentSort={sort} onSort={handleSort} />
            </TableHead>
            <TableHead className="text-right">
              <SortHeader label="Price" field="effectivePrice" currentSort={sort} onSort={handleSort} align="right" />
            </TableHead>
            <TableHead className="text-center">
              <SortHeader label="Qty Range" field="minQuantity" currentSort={sort} onSort={handleSort} align="center" />
            </TableHead>
            <TableHead className="text-center">
              <SortHeader label="Discount" field="discountPercent" currentSort={sort} onSort={handleSort} align="center" />
            </TableHead>
            <TableHead>
              <SortHeader label="Valid Period" field="effectiveDate" currentSort={sort} onSort={handleSort} />
            </TableHead>
            <TableHead className="text-center">
              <SortHeader label="Status" field="status" currentSort={sort} onSort={handleSort} align="center" />
            </TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  {item.isPreferredPrice && (
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  )}
                  <div>
                    <Link
                      to="/products/$productId"
                      params={{ productId: item.productId }}
                      className="font-medium hover:underline"
                    >
                      {item.productName || 'Unknown Product'}
                    </Link>
                    {item.productSku && (
                      <p className="text-muted-foreground text-xs">SKU: {item.productSku}</p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Link
                  to="/suppliers/$supplierId"
                  params={{ supplierId: item.supplierId }}
                  className="text-sm hover:underline"
                >
                  {item.supplierName || 'Unknown Supplier'}
                </Link>
              </TableCell>
              <TableCell className="text-right">
                <div>
                  <p className="font-medium">
                    {formatCurrency(item.effectivePrice, { cents: false })}
                  </p>
                  {item.effectivePrice !== item.price && (
                    <p className="text-muted-foreground text-xs line-through">
                      {formatCurrency(item.price, { cents: false })}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-muted-foreground text-sm">
                  {formatQuantityRange(item.minQuantity, item.maxQuantity)}
                </span>
              </TableCell>
              <TableCell className="text-center">
                {item.discountPercent ? (
                  <Badge variant="outline" className="gap-1">
                    <Percent className="h-3 w-3" />
                    {item.discountPercent}%
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <p>{formatDate(item.effectiveDate)}</p>
                  {item.expiryDate && (
                    <p className="text-muted-foreground text-xs">
                      to {formatDate(item.expiryDate)}
                    </p>
                  )}
                  {item.leadTimeDays !== null && (
                    <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                      <Clock className="h-3 w-3" />
                      {item.leadTimeDays}d lead
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={statusVariants[item.status]}>
                  {priceListStatusLabels[item.status]}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(item.id)}>
                        Edit Price
                      </DropdownMenuItem>
                    )}
                    {onSetPreferred && (
                      <DropdownMenuItem
                        onClick={() => onSetPreferred(item.id, !item.isPreferredPrice)}
                      >
                        {item.isPreferredPrice ? 'Remove Preferred' : 'Set as Preferred'}
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem
                        onClick={() => onDelete(item.id)}
                        className="text-destructive"
                      >
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export { PricingTable };
export type { PricingTableProps, PriceListRow };
