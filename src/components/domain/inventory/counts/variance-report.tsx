/**
 * Variance Report Component
 *
 * Analysis and reconciliation of stock count variances.
 *
 * Features:
 * - Summary metrics with value impact
 * - Variance breakdown by type (positive/negative)
 * - Individual item review with adjustment approval
 *
 * Accessibility:
 * - Variance direction indicated by icon + color
 * - Monetary values use proper formatting
 */
import { memo, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  Package,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import type { CountItem } from "./count-sheet";

// ============================================================================
// TYPES
// ============================================================================

interface VarianceItem extends CountItem {
  unitCost?: number;
  variance: number;
  varianceValue: number;
}

interface VarianceReportProps {
  items: CountItem[];
  isLoading?: boolean;
  onApproveAll?: () => void;
  onRejectAll?: () => void;
  onApproveItem?: (itemId: string) => void;
  onRejectItem?: (itemId: string) => void;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const VarianceReport = memo(function VarianceReport({
  items,
  isLoading,
  onApproveAll,
  onRejectAll,
  onApproveItem,
  onRejectItem,
  className,
}: VarianceReportProps) {
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (value: number) =>
    formatCurrency(value, { cents: false, showCents: true });
  // Calculate variance items with values
  const varianceItems = useMemo(() => {
    return items
      .filter((item) => item.countedQuantity !== null)
      .map((item) => {
        const variance = (item.countedQuantity ?? 0) - item.expectedQuantity;
        const unitCost = item.unitCost ?? 0;
        return {
          ...item,
          variance,
          unitCost,
          varianceValue: variance * unitCost,
        };
      })
      .filter((item) => item.variance !== 0) as VarianceItem[];
  }, [items]);

  // Calculate summary metrics
  const summary = useMemo(() => {
    const positiveItems = varianceItems.filter((i) => i.variance > 0);
    const negativeItems = varianceItems.filter((i) => i.variance < 0);

    return {
      totalVariances: varianceItems.length,
      positiveCount: positiveItems.length,
      negativeCount: negativeItems.length,
      positiveQuantity: positiveItems.reduce((sum, i) => sum + i.variance, 0),
      negativeQuantity: Math.abs(negativeItems.reduce((sum, i) => sum + i.variance, 0)),
      positiveValue: positiveItems.reduce((sum, i) => sum + i.varianceValue, 0),
      negativeValue: Math.abs(negativeItems.reduce((sum, i) => sum + i.varianceValue, 0)),
      netQuantity: varianceItems.reduce((sum, i) => sum + i.variance, 0),
      netValue: varianceItems.reduce((sum, i) => sum + i.varianceValue, 0),
    };
  }, [varianceItems]);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  // No variances
  if (varianceItems.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <h3 className="mt-4 font-semibold">No Variances Found</h3>
            <p className="text-sm text-muted-foreground mt-2">
              All counted quantities match expected quantities.
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
              <AlertTriangle className="h-5 w-5 text-orange-500" aria-hidden="true" />
              <span className="text-sm font-medium text-muted-foreground">
                Total Variances
              </span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {summary.totalVariances}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" aria-hidden="true" />
              <span className="text-sm font-medium text-muted-foreground">
                Positive (Over)
              </span>
            </div>
            <div className="text-2xl font-bold mt-2 text-green-600 tabular-nums">
              +{summary.positiveQuantity}
            </div>
            <div className="text-sm text-muted-foreground">
              {summary.positiveCount} items
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" aria-hidden="true" />
              <span className="text-sm font-medium text-muted-foreground">
                Negative (Short)
              </span>
            </div>
            <div className="text-2xl font-bold mt-2 text-red-600 tabular-nums">
              -{summary.negativeQuantity}
            </div>
            <div className="text-sm text-muted-foreground">
              {summary.negativeCount} items
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-medium text-muted-foreground">
                Net Impact
              </span>
            </div>
            <div
              className={cn(
                "text-2xl font-bold mt-2 tabular-nums",
                summary.netQuantity > 0 && "text-green-600",
                summary.netQuantity < 0 && "text-red-600"
              )}
            >
              {summary.netQuantity > 0 ? "+" : ""}
              {summary.netQuantity}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatCurrencyDisplay(summary.netValue)} value
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Variance Details</CardTitle>
              <CardDescription>
                Review and approve inventory adjustments
              </CardDescription>
            </div>
            {(onApproveAll || onRejectAll) && (
              <div className="flex items-center gap-2">
                {onRejectAll && (
                  <Button variant="outline" onClick={onRejectAll}>
                    <XCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                    Reject All
                  </Button>
                )}
                {onApproveAll && (
                  <Button onClick={onApproveAll}>
                    <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                    Approve All
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-center" />
                  <TableHead className="text-right">Counted</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Variance Value</TableHead>
                  <TableHead>Reason</TableHead>
                  {(onApproveItem || onRejectItem) && (
                    <TableHead className="w-[100px]" />
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {varianceItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package
                          className="h-4 w-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <div>
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {item.productSku}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {item.expectedQuantity}
                    </TableCell>

                    <TableCell className="text-center">
                      <ArrowRight
                        className="h-4 w-4 text-muted-foreground mx-auto"
                        aria-hidden="true"
                      />
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {item.countedQuantity}
                    </TableCell>

                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={cn(
                          "tabular-nums",
                          item.variance > 0 && "text-green-600 bg-green-50",
                          item.variance < 0 && "text-red-600 bg-red-50"
                        )}
                      >
                        {item.variance > 0 ? (
                          <TrendingUp className="h-3 w-3 mr-1" aria-hidden="true" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" aria-hidden="true" />
                        )}
                        {item.variance > 0 ? "+" : ""}
                        {item.variance}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {formatCurrencyDisplay(item.unitCost ?? 0)}
                    </TableCell>

                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        item.varianceValue > 0 && "text-green-600",
                        item.varianceValue < 0 && "text-red-600"
                      )}
                    >
                      {formatCurrencyDisplay(item.varianceValue)}
                    </TableCell>

                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {item.varianceReason || "—"}
                      </span>
                    </TableCell>

                    {(onApproveItem || onRejectItem) && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {onRejectItem && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onRejectItem(item.id)}
                            >
                              <XCircle
                                className="h-4 w-4 text-red-600"
                                aria-hidden="true"
                              />
                              <span className="sr-only">Reject</span>
                            </Button>
                          )}
                          {onApproveItem && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onApproveItem(item.id)}
                            >
                              <CheckCircle
                                className="h-4 w-4 text-green-600"
                                aria-hidden="true"
                              />
                              <span className="sr-only">Approve</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

export default VarianceReport;
