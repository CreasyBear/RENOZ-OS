/**
 * Win/Loss Analysis Container
 *
 * Container component that handles data fetching for win/loss analysis.
 * Fetches analysis data and competitors, then passes to presenter component.
 *
 * @source analysis from useWinLossAnalysis hook
 * @source competitors from useCompetitors hook
 *
 * @see src/components/domain/reports/win-loss-analysis.tsx (presenter)
 * @see src/hooks/reports/use-win-loss.ts
 */

import { useState, useMemo, useCallback } from 'react';
import { useWinLossAnalysis, useCompetitors } from '@/hooks/reports';
import { useCreateScheduledReport, useGenerateReport } from '@/hooks/reports';
import { WinLossAnalysis } from './win-loss-analysis';

// ============================================================================
// HELPERS
// ============================================================================

function getDateRange(period: string): { dateFrom: Date; dateTo: Date } {
  const dateTo = new Date();
  const dateFrom = new Date();

  switch (period) {
    case '30d':
      dateFrom.setDate(dateFrom.getDate() - 30);
      break;
    case '90d':
      dateFrom.setDate(dateFrom.getDate() - 90);
      break;
    case '6m':
      dateFrom.setMonth(dateFrom.getMonth() - 6);
      break;
    case '1y':
      dateFrom.setFullYear(dateFrom.getFullYear() - 1);
      break;
    case 'all':
    default:
      dateFrom.setFullYear(2020, 0, 1);
      break;
  }

  return { dateFrom, dateTo };
}

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

export function WinLossAnalysisContainer() {
  const [period, setPeriod] = useState('90d');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const { dateFrom, dateTo } = useMemo(() => getDateRange(period), [period]);

  // Fetch analysis data
  const analysisQuery = useWinLossAnalysis({ dateFrom, dateTo });

  // Fetch competitors
  const competitorsQuery = useCompetitors({ dateFrom, dateTo });

  const createScheduledReport = useCreateScheduledReport();
  const generateReport = useGenerateReport();

  const handleExport = useCallback(
    (format: 'pdf' | 'excel') => {
      const reportFormat = format === 'excel' ? 'xlsx' : 'pdf';
      generateReport
        .mutateAsync({
          metrics: ['win_rate', 'won_revenue', 'lost_revenue'],
          dateFrom: dateFrom.toISOString().split('T')[0],
          dateTo: dateTo.toISOString().split('T')[0],
          format: reportFormat,
          includeCharts: true,
          includeTrends: true,
        })
        .then((result) => {
          window.open(result.reportUrl, '_blank', 'noopener,noreferrer');
        })
        .catch(() => {
          // keep UI quiet; caller can toast
        });
    },
    [generateReport, dateFrom, dateTo]
  );

  const handleScheduleReport = useCallback(() => {
    setScheduleOpen(true);
  }, []);

  const handleScheduleSubmit = useCallback(
    async (input: Parameters<typeof createScheduledReport.mutateAsync>[0]) => {
      await createScheduledReport.mutateAsync(input);
      setScheduleOpen(false);
    },
    [createScheduledReport]
  );

  const handleScheduleOpenChange = useCallback((open: boolean) => {
    setScheduleOpen(open);
  }, []);

  return (
    <WinLossAnalysis
      analysis={analysisQuery.data}
      competitors={competitorsQuery.data?.competitors ?? []}
      isLoading={analysisQuery.isLoading || competitorsQuery.isLoading}
      period={period}
      onPeriodChange={setPeriod}
      onExport={handleExport}
      onScheduleReport={handleScheduleReport}
      scheduleOpen={scheduleOpen}
      onScheduleOpenChange={handleScheduleOpenChange}
      onScheduleSubmit={handleScheduleSubmit}
      isScheduleSubmitting={createScheduledReport.isPending}
    />
  );
}
