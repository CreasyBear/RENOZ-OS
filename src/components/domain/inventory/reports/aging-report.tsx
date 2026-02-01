/**
 * Inventory Aging Report Component
 *
 * Displays inventory age distribution with risk highlighting.
 *
 * Features:
 * - Age bucket summary (0-30, 31-60, 61-90, 90+ days)
 * - Value at risk analysis
 * - Slow-moving item identification
 *
 * Accessibility:
 * - Color + icon for risk levels
 * - Tabular data with proper formatting
 */
import { memo } from "react";
import {
  Clock,
  AlertTriangle,
  Package,
  TrendingDown,
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

export interface AgeBucket {
  label: string;
  minDays: number;
  maxDays: number | null;
  itemCount: number;
  totalValue: number;
  percentOfTotal: number;
  risk: "low" | "medium" | "high" | "critical";
}

export interface AgingItem {
  inventoryId: string;
  productId: string;
  productName: string;
  productSku: string;
  locationName: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  ageInDays: number;
  receivedAt: Date;
  risk: "low" | "medium" | "high" | "critical";
}

export interface AgingSummary {
  totalItems: number;
  totalValue: number;
  averageAge: number;
  valueAtRisk: number;
  riskPercentage: number;
}

interface AgingReportProps {
  summary: AgingSummary | null;
  buckets: AgeBucket[];
  items: AgingItem[];
  isLoading?: boolean;
  showItems?: boolean;
  className?: string;
}

// ============================================================================
// RISK CONFIG
// ============================================================================

const RISK_CONFIG: Record<
  "low" | "medium" | "high" | "critical",
  { label: string; color: string; bgColor: string }
> = {
  low: {
    label: "Low",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  medium: {
    label: "Medium",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
  },
  high: {
    label: "High",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  critical: {
    label: "Critical",
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const AgingReport = memo(function AgingReport({
  summary,
  buckets,
  items,
  isLoading,
  showItems = true,
  className,
}: AgingReportProps) {
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (value: number) =>
    formatCurrency(value, { cents: false, showCents: true });

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);

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

  if (!summary) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-muted-foreground/50 mx-auto" />
            <p className="mt-4 text-sm text-muted-foreground">
              No aging data available
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
              <Package className="h-5 w-5 text-blue-600" aria-hidden="true" />
              <span className="text-sm font-medium text-muted-foreground">
                Total Items
              </span>
            </div>
            <div className="text-2xl font-bold mt-2 tabular-nums">
              {summary.totalItems.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" aria-hidden="true" />
              <span className="text-sm font-medium text-muted-foreground">
                Average Age
              </span>
            </div>
            <div className="text-2xl font-bold mt-2 tabular-nums">
              {summary.averageAge} days
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" aria-hidden="true" />
              <span className="text-sm font-medium text-muted-foreground">
                Value at Risk
              </span>
            </div>
            <div className="text-2xl font-bold mt-2 tabular-nums text-orange-600">
              {formatCurrencyDisplay(summary.valueAtRisk)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.riskPercentage.toFixed(1)}% of total value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-green-600" aria-hidden="true" />
              <span className="text-sm font-medium text-muted-foreground">
                Total Value
              </span>
            </div>
            <div className="text-2xl font-bold mt-2 tabular-nums">
              {formatCurrencyDisplay(summary.totalValue)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Age Buckets */}
      <Card>
        <CardHeader>
          <CardTitle>Age Distribution</CardTitle>
          <CardDescription>
            Inventory value by age bucket
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {buckets.map((bucket, i) => {
              const riskConfig = RISK_CONFIG[bucket.risk];

              return (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(riskConfig.color, riskConfig.bgColor)}
                      >
                        {bucket.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {bucket.itemCount.toLocaleString()} items
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium tabular-nums">
                        {formatCurrencyDisplay(bucket.totalValue)}
                      </span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({bucket.percentOfTotal.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={bucket.percentOfTotal}
                    className={cn(
                      "h-3",
                      bucket.risk === "critical" && "[&>div]:bg-red-600",
                      bucket.risk === "high" && "[&>div]:bg-orange-600",
                      bucket.risk === "medium" && "[&>div]:bg-yellow-600",
                      bucket.risk === "low" && "[&>div]:bg-green-600"
                    )}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* At-Risk Items */}
      {showItems && items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Items at Risk</CardTitle>
            <CardDescription>
              Inventory items aged 60+ days requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Age</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const riskConfig = RISK_CONFIG[item.risk];

                    return (
                      <TableRow key={item.inventoryId}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.productName}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {item.productSku}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{item.locationName}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.quantity.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrencyDisplay(item.totalValue)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              "tabular-nums font-medium",
                              item.ageInDays > 90 && "text-red-600",
                              item.ageInDays > 60 && item.ageInDays <= 90 && "text-orange-600"
                            )}
                          >
                            {item.ageInDays}d
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(item.receivedAt)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(riskConfig.color, riskConfig.bgColor)}
                          >
                            {riskConfig.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

export default AgingReport;
