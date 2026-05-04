import { describe, expect, it } from 'vitest';
import {
  buildPriceImportSummary,
  countInvalidPriceImportRows,
  countValidPriceImportRows,
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

  it('counts valid rows from validation results rather than schema-parsed unresolved rows', () => {
    expect(
      countValidPriceImportRows([
        { status: 'valid' },
        { status: 'invalid' },
        { status: 'valid' },
        { status: 'invalid' },
      ])
    ).toBe(2);
  });

  it('includes resolution failures in the preview summary error ledger', () => {
    expect(
      buildPriceImportSummary([
        { rowNumber: 2, status: 'valid' },
        {
          rowNumber: 3,
          status: 'invalid',
          resolution: {
            status: 'unresolved_supplier',
            message: 'Supplier code "CELL404" was not found',
          },
        },
        {
          rowNumber: 4,
          status: 'invalid',
          errors: ['basePrice: Base price must be a valid number'],
        },
      ])
    ).toEqual({
      errors: [
        { rowNumber: 3, errors: ['Supplier code "CELL404" was not found'] },
        { rowNumber: 4, errors: ['basePrice: Base price must be a valid number'] },
      ],
      hasMoreErrors: false,
    });
  });

  it('limits preview summary errors without dropping the overflow signal', () => {
    const summary = buildPriceImportSummary(
      [
        { rowNumber: 2, status: 'invalid', errors: ['first'] },
        { rowNumber: 3, status: 'invalid', errors: ['second'] },
      ],
      1
    );

    expect(summary).toEqual({
      errors: [{ rowNumber: 2, errors: ['first'] }],
      hasMoreErrors: true,
    });
  });
});
