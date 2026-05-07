import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatMobileWarehouseActionError,
  isSerializedPickSyncFailure,
  SERIALIZED_PICK_SYNC_DESKTOP_MESSAGE,
} from '@/routes/_authenticated/mobile/mobile-warehouse-action-errors';

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

  it('classifies serialized pick sync blockers without route-level raw message parsing', () => {
    expect(isSerializedPickSyncFailure(new Error('Serial numbers are required'), undefined)).toBe(
      true
    );
    expect(
      isSerializedPickSyncFailure(
        new Error('Serialized line item must provide matching serial count'),
        []
      )
    ).toBe(true);
    expect(
      isSerializedPickSyncFailure(new Error('Serial numbers are required'), ['SN-100'])
    ).toBe(false);
    expect(
      isSerializedPickSyncFailure(
        new Error('duplicate key value violates unique constraint pick_items_pkey'),
        []
      )
    ).toBe(false);
    expect(
      isSerializedPickSyncFailure(
        new Error('duplicate key value violates unique constraint serial_numbers_pkey'),
        []
      )
    ).toBe(false);
    expect(SERIALIZED_PICK_SYNC_DESKTOP_MESSAGE).toBe(
      'Serialized pick could not sync - open order on desktop to complete'
    );
  });

  it('keeps mobile picking and counting routes on the shared formatter contract', () => {
    const pickingPage = read('src/routes/_authenticated/mobile/-picking-page.tsx');
    const countingPage = read('src/routes/_authenticated/mobile/-counting-page.tsx');

    expect(pickingPage).toContain('formatMobileWarehouseActionError(error, "confirmPick")');
    expect(pickingPage).toContain('isSerializedPickSyncFailure(err, item.serialNumbers)');
    expect(pickingPage).toContain('SERIALIZED_PICK_SYNC_DESKTOP_MESSAGE');
    expect(countingPage).toContain('formatMobileWarehouseActionError(error, "submitCount")');
    expect(pickingPage).not.toContain('const msg = err instanceof Error ? err.message');
    expect(pickingPage).not.toContain('/serial|Serial/.test(msg)');
    expect(pickingPage).not.toContain(
      'error instanceof Error ? error.message : "Failed to confirm pick"'
    );
    expect(countingPage).not.toContain(
      'error instanceof Error ? error.message : "Failed to submit count"'
    );
  });
});
