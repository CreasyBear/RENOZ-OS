import { BarChart3, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { InventoryDashboardReadWarning } from './inventory-dashboard-read-warning';
import type { DashboardTopMovingItem } from '@/lib/schemas/inventory';

interface TopMover {
  productId: string;
  productName: string;
  sku: string;
  totalQuantity: number;
  trend: 'up' | 'down' | 'stable';
}

interface InventoryDashboardTopMoversPanelProps {
  topMoving: DashboardTopMovingItem[];
  isLoading: boolean;
  showUnavailable: boolean;
  showDegraded: boolean;
  readErrorMessage: string;
}

export function InventoryDashboardTopMoversPanel({
  topMoving,
  isLoading,
  showUnavailable,
  showDegraded,
  readErrorMessage,
}: InventoryDashboardTopMoversPanelProps) {
  const movers = topMoving.map((item) => ({
    productId: item.productId,
    productName: item.productName ?? 'Unknown',
    sku: item.productSku ?? item.sku ?? '',
    totalQuantity: item.totalQuantity ?? 0,
    trend: item.trend ?? 'stable',
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Top Moving Products
        </CardTitle>
        <CardDescription>By movement volume this period</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TopMoversSkeleton />
        ) : showUnavailable ? (
          <InventoryDashboardReadWarning
            title="Top movers are temporarily unavailable."
            message={readErrorMessage}
          />
        ) : (
          <div className="space-y-4">
            {showDegraded ? (
              <InventoryDashboardReadWarning
                title="Top movers may be stale."
                message={readErrorMessage}
              />
            ) : null}
            <TopMoversList movers={movers} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TopMoversList({
  movers,
}: {
  movers: TopMover[];
}) {
  if (movers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No movement data yet</p>
      </div>
    );
  }

  const maxQuantity = Math.max(...movers.map((mover) => mover.totalQuantity));

  return (
    <div className="space-y-3">
      {movers.slice(0, 5).map((mover) => {
        const percentage = maxQuantity > 0 ? (mover.totalQuantity / maxQuantity) * 100 : 0;
        return (
          <div key={mover.productId} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{mover.productName}</p>
                <p className="text-xs text-muted-foreground">{mover.sku}</p>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <span className="text-sm font-medium tabular-nums">{mover.totalQuantity}</span>
                {mover.trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-green-600" />}
                {mover.trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-red-600" />}
              </div>
            </div>
            <Progress value={percentage} className="h-1.5" />
          </div>
        );
      })}
    </div>
  );
}

function TopMoversSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="space-y-1.5">
          <div className="flex justify-between">
            <div>
              <Skeleton className="h-4 w-28 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-8" />
          </div>
          <Skeleton className="h-1.5 w-full" />
        </div>
      ))}
    </div>
  );
}
