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
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
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
import { useOrgFormat } from "@/hooks/use-org-format";

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
  financeIntegrity?: {
    status: "green" | "amber" | "red";
    stockWithoutActiveLayers: number;
    inventoryValueMismatchCount: number;
    totalAbsoluteValueDrift: number;
    topDriftItems?: Array<{
      inventoryId: string;
      productSku: string;
      productName: string;
      locationName: string;
      absoluteDrift: number;
    }>;
  } | null;
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
  financeIntegrity,
  isLoading,
  className,
}: ValuationReportProps) {
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (value: number) =>
    formatCurrency(value, { cents: false, showCents: true });

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
              {formatCurrencyDisplay(summary.totalValue)}
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
              {formatCurrencyDisplay(summary.averageUnitCost)}
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

      {financeIntegrity ? (
        <Card
          className={cn(
            financeIntegrity.status === "green" && "border-emerald-200 bg-emerald-50/40",
            financeIntegrity.status === "amber" && "border-amber-200 bg-amber-50/40",
            financeIntegrity.status === "red" && "border-red-200 bg-red-50/40"
          )}
        >
          <CardContent className="pt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Data Integrity</p>
                <p className="text-xs text-muted-foreground">
                  Cost-layer reconciliation status for valuation trust
                </p>
              </div>
              {financeIntegrity.status === "green" ? (
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              ) : financeIntegrity.status === "amber" ? (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div className="mt-3 grid gap-3 text-xs md:grid-cols-3">
              <div>
                <p className="text-muted-foreground">Stock without layers</p>
                <p className="font-semibold tabular-nums">{financeIntegrity.stockWithoutActiveLayers}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Rows with value mismatch</p>
                <p className="font-semibold tabular-nums">{financeIntegrity.inventoryValueMismatchCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Absolute drift</p>
                <p className="font-semibold tabular-nums">{formatCurrencyDisplay(financeIntegrity.totalAbsoluteValueDrift)}</p>
              </div>
            </div>
            {financeIntegrity.topDriftItems && financeIntegrity.topDriftItems.length > 0 ? (
              <div className="mt-4 rounded-md border bg-background p-2">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Top Drift Items</p>
                <div className="space-y-1 text-xs">
                  {financeIntegrity.topDriftItems.slice(0, 5).map((row) => (
                    <div key={row.inventoryId} className="grid grid-cols-1 gap-1 md:grid-cols-4">
                      <span className="font-medium">{row.productSku || 'N/A'}</span>
                      <span>{row.productName}</span>
                      <span className="text-muted-foreground">{row.locationName}</span>
                      <span className="tabular-nums text-right">
                        {formatCurrencyDisplay(row.absoluteDrift)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

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
                          {formatCurrencyDisplay(cat.totalValue)}
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
                          {formatCurrencyDisplay(loc.totalValue)}
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
