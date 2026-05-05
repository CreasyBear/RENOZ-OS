import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PURCHASE_ORDER_DETAIL_FALLBACK_MESSAGE,
  PURCHASE_ORDER_DETAIL_NOT_FOUND_MESSAGE,
  getPurchaseOrderDetailErrorMessage,
} from '@/components/domain/purchase-orders/po-detail-error-messages';
import { normalizeReadQueryError } from '@/lib/read-path-policy';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('purchase-order detail read state', () => {
  it('preserves read-path normalized purchase-order detail copy', () => {
    const notFoundError = normalizeReadQueryError(
      {
        message: 'Purchase order not found',
        statusCode: 404,
        code: 'NOT_FOUND',
      },
      {
        contractType: 'detail-not-found',
        fallbackMessage: PURCHASE_ORDER_DETAIL_FALLBACK_MESSAGE,
        notFoundMessage: 'The requested purchase order could not be found.',
      }
    );

    expect(getPurchaseOrderDetailErrorMessage(notFoundError)).toBe(
      'The requested purchase order could not be found.'
    );
  });

  it('does not surface raw non-read purchase-order detail errors', () => {
    expect(
      getPurchaseOrderDetailErrorMessage(
        new Error('duplicate key value violates unique constraint purchase_orders_pkey')
      )
    ).toBe(PURCHASE_ORDER_DETAIL_FALLBACK_MESSAGE);
  });

  it('keeps missing detail data on not-found copy', () => {
    expect(getPurchaseOrderDetailErrorMessage(null)).toBe(
      PURCHASE_ORDER_DETAIL_NOT_FOUND_MESSAGE
    );
  });

  it('keeps the detail container on the purchase-order read-error helper', () => {
    const source = read('src/components/domain/purchase-orders/containers/po-detail-container.tsx');

    expect(source).toContain(
      "import { getPurchaseOrderDetailErrorMessage } from '../po-detail-error-messages';"
    );
    expect(source).toContain('message={getPurchaseOrderDetailErrorMessage(error)}');
    expect(source).not.toContain('error instanceof Error');
    expect(source).not.toContain('? error.message');
  });
});
