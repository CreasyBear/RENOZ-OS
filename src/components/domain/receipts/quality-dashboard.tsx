/**
 * Quality Dashboard Component
 *
 * Simple quality metrics display showing acceptance rates and trends.
 *
 * @see SUPP-GOODS-RECEIPT story
 */

import { Package, CheckCircle, XCircle, AlertCircle, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricCard } from '@/components/shared';

// ============================================================================
// TYPES
// ============================================================================

interface QualityMetrics {
  totalReceipts: number;
  totalItemsReceived: number;
  totalItemsAccepted: number;
  totalItemsRejected: number;
  acceptanceRate: number; // 0-100 percentage
  topRejectionReasons: Array<{
    reason: string;
    count: number;
  }>;
}

interface QualityDashboardProps {
  metrics: QualityMetrics | null;
  isLoading?: boolean;
}

// ============================================================================
// LOADING STATE
// ============================================================================

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Package className="text-muted-foreground mb-3 h-12 w-12" />
      <p className="font-medium">No Quality Data</p>
      <p className="text-muted-foreground text-sm">Start receiving goods to see quality metrics.</p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function QualityDashboard({ metrics, isLoading = false }: QualityDashboardProps) {
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!metrics || metrics.totalReceipts === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Total Receipts" value={metrics.totalReceipts} icon={Package} />
        <MetricCard title="Items Received" value={metrics.totalItemsReceived} icon={Package} />
        <MetricCard
          title="Items Accepted"
          value={metrics.totalItemsAccepted}
          icon={CheckCircle}
          iconClassName="text-green-600"
        />
        <MetricCard
          title="Items Rejected"
          value={metrics.totalItemsRejected}
          icon={XCircle}
          iconClassName="text-red-600"
        />
      </div>

      {/* Acceptance Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Percent className="h-4 w-4" />
            Acceptance Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Overall acceptance</span>
              <span className="text-lg font-bold">{metrics.acceptanceRate.toFixed(1)}%</span>
            </div>
            <Progress value={metrics.acceptanceRate} className="h-3" />
            <div className="text-muted-foreground flex justify-between text-xs">
              <span>{metrics.totalItemsAccepted} accepted</span>
              <span>{metrics.totalItemsRejected} rejected</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Rejection Reasons */}
      {metrics.topRejectionReasons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4" />
              Top Rejection Reasons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.topRejectionReasons.map((reason, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm">{reason.reason}</span>
                  <span className="text-sm font-medium">{reason.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export { QualityDashboard };
export type { QualityDashboardProps, QualityMetrics };
