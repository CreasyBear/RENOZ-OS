import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('pipeline activity query key contract', () => {
  it('centralizes activity analytics query keys in the query key factory', () => {
    const filters = {
      opportunityId: 'opp-1',
      dateFrom: new Date('2026-05-01T00:00:00.000Z'),
      dateTo: new Date('2026-05-31T00:00:00.000Z'),
    };

    expect(queryKeys.pipeline.activityAnalytics(filters)).toEqual([
      ...queryKeys.pipeline.all,
      'activity-analytics',
      filters,
    ]);

    const queryKeysSource = read('src/lib/query-keys.ts');
    const activityHooks = read('src/hooks/pipeline/use-activities.ts');

    expect(queryKeysSource).toContain('activityAnalytics:');
    expect(activityHooks).toContain('queryKeys.pipeline.activityAnalytics({');
    expect(activityHooks).not.toContain('...queryKeys.pipeline.all');
    expect(activityHooks).not.toContain("'activity-analytics'");
  });
});
