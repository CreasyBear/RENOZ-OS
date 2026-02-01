/**
 * Price Comparison Component
 *
 * Compare prices for the same product across multiple suppliers.
 * Highlights the lowest price and shows the preferred supplier.
 *
 * @see SUPP-PRICING-MANAGEMENT story
 */

import { Link } from '@tanstack/react-router';
import { Star, TrendingDown, Clock, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrgFormat } from '@/hooks/use-org-format';
import type { PriceComparisonItem } from '@/lib/schemas/pricing';

// ============================================================================
// TYPES
// ============================================================================

interface PriceComparisonProps {
  items: PriceComparisonItem[];
  isLoading?: boolean;
  onSetPreferred?: (productId: string, supplierId: string) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function ComparisonSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-24" />
              ))}
            </div>
          </CardContent>
        </Card>
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
      <p className="font-medium">No Products to Compare</p>
      <p className="text-muted-foreground text-sm">
        Add pricing data to compare prices across suppliers.
      </p>
    </div>
  );
}

// ============================================================================
// SUPPLIER PRICE CARD
// ============================================================================

interface SupplierPriceCardProps {
  supplier: PriceComparisonItem['suppliers'][0];
  isLowest: boolean;
  isPreferred: boolean;
  onSetPreferred?: () => void;
}

function SupplierPriceCard({
  supplier,
  isLowest,
  isPreferred,
  onSetPreferred,
}: SupplierPriceCardProps) {
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (amount: number) =>
    formatCurrency(amount, { cents: false, showCents: true });
  return (
    <div
      className={`relative rounded-lg border p-4 ${
        isLowest ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-border'
      }`}
    >
      {/* Badges */}
      <div className="absolute -top-2 right-2 flex gap-1">
        {isLowest && (
          <Badge variant="default" className="bg-green-600 text-xs">
            <TrendingDown className="mr-1 h-3 w-3" />
            Lowest
          </Badge>
        )}
        {isPreferred && (
          <Badge variant="secondary" className="text-xs">
            <Star className="mr-1 h-3 w-3 fill-yellow-400 text-yellow-400" />
            Preferred
          </Badge>
        )}
      </div>

      {/* Supplier name */}
      <Link
        to="/suppliers/$supplierId"
        params={{ supplierId: supplier.supplierId }}
        className="font-medium hover:underline"
      >
        {supplier.supplierName}
      </Link>

      {/* Price */}
      <div className="mt-2">
        <p className="text-2xl font-bold">
          {formatCurrencyDisplay(supplier.effectivePrice)}
        </p>
        {supplier.effectivePrice !== supplier.price && (
          <p className="text-muted-foreground text-sm line-through">
            {formatCurrencyDisplay(supplier.price)}
          </p>
        )}
        {supplier.discountPercent && (
          <Badge variant="outline" className="mt-1 text-xs">
            {supplier.discountPercent}% off
          </Badge>
        )}
      </div>

      {/* Details */}
      <div className="text-muted-foreground mt-3 space-y-1 text-sm">
        <div className="flex items-center justify-between">
          <span>Min Qty:</span>
          <span>{supplier.minQuantity}</span>
        </div>
        {supplier.leadTimeDays !== null && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Lead Time:
            </span>
            <span>{supplier.leadTimeDays} days</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span>Valid:</span>
          <span>{formatDate(supplier.effectiveDate)}</span>
        </div>
        {supplier.expiryDate && (
          <div className="flex items-center justify-between">
            <span>Expires:</span>
            <span>{formatDate(supplier.expiryDate)}</span>
          </div>
        )}
      </div>

      {/* Set preferred button */}
      {!isPreferred && onSetPreferred && (
        <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={onSetPreferred}>
          <Star className="mr-1 h-4 w-4" />
          Set as Preferred
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function PriceComparison({ items, isLoading = false, onSetPreferred }: PriceComparisonProps) {
  if (isLoading) {
    return <ComparisonSkeleton />;
  }

  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      {items.map((item) => (
        <Card key={item.productId}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link
                to="/products/$productId"
                params={{ productId: item.productId }}
                className="hover:underline"
              >
                {item.productName}
              </Link>
              {item.productSku && (
                <Badge variant="outline" className="font-normal">
                  {item.productSku}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {item.suppliers.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No supplier pricing available for this product.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {item.suppliers
                  .sort((a, b) => a.effectivePrice - b.effectivePrice)
                  .map((supplier) => (
                    <SupplierPriceCard
                      key={supplier.supplierId}
                      supplier={supplier}
                      isLowest={supplier.effectivePrice === item.lowestPrice}
                      isPreferred={supplier.supplierId === item.preferredSupplierId}
                      onSetPreferred={
                        onSetPreferred
                          ? () => onSetPreferred(item.productId, supplier.supplierId)
                          : undefined
                      }
                    />
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export { PriceComparison };
export type { PriceComparisonProps };
