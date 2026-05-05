import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('RMA bulk feedback contract', () => {
  it('keeps RMA list bulk failure feedback formatted before display', () => {
    const container = read('src/components/domain/support/rma/rmas-list-container.tsx');

    expect(container).toContain('buildRmaBulkFailureItems');
    expect(container).toContain('formatRmaBulkFailureToast');
    expect(container).toContain('formatRmaBulkMutationError');
    expect(container).not.toContain('message: failure.error');
    expect(container).not.toContain("err instanceof Error ? err.message : 'Failed to approve RMAs'");
    expect(container).not.toContain("err instanceof Error ? err.message : 'Failed to receive RMAs'");
    expect(container).not.toContain("err instanceof Error ? err.message : 'Failed to retry RMAs'");
  });

  it('keeps bulk receive server result messages operator-safe', () => {
    const server = read('src/server/functions/orders/rma.ts');

    expect(server).toContain('function formatBulkRmaReceiveFailure');
    expect(server).toContain('function isUnsafeBulkRmaFailureMessage');
    expect(server).toContain('error: formatBulkRmaReceiveFailure(err)');
    expect(server).not.toContain("error: err instanceof Error ? err.message : 'Unknown error'");
  });
});
