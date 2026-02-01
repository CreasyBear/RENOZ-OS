/**
 * Movement Analytics Component
 *
 * Displays inventory movement statistics and patterns.
 *
 * Features:
 * - Movement volume summary
 * - Movement type breakdown
 * - Top movers analysis
 * - Movement trends over time
 *
 * Accessibility:
 * - Clear data labeling
 * - Icon + color for movement types
 */
import { memo } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  Wrench,
  Package,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrgFormat } from "@/hooks/use-org-format";

// ============================================================================
// TYPES
// ============================================================================

export type MovementType =
  | "receive"
  | "allocate"
  | "deallocate"
  | "pick"
  | "ship"
  | "return"
  | "transfer"
  | "adjust";

export interface MovementSummary {
  totalMovements: number;
  totalUnitsIn: number;
  totalUnitsOut: number;
  totalValueIn: number;
  totalValueOut: number;
  periodDays: number;
}

export interface MovementByType {
  type: MovementType;
  count: number;
  units: number;
  value: number;
  percentOfTotal: number;
}

export interface TopMover {
  productId: string;
  productName: string;
  productSku: string;
  totalMovements: number;
  unitsIn: number;
  unitsOut: number;
  netChange: number;
  velocity: "high" | "medium" | "low";
}

export interface MovementTrend {
  date: string;
  movementCount: number;
  unitsIn: number;
  unitsOut: number;
}

interface MovementAnalyticsProps {
  summary: MovementSummary | null;
  byType: MovementByType[];
  topMovers: TopMover[];
  trends?: MovementTrend[];
  isLoading?: boolean;
  className?: string;
}

// ============================================================================
// TYPE CONFIG
// ============================================================================

const MOVEMENT_TYPE_CONFIG: Record<
  MovementType,
  { label: string; icon: typeof ArrowDownToLine; color: string; bgColor: string }
