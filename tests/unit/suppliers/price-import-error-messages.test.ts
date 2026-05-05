import { describe, expect, it } from 'vitest';
import { ValidationError } from '@/lib/server/errors';
import {
  PRICE_IMPORT_ROW_VALIDATION_FALLBACK_MESSAGE,
  getPriceImportExecutionErrorMessage,
  getPriceImportValidationErrorMessages,
  parsePriceImportRowData,
} from '@/server/functions/suppliers/price-imports';

describe('supplier price import error messages', () => {
  it('keeps schema validation row errors operator actionable', () => {
    expect(() =>
      parsePriceImportRowData({
        supplierCode: 'CELLCO',
        productName: 'Battery module',
        basePrice: 'not-a-number',
      })
    ).toThrow();

    try {
      parsePriceImportRowData({
        supplierCode: 'CELLCO',
        productName: 'Battery module',
        basePrice: 'not-a-number',
      });
    } catch (error) {
      expect(getPriceImportValidationErrorMessages(error)).toEqual([
        'basePrice: Base price must be a valid number',
      ]);
    }
  });

  it('does not surface raw validation infrastructure errors', () => {
    expect(
      getPriceImportValidationErrorMessages(
        new Error('duplicate key value violates unique constraint supplier_price_import_pkey')
      )
    ).toEqual([PRICE_IMPORT_ROW_VALIDATION_FALLBACK_MESSAGE]);

    expect(
      getPriceImportValidationErrorMessages(
        new ValidationError('duplicate key value violates unique constraint supplier_price_import_pkey')
      )
    ).toEqual([PRICE_IMPORT_ROW_VALIDATION_FALLBACK_MESSAGE]);
  });

  it('keeps known execution validation messages and suppresses raw execution errors', () => {
    expect(
      getPriceImportExecutionErrorMessage(
        new ValidationError('Price import row 4 could not be resolved. Re-run validation and try again.'),
        4
      )
    ).toBe('Price import row 4 could not be resolved. Re-run validation and try again.');

    expect(
      getPriceImportExecutionErrorMessage(
        new Error('duplicate key value violates unique constraint price_lists_pkey'),
        7
      )
    ).toBe('Price import row 7 could not be imported. Refresh validation and try again.');

    expect(
      getPriceImportExecutionErrorMessage(
        new ValidationError('duplicate key value violates unique constraint price_lists_pkey'),
        8
      )
    ).toBe('Price import row 8 could not be imported. Refresh validation and try again.');
  });
});
