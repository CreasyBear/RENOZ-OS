import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('support RMA read-state contract', () => {
  it('keeps RMA list hard and stale read states operator-safe', () => {
    const list = read('src/components/domain/support/rma/rma-list.tsx');
    const container = read('src/components/domain/support/rma/rmas-list-container.tsx');
    const formatter = read('src/lib/support/read-error-messages.ts');
    const hook = read('src/hooks/support/use-rma.ts');
    const queryKeys = read('src/lib/query-key-catalog/support.ts');

    expect(list).toContain('formatSupportReadError');
    expect(list).toContain('Unable to load RMAs');
    expect(list).toContain('RMAs are temporarily unavailable. Please refresh and try again.');
    expect(list).not.toContain('message={error.message}');
    expect(list).not.toContain('Failed to load RMAs');

    expect(container).toContain('Showing cached RMAs');
    expect(container).toContain('Showing the most recent RMAs while refresh is unavailable.');
    expect(container).not.toContain('error.message');
    expect(container).not.toContain('RMA data is temporarily unavailable');

    expect(formatter).toContain('formatSupportReadError');
    expect(formatter).toContain('isReadQueryError(error)');
    expect(hook).toContain('useRmas');
    expect(hook).toContain('requireReadResult');
    expect(hook).toContain('normalizeReadQueryError');
    expect(hook).toContain("contractType: 'always-shaped'");
    expect(queryKeys).toContain('rmasListFiltered');
  });
});
