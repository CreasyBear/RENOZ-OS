/**
 * Win/Loss Analysis Route
 *
 * Container for analyzing win/loss patterns and trends in pipeline opportunities.
 * Fetches win/loss data and competitor information, then passes to presenter.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-WINLOSS-UI)
 */

import { createFileRoute } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { ReportDashboardSkeleton } from '@/components/skeletons/reports';
import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { WinLossAnalysis, getDateRange } from '@/components/domain/reports/win-loss-analysis';
import { getWinLossAnalysis, getCompetitors } from '@/server/functions/pipeline/win-loss-reasons';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/reports/win-loss')({
  component: WinLossAnalysisPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/reports" />
  ),
  pendingComponent: () => (
    <PageLayout>
      <PageLayout.Header
        title="Win/Loss Analysis"
        description="Analyze win/loss patterns in pipeline opportunities"
      />
      <PageLayout.Content>
        <ReportDashboardSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// COMPONENT
// ============================================================================

function WinLossAnalysisPage() {
  // ============================================================================
  // STATE
  // ============================================================================

  const [period, setPeriod] = useState('90d');
  const { dateFrom, dateTo } = useMemo(() => getDateRange(period), [period]);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  // Fetch analysis data
  const analysisQuery = useQuery({
    queryKey: ['win-loss-analysis', dateFrom.toISOString(), dateTo.toISOString()],
    queryFn: async () => {
      const result = await getWinLossAnalysis({
        data: { dateFrom, dateTo },
      });
      return result;
    },
  });

  // Fetch competitors
  const competitorsQuery = useQuery({
    queryKey: ['competitors', dateFrom.toISOString(), dateTo.toISOString()],
    queryFn: async () => {
      const result = await getCompetitors({
        data: { dateFrom, dateTo },
      });
      return result;
    },
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handlePeriodChange = useCallback((newPeriod: string) => {
    setPeriod(newPeriod);
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <WinLossAnalysis
      analysis={analysisQuery.data}
      competitors={(competitorsQuery.data?.competitors ?? []).filter(
        (c): c is { name: string; lossCount: number; totalLostValue: number } => c.name !== null
      )}
      isLoading={analysisQuery.isLoading}
      isLoadingCompetitors={competitorsQuery.isLoading}
      period={period}
      onPeriodChange={handlePeriodChange}
    />
  );
}
