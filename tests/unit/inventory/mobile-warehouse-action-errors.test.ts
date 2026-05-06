import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatMobileWarehouseActionError } from '@/routes/_authenticated/mobile/mobile-warehouse-action-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('mobile warehouse action feedback', () => {
  it('suppresses unsafe mobile picking and counting failures', () => {
    expect(
      formatMobileWarehouseActionError(
        new Error('duplicate key value violates unique constraint pick_items_pkey'),
        'confirmPick'
      )
    ).toBe('Unable to confirm pick. Refresh and try again.');

    expect(
      formatMobileWarehouseActionError(
        {
          statusCode: 500,
          message: 'TypeError: Cannot read properties of undefined (reading inventoryId)',
        },
        'submitCount'
      )
    ).toBe('Unable to submit count. Refresh and try again.');
  });

  it('keeps safe validation and known action codes useful for warehouse operators', () => {
    expect(
      formatMobileWarehouseActionError(
        { statusCode: 400, errors: { quantity: ['Quantity must be greater than 0.'] } },
        'confirmPick'
      )
    ).toBe('Quantity must be greater than 0.');

    expect(
      formatMobileWarehouseActionError({ statusCode: 409, code: 'CONFLICT' }, 'submitCount')
    ).toBe('Warehouse task changed. Refresh and review before trying again.');
  });

  it('keeps mobile picking and counting routes on the shared formatter contract', () => {
    const pickingPage = read('src/routes/_authenticated/mobile/-picking-page.tsx');
    const countingPage = read('src/routes/_authenticated/mobile/-counting-page.tsx');

    expect(pickingPage).toContain('formatMobileWarehouseActionError(error, "confirmPick")');
    expect(countingPage).toContain('formatMobileWarehouseActionError(error, "submitCount")');
    expect(pickingPage).not.toContain(
      'error instanceof Error ? error.message : "Failed to confirm pick"'
    );
    expect(countingPage).not.toContain(
      'error instanceof Error ? error.message : "Failed to submit count"'
    );
  });
});
