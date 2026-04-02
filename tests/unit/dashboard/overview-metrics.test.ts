import { describe, expect, it } from 'vitest';
import {
  buildOverviewStats,
  getOverviewSummaryWarning,
} from '@/components/domain/dashboard/overview/overview-metrics';

describe('overview metrics', () => {
  it('keeps real zero values for ready summaries', () => {
    const stats = buildOverviewStats({
      wonThisMonth: {
        wonCount: 0,
        wonValue: 0,
        summaryState: 'ready',
      },
      ordersPending: {
        count: 0,
        summaryState: 'ready',
      },
      lowStockItems: {
        count: 0,
        criticalCount: 0,
        summaryState: 'ready',
      },
    });

    expect(stats.wonThisMonth.value).toBe(0);
    expect(stats.ordersPending.count).toBe(0);
    expect(stats.lowStockItems.count).toBe(0);
    expect(getOverviewSummaryWarning(stats)).toBeNull();
  });

  it('marks unavailable summaries without silently zeroing them out', () => {
    const stats = buildOverviewStats({
      wonThisMonth: {
        wonCount: 4,
        wonValue: 150000,
        summaryState: 'unavailable',
      },
      ordersPending: {
        count: 9,
        summaryState: 'ready',
      },
      lowStockItems: {
        count: 3,
        criticalCount: 1,
        summaryState: 'loading',
      },
    });

    expect(stats.wonThisMonth.count).toBeNull();
    expect(stats.wonThisMonth.value).toBeNull();
    expect(stats.ordersPending.count).toBe(9);
    expect(stats.lowStockItems.count).toBeNull();
    expect(getOverviewSummaryWarning(stats)).toMatch(/temporarily unavailable/i);
  });
});
