/**
 * ARAgingReport Component
 *
 * AR aging report with bucket summaries and customer drill-down.
 * Shows current, 1-30, 31-60, 61-90, and 90+ day buckets.
 *
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json (DOM-FIN-003b)
 */

import { memo } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRight, AlertTriangle, Building2, User, Download } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { FormatAmount } from '@/components/shared/format';
import type { AgingBucket, AgingBucketSummary, CustomerAgingSummary } from '@/lib/schemas';
import type { ARAgingReportResult } from '@/lib/schemas/financial/ar-aging';

// ============================================================================
// TYPES
// ============================================================================

export interface ARAgingReportProps {
  /** @source useQuery(getARAgingReport) in /financial/ar-aging.tsx */
  report: ARAgingReportResult | undefined;
  /** @source useQuery loading state in /financial/ar-aging.tsx */
  isLoading: boolean;
  /** @source useQuery error state in /financial/ar-aging.tsx */
  error?: unknown;
  /** @source useState(commercialOnly) in /financial/ar-aging.tsx */
  commercialOnly: boolean;
  /** @source setState from useState(commercialOnly) in /financial/ar-aging.tsx */
  onCommercialOnlyChange: (value: boolean) => void;
  /** @source navigate handler in /financial/ar-aging.tsx */
  onCustomerClick?: (customerId: string) => void;
  /** @source export handler in /financial/ar-aging.tsx */
  onExport?: () => void;
  className?: string;
}

// ============================================================================
// BUCKET CONFIG
// ============================================================================

const bucketConfig: Record<AgingBucket, { label: string; color: string }> = {
  current: { label: 'Current', color: 'bg-green-100 text-green-800' },
  '1-30': { label: '1-30 Days', color: 'bg-yellow-100 text-yellow-800' },
  '31-60': { label: '31-60 Days', color: 'bg-orange-100 text-orange-800' },
  '61-90': { label: '61-90 Days', color: 'bg-red-100 text-red-800' },
  '90+': { label: '90+ Days', color: 'bg-red-200 text-red-900' },
};

// ============================================================================
// BUCKET SUMMARY CARD
// ============================================================================

function BucketCard({
  bucket,
  amount,
  count,
  total,
}: {
  bucket: AgingBucket;
  amount: number;
  count: number;
  total: number;
}) {
  const config = bucketConfig[bucket];
  const percentage = total > 0 ? (amount / total) * 100 : 0;

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={config.color}>
            {config.label}
          </Badge>
          <span className="text-muted-foreground text-xs">{count} invoices</span>
        </div>
        <div className="mt-2">
          <p className="text-2xl font-bold">
            <FormatAmount amount={amount} />
          </p>
          <div className="bg-muted mt-1 h-1 overflow-hidden rounded-full">
            <div
              className={cn('h-full', config.color.split(' ')[0])}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <p className="text-muted-foreground mt-1 text-xs">{percentage.toFixed(1)}% of total</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ARAgingReport = memo(function ARAgingReport({
  report,
  isLoading,
  error,
  commercialOnly,
  onCommercialOnlyChange,
  onCustomerClick,
  onExport,
  className,
}: ARAgingReportProps) {
  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('text-destructive p-4', className)}>Failed to load AR aging report</div>
    );
  }

  if (!report) return null;

  const bucketSummary = report.bucketSummary;
  const customers = report.customers ?? [];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AR Aging Report</h2>
          <p className="text-muted-foreground">
            Total Outstanding: <FormatAmount amount={report.totals.totalOutstanding} />
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="commercial-only"
              checked={commercialOnly}
              onCheckedChange={onCommercialOnlyChange}
            />
            <Label htmlFor="commercial-only">Commercial Only</Label>
          </div>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        {bucketSummary.map((bucketData: AgingBucketSummary) => (
          <BucketCard
            key={bucketData.bucket}
            bucket={bucketData.bucket}
            amount={bucketData.amount}
            count={bucketData.count}
            total={report.totals.totalOutstanding}
          />
        ))}
      </div>

      {/* Totals Row */}
      <div className="bg-muted flex gap-4 rounded-lg p-4">
        <div className="flex-1">
          <p className="text-muted-foreground text-sm">Current</p>
          <p className="text-lg font-semibold text-green-600">
            <FormatAmount amount={report.totals.totalCurrent} />
          </p>
        </div>
        <div className="flex-1">
          <p className="text-muted-foreground text-sm">Overdue</p>
          <p className="text-lg font-semibold text-red-600">
            <FormatAmount amount={report.totals.totalOverdue} />
          </p>
        </div>
        <div className="flex-1">
          <p className="text-muted-foreground text-sm">Commercial Outstanding</p>
          <p className="text-lg font-semibold">
            <FormatAmount amount={report.totals.commercialOutstanding} />
          </p>
        </div>
        <div className="flex-1">
          <p className="text-muted-foreground text-sm">Invoice Count</p>
          <p className="text-lg font-semibold">{report.totals.invoiceCount}</p>
        </div>
      </div>

      {/* Customer Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">1-30</TableHead>
                <TableHead className="text-right">31-60</TableHead>
                <TableHead className="text-right">61-90</TableHead>
                <TableHead className="text-right">90+</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer: CustomerAgingSummary) => (
                <TableRow key={customer.customerId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {customer.isCommercial ? (
                        <Building2 className="h-4 w-4 text-blue-500" />
                      ) : (
                        <User className="h-4 w-4 text-gray-400" />
                      )}
                      <Link
                        to="/customers/$customerId"
                        params={{ customerId: customer.customerId }}
                        search={{}}
                        className="font-medium hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {customer.customerName}
                      </Link>
                      {customer.isCommercial && (
                        <Badge variant="outline" className="text-xs">
                          $50K+
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <FormatAmount amount={customer.current} />
                  </TableCell>
                  <TableCell className="text-right">
                    <FormatAmount amount={customer.overdue1_30} />
                  </TableCell>
                  <TableCell className="text-right">
                    <FormatAmount amount={customer.overdue31_60} />
                  </TableCell>
                  <TableCell className="text-right">
                    <FormatAmount amount={customer.overdue61_90} />
                  </TableCell>
                  <TableCell className="text-right">
                    {customer.overdue90Plus > 0 && (
                      <span className="flex items-center justify-end gap-1 text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        <FormatAmount amount={customer.overdue90Plus} />
                      </span>
                    )}
                    {customer.overdue90Plus === 0 && <FormatAmount amount={0} />}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    <FormatAmount amount={customer.totalOutstanding} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onCustomerClick?.(customer.customerId)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
});
