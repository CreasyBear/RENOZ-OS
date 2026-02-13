/**
 * Overview Stats Cards
 *
 * Key metrics: Won This Month, Orders Pending, Low Stock Items, plus user-tracked products
 * Uses shared MetricCard component per METRIC-CARD-STANDARDS.md
 *
 * @see src/lib/schemas/dashboard/tracked-products.ts
 */

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Trophy, Package, AlertTriangle, Boxes, Settings2 } from 'lucide-react';
import { MetricCard } from '@/components/shared/metric-card';
import { FormatAmount } from '@/components/shared/format';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TrackedProductsDialog } from './tracked-products-dialog';
import type {
  TrackedProduct,
  TrackedProductWithInventory,
} from '@/lib/schemas/dashboard/tracked-products';

// Re-export for convenience
export type { TrackedProductWithInventory };

// ============================================================================
// TYPES
// ============================================================================

export interface OverviewStatsData {
  wonThisMonth: {
    count: number;
    value: number;
    changePercent?: number;
  };
  ordersPending: {
    count: number;
    oldestDays?: number;
  };
  lowStockItems: {
    count: number;
    criticalCount?: number;
  };
}

export interface OverviewStatsProps {
  data?: OverviewStatsData | null;
  isLoading?: boolean;
  // Tracked products from hook
  trackedProducts?: TrackedProductWithInventory[];
  onTrackedProductsChange?: (products: TrackedProduct[]) => void;
  maxTrackedProducts?: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OverviewStats({
  data,
  isLoading,
  trackedProducts = [],
  onTrackedProductsChange,
  maxTrackedProducts = 5,
}: OverviewStatsProps) {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Build subtitle for won this month
  const wonSubtitle = data?.wonThisMonth
    ? `${data.wonThisMonth.count} deal${data.wonThisMonth.count !== 1 ? 's' : ''} closed`
    : 'No deals yet';

  // Build subtitle for orders pending
  const ordersSubtitle = data?.ordersPending?.oldestDays
    ? `Oldest: ${data.ordersPending.oldestDays} days ago`
    : data?.ordersPending?.count === 0
      ? 'All fulfilled'
      : 'Ready to ship';

  // Build subtitle for low stock
  const lowStockSubtitle = data?.lowStockItems?.criticalCount
    ? `${data.lowStockItems.criticalCount} at zero stock`
    : data?.lowStockItems?.count === 0
      ? 'Stock levels healthy'
      : 'Below reorder point';

  // Calculate total cards (3 core + tracked products)
  const totalCards = 3 + trackedProducts.length;

  // Dynamic grid based on card count - cleaner sizing
  const gridCols =
    totalCards <= 3
      ? 'grid-cols-1 sm:grid-cols-3'
      : totalCards === 4
        ? 'grid-cols-2 sm:grid-cols-4'
        : totalCards === 5
          ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
          : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6';

  return (
    <>
      <div className="space-y-2">
        {/* Header with configure button */}
        {onTrackedProductsChange && (
          <div className="flex justify-end">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setDialogOpen(true)}
                >
                  <Settings2 className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {trackedProducts.length > 0 ? 'Edit tracked items' : 'Track inventory items'}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Configure which inventory items to track</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Stats grid */}
        <div className={`grid gap-4 sm:gap-6 ${gridCols}`}>
          {/* Core metrics */}
          <MetricCard
            title="Won This Month"
            value={<FormatAmount amount={data?.wonThisMonth?.value ?? 0} currency="AUD" />}
            subtitle={wonSubtitle}
            icon={Trophy}
            iconClassName="text-emerald-600"
            delta={data?.wonThisMonth?.changePercent}
            onClick={() => navigate({ to: '/pipeline', search: { status: 'won' } })}
            isLoading={isLoading}
          />
          <MetricCard
            title="Orders Pending"
            value={String(data?.ordersPending?.count ?? 0)}
            subtitle={ordersSubtitle}
            icon={Package}
            alert={(data?.ordersPending?.count ?? 0) > 0}
            onClick={() => navigate({ to: '/orders', search: { status: 'confirmed' } })}
            isLoading={isLoading}
          />
          <MetricCard
            title="Low Stock"
            value={String(data?.lowStockItems?.count ?? 0)}
            subtitle={lowStockSubtitle}
            icon={AlertTriangle}
            alert={(data?.lowStockItems?.count ?? 0) > 0}
            onClick={() => navigate({ to: '/inventory/alerts' })}
            isLoading={isLoading}
          />

          {/* User-tracked products */}
          {trackedProducts.map((product) => (
            <MetricCard
              key={product.id}
              title={product.sku || product.name}
              value={String(product.quantity)}
              subtitle={product.name}
              icon={Boxes}
              iconClassName="text-blue-600"
              alert={product.quantity < 10}
              onClick={() => navigate({ to: '/products/$productId', params: { productId: product.id } })}
              isLoading={isLoading}
            />
          ))}
        </div>
      </div>

      {/* Configure dialog */}
      {onTrackedProductsChange && (
        <TrackedProductsDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          selectedProducts={trackedProducts}
          onSave={onTrackedProductsChange}
          maxProducts={maxTrackedProducts}
        />
      )}
    </>
  );
}
