import { describe, expect, it } from 'vitest';
import { getDashboardMetricsSchema } from '@/lib/schemas/dashboard/metrics';

describe('getDashboardMetricsSchema', () => {
  it('treats missing input as an empty filter object', () => {
    expect(getDashboardMetricsSchema.parse(undefined)).toEqual({});
  });

  it('still validates explicit date filters', () => {
    expect(
      getDashboardMetricsSchema.parse({
        dateFrom: '2026-04-01',
        dateTo: '2026-04-30',
      })
    ).toEqual({
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
    });
  });
});
