import { describe, expect, it } from 'vitest';
import {
  getTargetProgressSchema,
  targetProgressResponseSchema,
  targetProgressStatusValues,
} from '@/lib/schemas/reports/targets';

describe('getTargetProgressSchema', () => {
  it('treats missing input as an empty filter object', () => {
    expect(getTargetProgressSchema.parse(undefined)).toEqual({});
  });

  it('still validates explicit metric filters', () => {
    expect(
      getTargetProgressSchema.parse({
        metric: 'revenue',
        period: 'monthly',
      })
    ).toEqual({
      metric: 'revenue',
      period: 'monthly',
    });
  });

  it('allows target-level unavailable progress without faking the response shape', () => {
    expect(targetProgressStatusValues).toContain('unavailable');

    expect(
      targetProgressResponseSchema.parse({
        targets: [
          {
            targetId: '11111111-1111-4111-8111-111111111111',
            targetName: 'Revenue target',
            metric: 'revenue',
            period: 'monthly',
            targetValue: 100000,
            currentValue: 0,
            percentage: 0,
            status: 'unavailable',
            daysRemaining: 12,
            startDate: '2026-05-01',
            endDate: '2026-05-31',
          },
        ],
        overall: {
          achieved: 0,
          total: 1,
          percentage: 0,
          unavailable: 1,
        },
      }).overall.unavailable
    ).toBe(1);
  });
});
