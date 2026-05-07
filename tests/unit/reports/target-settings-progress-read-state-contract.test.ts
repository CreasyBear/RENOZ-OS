import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('target settings progress read-state contract', () => {
  it('keeps target progress read failures out of fake empty and zero states', () => {
    const route = read('src/routes/_authenticated/settings/targets.tsx');
    const hook = read('src/hooks/reports/use-targets.ts');
    const widget = read('src/components/domain/dashboard/target-progress.tsx');

    expect(route).toContain('error: progressError');
    expect(route).toContain('refetch: refetchProgress');
    expect(route).toContain('const progressErrorForDisplay = progressError instanceof Error ? progressError : null;');
    expect(route).toContain('const progressUnavailable = Boolean(progressErrorForDisplay && !progressData);');
    expect(route).toContain('error={progressErrorForDisplay}');
    expect(route).toContain('onRetry={() => refetchProgress()}');
    expect(route).toContain("progressUnavailable ? '--' : progressData?.overall?.achieved ?? 0");
    expect(route).toContain("progressUnavailable ? 'Progress unavailable' : 'Achieved'");
    expect(route).not.toContain('isLoading: isProgressLoading,\\n  } = useTargetProgress();');
    expect(route).not.toContain('{progressData?.overall?.achieved ?? 0}');

    expect(hook).toContain('Target progress is temporarily unavailable. Please refresh and try again.');
    expect(hook).not.toContain('console.debug');
    expect(hook).not.toContain('raw-result');
    expect(widget).toContain('function TargetProgressError');
    expect(widget).toContain('onRetry');
    expect(widget).toContain('No active targets');
  });
});
