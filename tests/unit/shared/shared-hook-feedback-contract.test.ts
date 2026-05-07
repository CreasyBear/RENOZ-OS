import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatMutationError } from '@/lib/mutation-error-feedback';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('shared hook feedback contract', () => {
  it('uses safe fallback copy for unsafe generic async failures', () => {
    expect(
      formatMutationError(
        new Error('duplicate key violates async_operation_idx postgres stack'),
        'Operation failed. Please retry.'
      )
    ).toBe('Operation failed. Please retry.');
  });

  it('keeps shared loading and undo hooks off raw error.message patterns', () => {
    const loading = read('src/hooks/_shared/use-loading-state.ts');
    const undoable = read('src/hooks/_shared/use-undoable-action.ts');

    expect(loading).toContain('formatMutationError(');
    expect(undoable).toContain('formatMutationError(error,');

    for (const source of [loading, undoable]) {
      expect(source).not.toContain('error instanceof Error ? error.message');
      expect(source).not.toContain('description: error instanceof Error');
    }
  });
});
