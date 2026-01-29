/**
 * Inventory Valuation Report Component
 *
 * Displays inventory value breakdown with FIFO costing details.
 *
 * Features:
 * - Total valuation summary
 * - Value by category/location
 * - Cost layer breakdown
 *
 * Accessibility:
 * - Monetary values properly formatted
 * - Data tables with proper headers
 */
import { memo } from "react";
import {
  DollarSign,
  Package,
  MapPin,
  TrendingUp,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

// ============================================================================
// TYPES
// ============================================================================

export interface ValuationSummary {
  totalValue: number;
  totalUnits: number;
  averageUnitCost: number;
  totalSkus: number;
  locationsCount: number;
  costMethod: "fifo" | "lifo" | "weighted_average";
}

export interface CategoryValuation {
  categoryId: string;
  categoryName: string;
  totalValue: number;
  totalUnits: number;
  percentOfTotal: number;
  skuCount: number;
}

export interface LocationValuation {
  locationId: string;
  locationName: string;
  totalValue: number;
  totalUnits: number;
  percentOfTotal: number;
  utilization: number;
}

interface ValuationReportProps {
  summary: ValuationSummary | null;
  byCategory: CategoryValuation[];
  byLocation: LocationValuation[];
  isLoading?: boolean;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ValuationReport = memo(function ValuationReport({
  summary,
  byCategory,
  byLocation,
  isLoading,
  className,
}: ValuationReportProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

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
            <DollarSign className="h-12 w-12 text-muted-foreground/50 mx-auto" />
            <p className="mt-4 text-sm text-muted-foreground">
              No valuation data available
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" aria-hidden="true" />
              <span className="text-sm font-medium text-muted-foreground">
                Total Value
              </span>
            </div>
            <div className="text-2xl font-bold mt-2 tabular-nums">
              {formatCurrency(summary.totalValue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.costMethod.toUpperCase()} costing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" aria-hidden="true" />
              <span className="text-sm font-medium text-muted-foreground">
                Total Units
              </span>
            </div>
            <div className="text-2xl font-bold mt-2 tabular-nums">
              {summary.totalUnits.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all locations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-600" aria-hidden="true" />
              <span className="text-sm font-medium text-muted-foreground">
                Avg Unit Cost
              </span>
            </div>
            <div className="text-2xl font-bold mt-2 tabular-nums">
              {formatCurrency(summary.averageUnitCost)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Weighted average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-600" aria-hidden="true" />
              <span className="text-sm font-medium text-muted-foreground">
                SKUs / Locations
              </span>
            </div>
            <div className="text-2xl font-bold mt-2 tabular-nums">
              {summary.totalSkus} / {summary.locationsCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Categories and locations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* By Category */}
        <Card>
          <CardHeader>
            <CardTitle>Value by Category</CardTitle>
            <CardDescription>
              Inventory value distribution across product categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No category data
              </p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead>% of Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byCategory.map((cat) => (
                      <TableRow key={cat.categoryId}>
                        <TableCell>
                          <div className="font-medium">{cat.categoryName}</div>
                          <div className="text-xs text-muted-foreground">
                            {cat.skuCount} SKUs
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(cat.totalValue)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {cat.totalUnits.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={cat.percentOfTotal}
                              className="h-2 w-16"
                            />
                            <span className="text-xs tabular-nums min-w-[40px]">
                              {formatPercent(cat.percentOfTotal)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Location */}
        <Card>
          <CardHeader>
            <CardTitle>Value by Location</CardTitle>
            <CardDescription>
              Inventory value distribution across warehouse locations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {byLocation.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No location data
              </p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead>Utilization</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byLocation.map((loc) => (
                      <TableRow key={loc.locationId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin
                              className="h-4 w-4 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <span className="font-medium">{loc.locationName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(loc.totalValue)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {loc.totalUnits.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={loc.utilization}
                              className={cn(
                                "h-2 w-16",
                                loc.utilization > 90 && "[&>div]:bg-red-600",
                                loc.utilization > 75 && loc.utilization <= 90 && "[&>div]:bg-orange-600"
                              )}
                            />
                            <span className="text-xs tabular-nums min-w-[40px]">
                              {formatPercent(loc.utilization)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

export default ValuationReport;
