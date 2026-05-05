import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AuthError,
  NotFoundError,
  PermissionDeniedError,
  RateLimitError,
  ServerError,
  ValidationError,
} from '@/lib/server/errors';
import { toBulkDeletePOFailure } from '@/server/functions/suppliers/bulk-delete-failure';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('bulk purchase-order delete failure normalization', () => {
  it('maps known server failures to operator-safe row messages', () => {
    expect(toBulkDeletePOFailure('po-1', new NotFoundError())).toEqual({
      id: 'po-1',
      error: 'This purchase order could not be found. Refresh and try again.',
    });

    expect(toBulkDeletePOFailure('po-1', new PermissionDeniedError())).toEqual({
      id: 'po-1',
      error: 'You do not have permission to delete this purchase order.',
    });

    expect(toBulkDeletePOFailure('po-1', new AuthError())).toEqual({
      id: 'po-1',
      error: 'Your session has expired. Sign in again before deleting purchase orders.',
    });

    expect(toBulkDeletePOFailure('po-1', new RateLimitError())).toEqual({
      id: 'po-1',
      error: 'Too many purchase orders were deleted at once. Wait a moment and retry.',
    });
  });

  it('keeps safe validation reasons and suppresses unsafe infrastructure messages', () => {
    expect(
      toBulkDeletePOFailure(
        'po-1',
        new ValidationError('Only draft orders can be deleted.')
      )
    ).toEqual({
      id: 'po-1',
      error: 'Only draft orders can be deleted.',
    });

    expect(
      toBulkDeletePOFailure(
        'po-1',
        new Error('duplicate key value violates unique constraint purchase_orders_pkey')
      )
    ).toEqual({
      id: 'po-1',
      error: 'This purchase order could not be deleted. Refresh and try again.',
    });

    expect(
      toBulkDeletePOFailure(
        'po-1',
        new ValidationError('duplicate key value violates unique constraint purchase_orders_pkey')
      )
    ).toEqual({
      id: 'po-1',
      error: 'This purchase order could not be deleted. Refresh and try again.',
    });

    expect(toBulkDeletePOFailure('po-1', new ServerError('Internal server error'))).toEqual({
      id: 'po-1',
      error: 'This purchase order could not be deleted. Refresh and try again.',
    });
  });

  it('keeps bulk delete server row failures on the normalizer', () => {
    const source = read('src/server/functions/suppliers/purchase-orders.ts');
    const compactSource = compact(source);

    expect(source).toContain(
      "import { toBulkDeletePOFailure, type BulkDeletePOFailure } from './bulk-delete-failure';"
    );
    expect(compactSource).toContain('failed:[]asBulkDeletePOFailure[]');
    expect(source).toContain('results.failed.push(toBulkDeletePOFailure(id, err));');
    expect(source).not.toContain("err instanceof Error ? err.message : 'Unknown error'");
  });
});
