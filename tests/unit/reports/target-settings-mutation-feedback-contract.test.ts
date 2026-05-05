import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatTargetMutationError } from '@/hooks/reports';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('target settings mutation feedback contract', () => {
  it('routes target settings mutation failures through the reports formatter', () => {
    const route = read('src/routes/_authenticated/settings/targets.tsx');
    const reportsHooks = read('src/hooks/reports/index.ts');
    const reportsFormatter = read('src/hooks/reports/_mutation-errors.ts');
    const hook = read('src/hooks/reports/use-targets.ts');

    expect(reportsHooks).toContain("export { formatTargetMutationError } from './_mutation-errors';");
    expect(reportsFormatter).toContain('TARGET_CODE_MESSAGES');
    expect(reportsFormatter).toContain('formatTargetMutationError');
    expect(reportsFormatter).toContain('You do not have permission to manage targets.');

    expect(route).toContain('formatTargetMutationError');
    expect(route).toContain('catch (error)');
    expect(route).toContain('Target creation is temporarily unavailable. Please refresh and try again.');
    expect(route).toContain('Target update is temporarily unavailable. Please refresh and try again.');
    expect(route).toContain('Target deletion is temporarily unavailable. Please refresh and try again.');
    expect(route).toContain('Bulk target deletion is temporarily unavailable. Please refresh and try again.');
    expect(route).not.toContain("toast.error('Failed to delete target')");
    expect(route).not.toContain("'Failed to update target'");
    expect(route).not.toContain("'Failed to create target'");
    expect(route).not.toContain("toast.error('Failed to delete targets')");
    expect(route).not.toContain('catch {');

    expect(hook).toContain('queryKeys.reports.targets.detail(result.id)');
    expect(hook).toContain('queryKeys.reports.targets.lists()');
    expect(hook).toContain('queryKeys.reports.targets.progress()');
  });

  it('formats target mutation failures without leaking unsafe internals', () => {
    expect(
      formatTargetMutationError(
        { message: 'postgres duplicate key violates targets_org_idx', statusCode: 500 },
        'Target creation is temporarily unavailable. Please refresh and try again.'
      )
    ).toBe('Target creation is temporarily unavailable. Please refresh and try again.');

    expect(
      formatTargetMutationError(
        { code: 'PERMISSION_DENIED' },
        'Target update is temporarily unavailable. Please refresh and try again.'
      )
    ).toBe('You do not have permission to manage targets.');

    expect(
      formatTargetMutationError(
        {
          statusCode: 400,
          errors: {
            targetValue: ['Target value must be positive'],
          },
        },
        'Target creation is temporarily unavailable. Please refresh and try again.'
      )
    ).toBe('Target value must be positive');
  });
});
