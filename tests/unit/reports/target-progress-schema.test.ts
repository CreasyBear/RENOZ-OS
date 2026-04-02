import { describe, expect, it } from 'vitest';
import { getTargetProgressSchema } from '@/lib/schemas/reports/targets';

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
});
