import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatOrderExportError,
  ORDER_EXPORT_FAILED_MESSAGE,
} from '@/components/domain/orders/order-export-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('order export feedback contract', () => {
  it('sanitizes unsafe export failures', () => {
    expect(
      formatOrderExportError(new Error('duplicate key value violates unique constraint orders_idx'))
    ).toBe(ORDER_EXPORT_FAILED_MESSAGE);

    expect(
      formatOrderExportError({
        message: 'postgres database stack trace',
        statusCode: 500,
      })
    ).toBe(ORDER_EXPORT_FAILED_MESSAGE);
  });

  it('keeps domain-specific recovery copy for known export failure kinds', () => {
    expect(formatOrderExportError({ statusCode: 403 })).toBe(
      'You do not have permission to export orders.'
    );

    expect(formatOrderExportError({ statusCode: 429 })).toBe(
      'Too many order exports were attempted. Wait a moment and retry.'
    );

    expect(formatOrderExportError({ statusCode: 400 })).toBe(
      'Order export filters could not be applied. Check the filters and try again.'
    );
  });

  it('keeps the orders page export action behind the order-owned formatter', () => {
    const page = read('src/routes/_authenticated/orders/orders-page.tsx');

    expect(page).toContain('formatOrderExportError(error)');
    expect(page).toContain('logger.error(\'Export error\', error);');
    expect(page).not.toContain(
      "toastError(error instanceof Error ? error.message : 'Failed to export orders')"
    );
  });
});
