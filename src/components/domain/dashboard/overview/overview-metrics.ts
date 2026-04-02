import type { SummaryState } from '@/lib/metrics/summary-health';

export interface OverviewStatsData {
  wonThisMonth: {
    count: number | null;
    value: number | null;
    changePercent?: number;
    summaryState: SummaryState;
  };
  ordersPending: {
    count: number | null;
    oldestDays?: number;
    summaryState: SummaryState;
  };
  lowStockItems: {
    count: number | null;
    criticalCount?: number | null;
    summaryState: SummaryState;
  };
}

export interface BuildOverviewStatsInput {
  wonThisMonth: {
    wonCount?: number | null;
    wonValue?: number | null;
    changePercent?: number;
    summaryState: SummaryState;
  };
  ordersPending: {
    count?: number | null;
    oldestDays?: number;
    summaryState: SummaryState;
  };
  lowStockItems: {
    count?: number | null;
    criticalCount?: number | null;
    summaryState: SummaryState;
  };
}

export function buildOverviewStats(input: BuildOverviewStatsInput): OverviewStatsData {
  return {
    wonThisMonth: {
      count: input.wonThisMonth.summaryState === 'ready' ? input.wonThisMonth.wonCount ?? 0 : null,
      value: input.wonThisMonth.summaryState === 'ready' ? input.wonThisMonth.wonValue ?? 0 : null,
      changePercent: input.wonThisMonth.changePercent,
      summaryState: input.wonThisMonth.summaryState,
    },
    ordersPending: {
      count: input.ordersPending.summaryState === 'ready' ? input.ordersPending.count ?? 0 : null,
      oldestDays: input.ordersPending.summaryState === 'ready' ? input.ordersPending.oldestDays : undefined,
      summaryState: input.ordersPending.summaryState,
    },
    lowStockItems: {
      count: input.lowStockItems.summaryState === 'ready' ? input.lowStockItems.count ?? 0 : null,
      criticalCount:
        input.lowStockItems.summaryState === 'ready'
          ? input.lowStockItems.criticalCount ?? 0
          : null,
      summaryState: input.lowStockItems.summaryState,
    },
  };
}

export function getOverviewSummaryWarning(data: OverviewStatsData): string | null {
  const hasUnavailableMetric =
    data.wonThisMonth.summaryState === 'unavailable' ||
    data.ordersPending.summaryState === 'unavailable' ||
    data.lowStockItems.summaryState === 'unavailable';

  if (!hasUnavailableMetric) {
    return null;
  }

  return 'Some overview metrics are temporarily unavailable. Headline cards may be incomplete until the summaries recover.';
}
