import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('dashboard overview cache contract', () => {
  it('centralizes the won-this-month query key under the dashboard overview family', () => {
    expect(queryKeys.dashboard.overview()).toEqual(['dashboard', 'overview']);
    expect(queryKeys.dashboard.overviewWonThisMonth('2026-05-01', '2026-05-31')).toEqual([
      'dashboard',
      'overview',
      'wonThisMonth',
      '2026-05-01',
      '2026-05-31',
    ]);

    const container = read('src/components/domain/dashboard/overview/overview-container.tsx');

    expect(container).toContain('queryKeys.dashboard.overviewWonThisMonth(');
    expect(container).not.toContain("queryKey: [\n      'dashboard',\n      'overview',");
  });
});
