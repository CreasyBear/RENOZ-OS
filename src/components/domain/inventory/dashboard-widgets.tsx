/**
 * Inventory Dashboard Widgets
 *
 * Reusable widget components for the inventory dashboard.
 * Includes metric cards, movement timeline, top movers, and location heatmap.
 *
 * Accessibility:
 * - aria-live for real-time updates
 * - Color-blind friendly charts (icons + colors)
 * - Proper focus management
 */
import { memo, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Package,
  MapPin,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUpDown,
  Clock,
  DollarSign,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FormatAmount } from "@/components/shared/format";
import { MetricCard } from "@/components/shared/metric-card";
import { StatusCell } from "@/components/shared/data-table";
import { MOVEMENT_TYPE_CONFIG } from "./inventory-status-config";

// ============================================================================
// TYPES
// ============================================================================

export interface InventoryMetrics {
  totalItems: number;
  totalSkus: number;
  totalUnits: number;
  totalValue: number;
  locationsCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  allocatedCount: number;
}

export interface MovementSummary {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  movementType: string;
  quantity: number;
  movementCount?: number; // Number of individual movements aggregated
  locationName: string;
  locationCode?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  metadataReason?: string | null;
  performedAt: Date;
  performedBy: string;
}

export interface TopMover {
  productId: string;
  productName: string;
  sku: string;
  movementCount: number;
  totalQuantity: number;
  trend: "up" | "down" | "stable";
}

export interface LocationUtilization {
  locationId: string;
  locationName: string;
  locationType: string;
  capacity: number;
  used: number;
  utilizationPercent: number;
}

// ============================================================================
// STOCK OVERVIEW WIDGET
// ============================================================================

interface StockOverviewWidgetProps {
  metrics: InventoryMetrics | null;
  isLoading?: boolean;
}

export const StockOverviewWidget = memo(function StockOverviewWidget({
  metrics,
  isLoading,
}: StockOverviewWidgetProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <MetricCard
        title="Total Inventory Value"
        value={
          metrics ? (
            <FormatAmount amount={metrics.totalValue} />
          ) : (
            "$0.00"
          )
        }
        subtitle={`${metrics?.totalUnits ?? 0} total units`}
        icon={DollarSign}
        isLoading={isLoading}
      />
      <MetricCard
        title="Warehouse Locations"
        value={metrics?.locationsCount ?? 0}
        subtitle="Active locations"
        icon={MapPin}
        isLoading={isLoading}
      />
      <MetricCard
        title="Stock Alerts"
        value={(metrics?.lowStockCount ?? 0) + (metrics?.outOfStockCount ?? 0)}
        subtitle={`${metrics?.lowStockCount ?? 0} low, ${metrics?.outOfStockCount ?? 0} out`}
        icon={AlertTriangle}
        isLoading={isLoading}
      />
    </div>
  );
});

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Generate a link URL for a movement reference
 */
function getMovementReferenceLink(
  referenceType: string | null | undefined,
  referenceId: string | null | undefined
): string | null {
  if (!referenceType || !referenceId) return null;

  const routeMap: Record<string, (id: string) => string> = {
    order: (id) => `/orders/${id}`,
    purchase_order: (id) => `/purchase-orders/${id}`,
  };

  const routeBuilder = routeMap[referenceType];
  return routeBuilder ? routeBuilder(referenceId) : null;
}

/**
 * Format reference type for display
 */
