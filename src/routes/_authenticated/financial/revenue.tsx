/**
 * Revenue Recognition Page
 *
 * Revenue recognition reports showing recognized vs deferred revenue,
 * state tracking, and Xero sync status for each recognition entry.
 *
 * @see src/components/domain/financial/revenue-reports.tsx
 * @see src/server/functions/revenue-recognition.ts
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json (DOM-FIN-008)
 */

import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { startOfYear } from 'date-fns';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { FinancialTableSkeleton } from '@/components/skeletons/financial';
import { RevenueReports } from '@/components/domain/financial/revenue-reports';
import { recognitionStateValues } from '@/lib/schemas/financial/revenue-recognition';
import type { RecognitionState } from '@/lib/schemas/financial/revenue-recognition';
import {
  useRecognitions,
  useRecognitionSummary,
  useDeferredRevenueBalance,
  useRetryRecognitionSync,
} from '@/hooks/financial';

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/_authenticated/financial/revenue')({
  component: RevenueRecognitionPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/financial" />
  ),
  pendingComponent: () => (
    <PageLayout>
      <PageLayout.Header
        title="Revenue Recognition"
        description="Track recognized and deferred revenue with sync status"
      />
      <PageLayout.Content>
        <FinancialTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// PAGE COMPONENT
// ============================================================================

function RevenueRecognitionPage() {
  // ============================================================================
  // CONTAINER: Data Fetching
  // ============================================================================
  const [stateFilter, setStateFilter] = useState<RecognitionState | 'all'>('all');
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const { data: listData, isLoading: listLoading } = useRecognitions({
    state: stateFilter === 'all' ? undefined : stateFilter,
    page: 1,
    pageSize: 50,
  });

  const { data: summaryData, isLoading: summaryLoading } = useRecognitionSummary({
    dateFrom: startOfYear(new Date()),
    dateTo: new Date(),
    groupBy: 'month',
  });

  const { data: balanceData, isLoading: balanceLoading } = useDeferredRevenueBalance();

  const retryMutation = useRetryRecognitionSync();

  const handleRetry = (recognitionId: string) => {
    setRetryingId(recognitionId);
    retryMutation.mutate(recognitionId, {
      onSettled: () => setRetryingId(null),
    });
  };

  // ============================================================================
  // Transform data for UI
  // ============================================================================
  const records = listData?.records ?? [];
  const summary = summaryData ?? [];
  const balance = balanceData ?? null;
  const isLoading = listLoading || summaryLoading || balanceLoading;

  const stateCounts = recognitionStateValues.reduce(
    (acc, state) => {
      acc[state] = 0;
      return acc;
    },
    {} as Record<RecognitionState, number>
  );

  for (const record of records) {
    stateCounts[record.state] = (stateCounts[record.state] ?? 0) + 1;
  }

  return (
    <PageLayout>
      <PageLayout.Header
        title="Revenue Recognition"
        description="Track recognized and deferred revenue with sync status"
      />
      <PageLayout.Content>
        <RevenueReports
          isLoading={isLoading}
          records={records}
          summary={summary}
          balance={balance}
          stateCounts={stateCounts}
          stateFilter={stateFilter}
          onStateFilterChange={setStateFilter}
          retryingId={retryingId}
          onRetry={handleRetry}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
