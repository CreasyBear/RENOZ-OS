/**
 * ForecastTable Component
 *
 * Displays pipeline forecast data in a tabular format with sorting and export.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-FORECASTING-UI)
 */

import { memo, useState, useMemo } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useOrgFormat } from "@/hooks/use-org-format";
import type { ForecastPeriod } from "@/lib/schemas/pipeline";

// ============================================================================
// TYPES
// ============================================================================

export interface ForecastTableProps {
  data: ForecastPeriod[];
  showWeighted?: boolean;
  title?: string;
  description?: string;
  onExportCsv?: () => void;
  className?: string;
}

type SortField = "period" | "totalValue" | "weightedValue" | "opportunityCount" | "avgProbability";
type SortOrder = "asc" | "desc";

// ============================================================================
// COMPONENT
// ============================================================================

export const ForecastTable = memo(function ForecastTable({
  data,
  showWeighted = true,
  title = "Forecast Details",
  description,
  onExportCsv,
  className,
}: ForecastTableProps) {
  const [sortField, setSortField] = useState<SortField>("period");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (value: number) =>
    formatCurrency(value, { cents: false, showCents: true });

  // Sort data
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "period":
          comparison = a.period.localeCompare(b.period);
          break;
        case "totalValue":
          comparison = a.totalValue - b.totalValue;
          break;
        case "weightedValue":
          comparison = a.weightedValue - b.weightedValue;
          break;
        case "opportunityCount":
          comparison = a.opportunityCount - b.opportunityCount;
          break;
        case "avgProbability":
          comparison = a.avgProbability - b.avgProbability;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [data, sortField, sortOrder]);

  // Calculate totals
  const totals = useMemo(() => {
    return data.reduce(
      (acc, period) => ({
        totalValue: acc.totalValue + period.totalValue,
        weightedValue: acc.weightedValue + period.weightedValue,
        wonValue: acc.wonValue + period.wonValue,
        lostValue: acc.lostValue + period.lostValue,
        opportunityCount: acc.opportunityCount + period.opportunityCount,
      }),
      { totalValue: 0, weightedValue: 0, wonValue: 0, lostValue: 0, opportunityCount: 0 }
    );
  }, [data]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Render sort indicator
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (onExportCsv) {
      onExportCsv();
      return;
    }

    // Default CSV export
    const headers = [
      "Period",
      "Opportunities",
      "Total Value",
      "Weighted Value",
      "Won Value",
      "Lost Value",
      "Avg Probability",
    ];

    const rows = sortedData.map((period) => [
      period.period,
      period.opportunityCount,
      period.totalValue.toFixed(2),
      period.weightedValue.toFixed(2),
      period.wonValue.toFixed(2),
      period.lostValue.toFixed(2),
      period.avgProbability,
    ]);

    // Add totals row
    rows.push([
      "TOTAL",
      totals.opportunityCount,
      totals.totalValue.toFixed(2),
      totals.weightedValue.toFixed(2),
      totals.wonValue.toFixed(2),
      totals.lostValue.toFixed(2),
      "-",
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `forecast-${new Date().toISOString().split("T")[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            No forecast data available.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCsv}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("period")}
                >
                  <div className="flex items-center">
                    Period
                    {renderSortIcon("period")}
                  </div>
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("opportunityCount")}
                >
                  <div className="flex items-center justify-end">
                    Opportunities
                    {renderSortIcon("opportunityCount")}
                  </div>
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("totalValue")}
                >
                  <div className="flex items-center justify-end">
                    Pipeline Value
                    {renderSortIcon("totalValue")}
                  </div>
                </TableHead>
                {showWeighted && (
                  <TableHead
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("weightedValue")}
                  >
                    <div className="flex items-center justify-end">
                      Weighted
                      {renderSortIcon("weightedValue")}
                    </div>
                  </TableHead>
                )}
                <TableHead className="text-right">Won</TableHead>
                <TableHead className="text-right">Lost</TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("avgProbability")}
                >
                  <div className="flex items-center justify-end">
                    Avg Prob
                    {renderSortIcon("avgProbability")}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((period, index) => {
                const prevPeriod = index > 0 ? sortedData[index - 1] : null;
                const valueTrend = prevPeriod
                  ? period.totalValue - prevPeriod.totalValue
                  : 0;

                return (
                  <TableRow key={period.period}>
                    <TableCell className="font-medium">{period.period}</TableCell>
                    <TableCell className="text-right">
                      {period.opportunityCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {formatCurrencyDisplay(period.totalValue)}
                        {valueTrend !== 0 && (
                          <span
                            className={cn(
                              "text-xs",
                              valueTrend > 0 ? "text-green-600" : "text-red-600"
                            )}
                          >
                            {valueTrend > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    {showWeighted && (
                      <TableCell className="text-right">
                        {formatCurrencyDisplay(period.weightedValue)}
                      </TableCell>
                    )}
                    <TableCell className="text-right text-green-600">
                      {period.wonValue > 0 ? formatCurrencyDisplay(period.wonValue) : "-"}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {period.lostValue > 0 ? formatCurrencyDisplay(period.lostValue) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          period.avgProbability >= 60
                            ? "default"
                            : period.avgProbability >= 30
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {period.avgProbability}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-semibold">
                  {totals.opportunityCount}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrencyDisplay(totals.totalValue)}
                </TableCell>
                {showWeighted && (
                  <TableCell className="text-right font-semibold">
                    {formatCurrencyDisplay(totals.weightedValue)}
                  </TableCell>
                )}
                <TableCell className="text-right font-semibold text-green-600">
                  {formatCurrencyDisplay(totals.wonValue)}
                </TableCell>
                <TableCell className="text-right font-semibold text-red-600">
                  {formatCurrencyDisplay(totals.lostValue)}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
});

export default ForecastTable;
