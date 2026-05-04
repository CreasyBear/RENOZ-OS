import { describe, expect, it } from 'vitest';
import {
  countInvalidPriceImportRows,
  getPriceImportValidationStatus,
} from '@/server/functions/suppliers/price-imports';

describe('supplier price import preview summary', () => {
  it('treats unresolved supplier/product resolution statuses as invalid preview rows', () => {
    expect(getPriceImportValidationStatus('resolved')).toBe('valid');
    expect(getPriceImportValidationStatus('duplicate_target')).toBe('valid');
    expect(getPriceImportValidationStatus('unresolved_supplier')).toBe('invalid');
    expect(getPriceImportValidationStatus('unresolved_product')).toBe('invalid');
    expect(getPriceImportValidationStatus('ambiguous_product')).toBe('invalid');
  });

  it('counts invalid rows from validation results rather than only parser errors', () => {
    expect(
      countInvalidPriceImportRows([
        { status: 'valid' },
        { status: 'invalid' },
        { status: 'valid' },
        { status: 'invalid' },
      ])
    ).toBe(2);
  });
});
