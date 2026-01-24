/**
 * Pricing Table Component
 *
 * Data table for displaying supplier price lists.
 * Shows price, quantity tiers, discounts, and validity periods.
 *
 * @see SUPP-PRICING-MANAGEMENT story
 */

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
import { MoreHorizontal, Star, Package, Percent, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import {
  type PriceListRow,
  type PriceListStatus,
  priceListStatusLabels,
} from '@/lib/schemas/pricing';

// ============================================================================
// TYPES
// ============================================================================

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
            <TableHead>Product</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-center">Qty Range</TableHead>
            <TableHead className="text-center">Discount</TableHead>
            <TableHead>Valid Period</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
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
