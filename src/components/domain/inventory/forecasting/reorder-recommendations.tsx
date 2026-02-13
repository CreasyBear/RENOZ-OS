/**
 * Reorder Recommendations Component
 *
 * Displays products that need reordering with urgency levels.
 *
 * Features:
 * - Urgency-based sorting (critical → high → medium → low)
 * - Days until stockout calculation
 * - One-click order generation
 *
 * Accessibility:
 * - Urgency indicated by icon + color + text
 * - Tabular data properly formatted
 */
import { memo } from "react";
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle,
  Package,
  ShoppingCart,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableEmpty } from "@/components/shared/data-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ============================================================================
// TYPES
// ============================================================================

export type ReorderUrgency = "critical" | "high" | "medium" | "low";

export interface ReorderRecommendation {
  productId: string;
  productSku: string;
  productName: string;
  currentStock: number;
  reorderPoint: number;
  safetyStock: number;
  recommendedQuantity: number;
  urgency: ReorderUrgency;
  daysUntilStockout: number | null;
  locationCount?: number;
  locations?: Array<{
    locationId: string;
    locationName: string;
    locationCode: string | null;
    quantityOnHand: number;
    quantityAvailable: number;
  }>;
}

interface ReorderRecommendationsProps {
  recommendations: ReorderRecommendation[];
  isLoading?: boolean;
  onReorder?: (productId: string, quantity: number) => void;
  onReorderAll?: () => void;
  className?: string;
}

// ============================================================================
// URGENCY CONFIG
// ============================================================================

const URGENCY_CONFIG: Record<
  ReorderUrgency,
  { label: string; icon: typeof AlertTriangle; color: string; bgColor: string }
> = {
  critical: {
    label: "Critical",
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-950/50",
  },
  high: {
    label: "High",
    icon: AlertCircle,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/50",
  },
  medium: {
    label: "Medium",
    icon: Clock,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/50",
  },
  low: {
    label: "Low",
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/50",
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const ReorderRecommendations = memo(function ReorderRecommendations({
  recommendations,
  isLoading,
  onReorder,
  onReorderAll,
  className,
}: ReorderRecommendationsProps) {
  // Calculate summary
  const summary = {
    critical: recommendations.filter((r) => r.urgency === "critical").length,
    high: recommendations.filter((r) => r.urgency === "high").length,
    medium: recommendations.filter((r) => r.urgency === "medium").length,
    low: recommendations.filter((r) => r.urgency === "low").length,
  };

  const urgentCount = summary.critical + summary.high;

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Reorder Recommendations</CardTitle>
          <CardDescription>Loading recommendations...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
            <Skeleton className="h-64" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (recommendations.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Reorder Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTableEmpty
            variant="complete"
            icon={CheckCircle}
            title="All Stocked Up"
            description="No products need reordering at this time."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Reorder Recommendations</CardTitle>
            <CardDescription>
              {recommendations.length} products need attention
              {urgentCount > 0 && ` (${urgentCount} urgent)`}
            </CardDescription>
          </div>
          {onReorderAll && urgentCount > 0 && (
            <Button onClick={onReorderAll}>
              <ShoppingCart className="h-4 w-4 mr-2" aria-hidden="true" />
              Order All Urgent
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          {(["critical", "high", "medium", "low"] as ReorderUrgency[]).map(
            (urgency) => {
              const config = URGENCY_CONFIG[urgency];
              const Icon = config.icon;
              const count = summary[urgency];

              return (
                <div
                  key={urgency}
                  className={cn(
                    "rounded-lg p-3 border",
                    config.bgColor,
                    count === 0 && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      className={cn("h-4 w-4", config.color)}
                      aria-hidden="true"
                    />
                    <span className={cn("text-sm font-medium", config.color)}>
                      {config.label}
                    </span>
                  </div>
                  <div className="text-2xl font-bold mt-1 tabular-nums">{count}</div>
                </div>
              );
            }
          )}
        </div>

        {/* Recommendations Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Reorder Point</TableHead>
                <TableHead>Stock Level</TableHead>
                <TableHead className="text-right">Days Left</TableHead>
                <TableHead className="text-right">Recommended</TableHead>
                {onReorder && <TableHead className="w-[100px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {recommendations.map((rec) => {
                const urgencyConfig = URGENCY_CONFIG[rec.urgency];
                const UrgencyIcon = urgencyConfig.icon;
                // Handle division by zero: if reorderPoint is 0, show 0% or handle appropriately
                const stockPercentage = rec.reorderPoint > 0
                  ? Math.min(100, Math.round((rec.currentStock / rec.reorderPoint) * 100))
                  : rec.currentStock > 0
                    ? 100 // If no reorder point but has stock, show 100%
                    : 0; // If no stock and no reorder point, show 0%

                return (
                  <TableRow key={rec.productId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package
                          className="h-4 w-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-medium truncate">{rec.productName}</div>
                            <Badge variant="outline" className="text-xs font-mono shrink-0">
                              {rec.productSku}
                            </Badge>
                          </div>
                          {rec.locations && rec.locations.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
                              <MapPin className="h-3 w-3" aria-hidden="true" />
                              <span>
                                {rec.locations.length === 1
                                  ? rec.locations[0].locationCode
                                    ? `${rec.locations[0].locationName} (${rec.locations[0].locationCode})`
                                    : rec.locations[0].locationName
                                  : `${rec.locations.length} locations`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "flex items-center gap-1 w-fit",
                          urgencyConfig.color,
                          urgencyConfig.bgColor
                        )}
                      >
                        <UrgencyIcon className="h-3 w-3" aria-hidden="true" />
                        {urgencyConfig.label}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {rec.currentStock.toLocaleString()}
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {rec.reorderPoint.toLocaleString()}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <Progress
                          value={stockPercentage}
                          className={cn(
                            "h-2 flex-1",
                            rec.urgency === "critical" && "[&>div]:bg-red-600",
                            rec.urgency === "high" && "[&>div]:bg-orange-600",
                            rec.urgency === "medium" && "[&>div]:bg-yellow-600"
                          )}
                          aria-label={`${stockPercentage}% of reorder point`}
                        />
                        <span className="text-xs text-muted-foreground min-w-[35px]">
                          {stockPercentage}%
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      {rec.daysUntilStockout !== null ? (
                        <span
                          className={cn(
                            "tabular-nums",
                            rec.daysUntilStockout <= 3 && "text-red-600 font-medium",
                            rec.daysUntilStockout <= 7 &&
                              rec.daysUntilStockout > 3 &&
                              "text-orange-600"
                          )}
                        >
                          {rec.daysUntilStockout}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <Badge variant="secondary" className="tabular-nums">
                        +{rec.recommendedQuantity.toLocaleString()}
                      </Badge>
                    </TableCell>

                    {onReorder && (
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            onReorder(rec.productId, rec.recommendedQuantity)
                          }
                        >
                          <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
});

export default ReorderRecommendations;
