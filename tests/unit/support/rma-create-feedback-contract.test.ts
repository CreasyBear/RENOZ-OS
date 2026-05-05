import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('RMA create feedback contract', () => {
  it('keeps create mutation failure feedback at the order container boundary', () => {
    const orderContainer = read('src/components/domain/orders/containers/order-detail-container.tsx');
    const dialog = read('src/components/domain/support/rma/rma-create-dialog.tsx');

    expect(orderContainer).toContain(
      "import { formatRmaMutationError, useCreateRma, useIssue } from '@/hooks/support'"
    );
    expect(orderContainer).toContain(
      "toastError(formatRmaMutationError(error, 'Failed to create RMA'))"
    );
    expect(orderContainer).toContain('throw error;');

    expect(dialog).toContain('Mutation feedback is owned by the submit caller');
    expect(dialog).not.toContain("error instanceof Error ? error.message : 'Failed to create RMA'");
    expect(dialog).not.toContain("toastError('Failed to create RMA')");
  });
});