> = {
  receive: {
    label: "Receives",
    icon: ArrowDownToLine,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  allocate: {
    label: "Allocations",
    icon: ArrowUpFromLine,
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  deallocate: {
    label: "Deallocations",
    icon: ArrowDownToLine,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  pick: {
    label: "Picks",
    icon: ArrowUpFromLine,
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  ship: {
    label: "Shipments",
    icon: ArrowUpFromLine,
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  return: {
    label: "Returns",
    icon: ArrowDownToLine,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  transfer: {
    label: "Transfers",
    icon: ArrowLeftRight,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  adjust: {
    label: "Adjustments",
    icon: Wrench,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
};

const VELOCITY_CONFIG = {
  high: { label: "High", color: "text-green-600", bgColor: "bg-green-50" },
  medium: { label: "Medium", color: "text-yellow-600", bgColor: "bg-yellow-50" },
  low: { label: "Low", color: "text-red-600", bgColor: "bg-red-50" },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const MovementAnalytics = memo(function MovementAnalytics({
  summary,
  byType,
  topMovers,
  trends = [],
  isLoading,
  className,
}: MovementAnalyticsProps) {
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (value: number) =>
    formatCurrency(value, { cents: false, showCents: true });

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-muted-foreground/50 mx-auto" />
            <p className="mt-4 text-sm text-muted-foreground">
              No movement data available
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const avgMovementsPerDay = summary.totalMovements / (summary.periodDays || 1);
  const netUnits = summary.totalUnitsIn - summary.totalUnitsOut;
  const netValue = summary.totalValueIn - summary.totalValueOut;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" aria-hidden="true" />
              <span className="text-sm font-medium text-muted-foreground">
                Total Movements
              </span>
            </div>
            <div className="text-2xl font-bold mt-2 tabular-nums">
              {summary.totalMovements.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {avgMovementsPerDay.toFixed(1)} per day ({summary.periodDays}d)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5 text-green-600" aria-hidden="true" />
              <span className="text-sm font-medium text-muted-foreground">
                Units In
              </span>
            </div>
            <div className="text-2xl font-bold mt-2 tabular-nums text-green-600">
              +{summary.totalUnitsIn.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrencyDisplay(summary.totalValueIn)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ArrowUpFromLine className="h-5 w-5 text-red-600" aria-hidden="true" />
              <span className="text-sm font-medium text-muted-foreground">
                Units Out
              </span>
            </div>
            <div className="text-2xl font-bold mt-2 tabular-nums text-red-600">
              -{summary.totalUnitsOut.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrencyDisplay(summary.totalValueOut)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" aria-hidden="true" />
              <span className="text-sm font-medium text-muted-foreground">
                Net Change
              </span>
            </div>
            <div
              className={cn(
                "text-2xl font-bold mt-2 tabular-nums",
                netUnits >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {netUnits >= 0 ? "+" : ""}
              {netUnits.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrencyDisplay(Math.abs(netValue))} {netValue >= 0 ? "added" : "removed"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Movement Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* By Type */}
        <Card>
          <CardHeader>
            <CardTitle>Movements by Type</CardTitle>
            <CardDescription>
              Breakdown of inventory movement activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {byType.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No movement data
              </p>
            ) : (
              <div className="space-y-4">
                {byType.map((item) => {
                  const config = MOVEMENT_TYPE_CONFIG[item.type] ?? MOVEMENT_TYPE_CONFIG.adjust;
                  const Icon = config.icon;

                  return (
                    <div key={item.type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn("p-1.5 rounded", config.bgColor)}>
                            <Icon
                              className={cn("h-4 w-4", config.color)}
                              aria-hidden="true"
                            />
                          </div>
                          <span className="font-medium">{config.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium tabular-nums">
                            {item.count.toLocaleString()}
                          </span>
                          <span className="text-sm text-muted-foreground ml-2">
                            ({item.percentOfTotal.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <Progress
                        value={item.percentOfTotal}
                        className={cn(
                          "h-2",
                          item.type === "receive" && "[&>div]:bg-green-600",
                          (item.type === "allocate" ||
                            item.type === "pick" ||
                            item.type === "ship") &&
                            "[&>div]:bg-red-600",
                          item.type === "deallocate" && "[&>div]:bg-amber-600",
                          item.type === "return" && "[&>div]:bg-green-600",
                          item.type === "transfer" && "[&>div]:bg-blue-600",
                          item.type === "adjust" && "[&>div]:bg-orange-600"
                        )}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{item.units.toLocaleString()} units</span>
                        <span>{formatCurrencyDisplay(item.value)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Movers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Movers</CardTitle>
            <CardDescription>
              Products with highest movement activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topMovers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No mover data
              </p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">In/Out</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead>Velocity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topMovers.map((mover) => {
                      const velocityConfig = VELOCITY_CONFIG[mover.velocity];

                      return (
                        <TableRow key={mover.productId}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{mover.productName}</div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {mover.productSku}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            <span className="text-green-600 tabular-nums">
                              +{mover.unitsIn}
                            </span>
                            {" / "}
                            <span className="text-red-600 tabular-nums">
                              -{mover.unitsOut}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={cn(
                                "tabular-nums font-medium",
                                mover.netChange >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              )}
                            >
                              {mover.netChange >= 0 ? "+" : ""}
                              {mover.netChange}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                velocityConfig.color,
                                velocityConfig.bgColor
                              )}
                            >
                              {velocityConfig.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Movement Trend */}
      {trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Movement Trend</CardTitle>
            <CardDescription>
              Daily movement activity over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-40">
              {trends.map((point, i) => {
                const maxMovement = Math.max(
                  ...trends.map((t) => t.unitsIn + t.unitsOut)
                );
                const inHeight = (point.unitsIn / maxMovement) * 100;
                const outHeight = (point.unitsOut / maxMovement) * 100;

                return (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex flex-col items-center h-32">
                      <div className="flex gap-0.5 items-end h-full w-full justify-center">
                        <div
                          className="w-2 bg-green-500 rounded-t"
                          style={{ height: `${inHeight}%` }}
                          title={`In: ${point.unitsIn}`}
                        />
                        <div
                          className="w-2 bg-red-500 rounded-t"
                          style={{ height: `${outHeight}%` }}
                          title={`Out: ${point.unitsOut}`}
                        />
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 truncate w-full text-center">
                      {point.date}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span className="text-xs text-muted-foreground">Units In</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded" />
                <span className="text-xs text-muted-foreground">Units Out</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

export default MovementAnalytics;
