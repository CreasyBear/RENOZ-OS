/**
 * Spend Analysis Component
 *
 * Visualizes procurement spend by supplier, category, and time trends.
 * Includes budget comparison and drill-down capabilities.
 *
 * @see SUPP-ANALYTICS-REPORTING story
 */

import { TrendingUp, TrendingDown, DollarSign, Building2, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/formatters';
import type {
  SpendAnalysisData,
  SpendBySupplier,
  SpendByCategory,
  SpendTrend,
} from '@/lib/schemas/analytics';

// ============================================================================
// TYPES
// ============================================================================

interface SpendAnalysisProps {
  data?: SpendAnalysisData;
  isLoading?: boolean;
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function SpendAnalysisSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="mb-2 h-4 w-24" />
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// SUMMARY CARDS
// ============================================================================

interface SummaryCardsProps {
  totalSpend: number;
  budgetTotal: number;
  budgetUsed: number;
}

function SummaryCards({ totalSpend, budgetTotal, budgetUsed }: SummaryCardsProps) {
  const budgetPercent = (budgetUsed / budgetTotal) * 100;
  const remaining = budgetTotal - budgetUsed;
  const isOverBudget = budgetUsed > budgetTotal;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Spend (YTD)</CardTitle>
          <DollarSign className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalSpend, { cents: false })}</div>
          <p className="text-muted-foreground text-xs">Across all suppliers and categories</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Budget Usage</CardTitle>
          {isOverBudget ? (
            <TrendingUp className="h-4 w-4 text-red-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-green-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{budgetPercent.toFixed(1)}%</div>
          <Progress
            value={Math.min(budgetPercent, 100)}
            className={`mt-2 h-2 ${isOverBudget ? '[&>div]:bg-red-500' : ''}`}
          />
          <p className="text-muted-foreground mt-1 text-xs">
            {formatCurrency(budgetUsed, { cents: false })} of{' '}
            {formatCurrency(budgetTotal, { cents: false })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">
            {isOverBudget ? 'Over Budget' : 'Remaining Budget'}
          </CardTitle>
          <DollarSign className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${isOverBudget ? 'text-red-500' : 'text-green-500'}`}>
            {isOverBudget ? '-' : ''}
            {formatCurrency(Math.abs(remaining), { cents: false })}
          </div>
          <p className="text-muted-foreground text-xs">
            {isOverBudget ? 'Exceeds annual budget' : 'Available for spending'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// SPEND BY SUPPLIER TABLE
// ============================================================================

interface SpendBySupplierTableProps {
  data: SpendBySupplier[];
}

function SpendBySupplierTable({ data }: SpendBySupplierTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Building2 className="h-5 w-5" />
        <CardTitle>Spend by Supplier</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">% of Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((supplier, idx) => (
              <TableRow key={supplier.supplierId}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">#{idx + 1}</span>
                    <span className="font-medium">{supplier.supplierName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(supplier.totalSpend, { cents: false })}
                </TableCell>
                <TableCell className="text-right">{supplier.orderCount}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Progress value={supplier.percentOfTotal} className="h-2 w-16" />
                    <span className="text-sm">{supplier.percentOfTotal.toFixed(1)}%</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SPEND BY CATEGORY TABLE
// ============================================================================

interface SpendByCategoryTableProps {
  data: SpendByCategory[];
}

function SpendByCategoryTable({ data }: SpendByCategoryTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <FolderOpen className="h-5 w-5" />
        <CardTitle>Spend by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">% of Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((category) => (
              <TableRow key={category.category}>
                <TableCell className="font-medium">{category.category}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(category.totalSpend, { cents: false })}
                </TableCell>
                <TableCell className="text-right">{category.orderCount}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Progress value={category.percentOfTotal} className="h-2 w-16" />
                    <span className="text-sm">{category.percentOfTotal.toFixed(1)}%</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SPEND TRENDS
// ============================================================================

interface SpendTrendsProps {
  data: SpendTrend[];
}

function SpendTrends({ data }: SpendTrendsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Spend vs Budget</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead className="text-right">Variance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((trend) => {
              const isUnderBudget = trend.variance >= 0;
              return (
                <TableRow key={trend.period}>
                  <TableCell className="font-medium">{trend.period}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(trend.spend, { cents: false })}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right">
                    {formatCurrency(trend.budget, { cents: false })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={isUnderBudget ? 'secondary' : 'destructive'}>
                      {isUnderBudget ? '+' : ''}
                      {formatCurrency(trend.variance, { cents: false })}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Spend Analysis Presenter
 * Displays spend breakdown by supplier, category, and trends.
 * Receives all data via props - no sample data defaults.
 * 
 * @source data from useSpendMetrics or useProcurementDashboard hook
 */
function SpendAnalysis({ data, isLoading = false }: SpendAnalysisProps) {
  if (isLoading) {
    return <SpendAnalysisSkeleton />;
  }

  // Show empty state if no data available
  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center py-8">
            No spend data available. Data will appear once purchase orders are created.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <SummaryCards
        totalSpend={data.totalSpend}
        budgetTotal={data.budgetTotal}
        budgetUsed={data.budgetUsed}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <SpendBySupplierTable data={data.spendBySupplier} />
        <SpendByCategoryTable data={data.spendByCategory} />
      </div>

      <SpendTrends data={data.spendTrends} />
    </div>
  );
}

export { SpendAnalysis, SpendBySupplierTable, SpendByCategoryTable, SpendTrends };
export type { SpendAnalysisProps };
