/**
 * Business Overview Dashboard Presenter
 *
 * ARCHITECTURE: Presenter Component - pure UI, receives all data as props.
 *
 * Displays a comprehensive business overview with 4 sections:
 * - Financial metrics
 * - Pipeline & Sales metrics
 * - Customer metrics
 * - Operations metrics
 */

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  FinancialSection,
  PipelineSection,
  CustomerSection,
  OperationsSection,
  type FinancialMetrics,
  type RevenueTrendPoint,
  type PipelineMetrics,
  type StageData,
  type ForecastPoint,
  type CustomerKpis,
  type HealthDistribution,
  type OperationsMetrics,
} from './sections';

// ============================================================================
// TYPES
// ============================================================================

export interface BusinessOverviewDashboardProps {
  // Financial data
  financialMetrics?: FinancialMetrics | null;
  revenueTrend?: RevenueTrendPoint[] | null;

  // Pipeline data
  pipelineMetrics?: PipelineMetrics | null;
  stageData?: StageData[] | null;
  forecast?: ForecastPoint[] | null;

  // Customer data
  customerKpis?: CustomerKpis | null;
  healthDistribution?: HealthDistribution | null;

  // Operations data
  operationsMetrics?: OperationsMetrics | null;

  // Loading states
  isLoading?: boolean;
  isRefreshing?: boolean;
  loadingStates?: {
    financial: boolean;
    pipeline: boolean;
    customer: boolean;
    operations: boolean;
  };

  // Callbacks
  onRefresh?: () => void;

  // Styling
  className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BusinessOverviewDashboard({
  financialMetrics,
  revenueTrend,
  pipelineMetrics,
  stageData,
  forecast,
  customerKpis,
  healthDistribution,
  operationsMetrics,
  isLoading,
  isRefreshing,
  loadingStates,
  onRefresh,
  className,
}: BusinessOverviewDashboardProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Business Overview</h1>
          <p className="text-sm text-muted-foreground">
            Comprehensive view of your business metrics
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Financial Section */}
      <FinancialSection
        metrics={financialMetrics}
        revenueTrend={revenueTrend}
        isLoading={isLoading || loadingStates?.financial}
      />

      {/* Pipeline Section */}
      <PipelineSection
        metrics={pipelineMetrics}
        stageData={stageData}
        forecast={forecast}
        isLoading={isLoading || loadingStates?.pipeline}
      />

      {/* Bottom Row: Customers + Operations */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CustomerSection
          kpis={customerKpis}
          healthDistribution={healthDistribution}
          isLoading={isLoading || loadingStates?.customer}
        />
        <OperationsSection
          metrics={operationsMetrics}
          isLoading={isLoading || loadingStates?.operations}
        />
      </div>
    </div>
  );
}