function formatReferenceType(type: string | null | undefined): string {
  if (!type) return '';
  return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

// ============================================================================
// RECENT MOVEMENTS WIDGET
// ============================================================================

interface RecentMovementsWidgetProps {
  movements: MovementSummary[];
  isLoading?: boolean;
}


export const RecentMovementsWidget = memo(function RecentMovementsWidget({
  movements,
  isLoading,
}: RecentMovementsWidgetProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Movements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (movements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Movements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ArrowUpDown className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No recent movements</p>
            <p className="text-xs text-muted-foreground mt-1">
              Receive inventory to see movements here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Movements
        </CardTitle>
        <CardDescription>Last 24 hours of inventory activity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4" role="list" aria-label="Recent inventory movements">
          {movements.map((movement) => {
            return (
              <div
                key={movement.id}
                className="flex items-center justify-between"
                role="listitem"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {movement.productName}
                    </p>
                    {movement.productSku && (
                      <Badge variant="outline" className="text-xs font-mono shrink-0">
                        {movement.productSku}
                      </Badge>
                    )}
                    {movement.referenceType && (
                      (() => {
                        const referenceLink = getMovementReferenceLink(movement.referenceType, movement.referenceId);
                        return referenceLink ? (
                          <Link
                            to={referenceLink as any}
                            className="inline-flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Badge variant="secondary" className="text-xs shrink-0 capitalize hover:bg-secondary/80 transition-colors cursor-pointer">
                              {formatReferenceType(movement.referenceType)}
                              <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                            </Badge>
                          </Link>
                        ) : (
                          <Badge variant="secondary" className="text-xs shrink-0 capitalize">
                            {formatReferenceType(movement.referenceType)}
                          </Badge>
                        );
                      })()
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {movement.locationCode
                      ? `${movement.locationName} (${movement.locationCode})`
                      : movement.locationName} &bull;{" "}
                    {movement.performedAt instanceof Date && !isNaN(movement.performedAt.getTime())
                      ? movement.performedAt.toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })
                      : 'Unknown time'}
                    {movement.movementCount && movement.movementCount > 1 && (
                      <span className="ml-1">({movement.movementCount} movements)</span>
                    )}
                    {movement.metadataReason && (
                      <span className="ml-1"> &bull; {movement.metadataReason}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-sm font-medium tabular-nums">
                    {movement.quantity > 0 ? "+" : ""}
                    {movement.quantity}
                  </span>
                  <StatusCell
                    status={movement.movementType as keyof typeof MOVEMENT_TYPE_CONFIG}
                    statusConfig={MOVEMENT_TYPE_CONFIG}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// TOP MOVERS WIDGET
// ============================================================================

interface TopMoversWidgetProps {
  movers: TopMover[];
  isLoading?: boolean;
}

export const TopMoversWidget = memo(function TopMoversWidget({
  movers,
  isLoading,
}: TopMoversWidgetProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Top Moving Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (movers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Top Moving Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No movement data yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start tracking inventory to see trends
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxQuantity = Math.max(...movers.map((m) => m.totalQuantity));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Top Moving Products
        </CardTitle>
        <CardDescription>By total movement volume this period</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4" role="list" aria-label="Top moving products">
          {movers.map((mover) => {
            const percentage = (mover.totalQuantity / maxQuantity) * 100;
            return (
              <div key={mover.productId} className="space-y-2" role="listitem">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {mover.productName}
                    </p>
                    <p className="text-xs text-muted-foreground">{mover.sku}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-sm font-medium tabular-nums">
                      {mover.totalQuantity}
                    </span>
                    {mover.trend === "up" && (
                      <TrendingUp
                        className="h-4 w-4 text-green-600"
                        aria-label="Trending up"
                      />
                    )}
                    {mover.trend === "down" && (
                      <TrendingDown
                        className="h-4 w-4 text-red-600"
                        aria-label="Trending down"
                      />
                    )}
                  </div>
                </div>
                <Progress
                  value={percentage}
                  className="h-2"
                  aria-label={`${mover.productName}: ${mover.totalQuantity} units`}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// LOCATION UTILIZATION WIDGET
// ============================================================================

interface LocationUtilizationWidgetProps {
  locations: LocationUtilization[];
  isLoading?: boolean;
}

export const LocationUtilizationWidget = memo(function LocationUtilizationWidget({
  locations,
  isLoading,
}: LocationUtilizationWidgetProps) {
  // Sort by utilization (highest first) for the heatmap effect
  const sortedLocations = useMemo(
    () => [...locations].sort((a, b) => b.utilizationPercent - a.utilizationPercent),
    [locations]
  );

  const getUtilizationColor = (percent: number) => {
    if (percent >= 90) return "bg-red-500";
    if (percent >= 70) return "bg-orange-500";
    if (percent >= 50) return "bg-yellow-500";
    if (percent >= 25) return "bg-green-500";
    return "bg-blue-500";
  };

  const getUtilizationLabel = (percent: number) => {
    if (percent >= 90) return "Critical";
    if (percent >= 70) return "High";
    if (percent >= 50) return "Medium";
    if (percent >= 25) return "Low";
    return "Empty";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Utilization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (locations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Utilization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No locations configured</p>
            <p className="text-xs text-muted-foreground mt-1">
              Set up warehouse locations to track utilization
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location Utilization
        </CardTitle>
        <CardDescription>Capacity usage by location</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Legend - uses icon + color for accessibility */}
        <div className="flex flex-wrap gap-3 mb-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-500" />
            <AlertTriangle className="h-3 w-3 text-red-500" aria-hidden="true" />
            <span>Critical (90%+)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-orange-500" />
            <span>High (70-89%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span>Medium (50-69%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Low (25-49%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span>Empty (&lt;25%)</span>
          </div>
        </div>

        {/* Heatmap grid */}
        <div
          className="grid grid-cols-5 gap-2"
          role="grid"
          aria-label="Location utilization heatmap"
        >
          {sortedLocations.slice(0, 10).map((loc) => (
            <button
              key={loc.locationId}
              className={cn(
                "aspect-square rounded flex items-center justify-center text-white text-xs font-medium",
                "hover:ring-2 hover:ring-offset-2 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
                getUtilizationColor(loc.utilizationPercent)
              )}
              title={`${loc.locationName}: ${loc.utilizationPercent.toFixed(0)}% utilized (${loc.used}/${loc.capacity})`}
              aria-label={`${loc.locationName}: ${getUtilizationLabel(loc.utilizationPercent)}, ${loc.utilizationPercent.toFixed(0)}% utilized`}
            >
              {loc.utilizationPercent >= 90 && (
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              )}
              {loc.utilizationPercent < 90 && (
                <span className="tabular-nums">{loc.utilizationPercent.toFixed(0)}%</span>
              )}
            </button>
          ))}
        </div>

        {sortedLocations.length > 10 && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Showing top 10 of {sortedLocations.length} locations
          </p>
        )}
      </CardContent>
    </Card>
  );
});


// Re-export MetricCard from shared for backward compatibility
export { MetricCard, type MetricCardProps } from "@/components/shared/metric-card";
