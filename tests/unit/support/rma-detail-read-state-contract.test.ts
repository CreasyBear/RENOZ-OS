import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('support RMA detail read-state contract', () => {
  it('keeps RMA detail hard and not-found read states operator-safe', () => {
    const card = read('src/components/domain/support/rma/rma-detail-card.tsx');
    const container = read('src/components/domain/support/rma/rma-detail-container.tsx');
    const hook = read('src/hooks/support/use-rma.ts');
    const detailHook = read('src/hooks/support/use-rma-detail.ts');
    const queryKeys = read('src/lib/query-key-catalog/support.ts');

    expect(card).toContain('formatSupportReadError');
    expect(card).toContain('isSupportReadNotFound');
    expect(card).toContain('const isNotFound = !error || isSupportReadNotFound(error)');
    expect(card).toContain("title={isNotFound ? 'RMA not found' : 'Unable to load RMA'}");
    expect(card).toContain('RMA details are temporarily unavailable. Please refresh and try again.');
    expect(card).toContain('The requested RMA could not be found.');
    expect(card).not.toContain('error?.message');
    expect(card).not.toContain('Failed to load RMA');

    expect(container).toContain('useRmaDetail');
    expect(container).toContain('RmaDetailView');
    expect(detailHook).toContain('useRma({ rmaId })');
    expect(hook).toContain('useRma');
    expect(hook).toContain('requireReadResult');
    expect(hook).toContain('normalizeReadQueryError');
    expect(hook).toContain("contractType: 'detail-not-found'");
    expect(hook).toContain('The requested RMA could not be found.');
    expect(queryKeys).toContain('rmaDetail');
  });
});
