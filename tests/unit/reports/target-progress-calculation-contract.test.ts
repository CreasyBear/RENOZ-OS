import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('target progress calculation contract', () => {
  it('keeps metric calculation failures as explicit unavailable progress', () => {
    const server = read('src/server/functions/reports/targets.ts');
    const schema = read('src/lib/schemas/reports/targets.ts');
    const widget = read('src/components/domain/dashboard/target-progress.tsx');
    const hook = read('src/hooks/reports/use-targets.ts');

    expect(schema).toContain("'unavailable'");
    expect(schema).toContain('unavailable: z.number().int().optional()');

    expect(server).toContain('async function calculateMetricValue');
    expect(server).toContain('metricUnavailable = true');
    expect(server).toContain("? 'unavailable'");
    expect(server).toContain('const unavailable = progressItems.filter');
    expect(server).toContain('const availableCount = progressItems.length - unavailable');
    expect(server).not.toContain("Return 0 for metrics that don't have backing data yet");
    expect(server).not.toContain('show 0 progress for failed metric');

    expect(widget).toContain("target.status === 'unavailable'");
    expect(widget).toContain('Progress temporarily unavailable');
    expect(widget).toContain('progress.overall.unavailable');

    expect(hook).toContain('queryKeys.reports.targets.progress(filters)');
    expect(hook).toContain('Target progress is temporarily unavailable. Please refresh and try again.');
  });
});
