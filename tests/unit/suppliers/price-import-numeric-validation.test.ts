import { describe, expect, it } from 'vitest';
import {
  buildPriceImportRowData,
  parsePriceImportRowData,
} from '@/server/functions/suppliers/price-imports';

const baseRow = {
  supplierCode: 'SUP001',
  productName: 'RENOZ 100Ah Lithium Battery',
  basePrice: '250.00',
};

describe('supplier price import numeric validation', () => {
  it('parses currency and quantity fields into finite non-negative numbers', () => {
    const rowData = buildPriceImportRowData(
      ['SUP001', '', 'RENOZ 100Ah Lithium Battery', 'RNZ-100', '$1,250.50', 'AUD', 'fixed', '25.5', '2', '100'],
      null
    );

    expect(parsePriceImportRowData(rowData)).toMatchObject({
      basePrice: 1250.5,
      discountValue: 25.5,
      minOrderQty: 2,
      maxOrderQty: 100,
    });
  });

  it('rejects invalid numeric import fields before supplier/product resolution', () => {
    expect(() => parsePriceImportRowData({ ...baseRow, basePrice: 'not-a-price' })).toThrow(
      /Base price must be a valid number/
    );
    expect(() => parsePriceImportRowData({ ...baseRow, discountValue: 'ten' })).toThrow(
      /Discount value must be a valid number/
    );
    expect(() => parsePriceImportRowData({ ...baseRow, basePrice: '12abc' })).toThrow(
      /Base price must be a valid number/
    );
    expect(() => parsePriceImportRowData({ ...baseRow, discountValue: '10%' })).toThrow(
      /Discount value must be a valid number/
    );
    expect(() => parsePriceImportRowData({ ...baseRow, minOrderQty: '1.5' })).toThrow(
      /Minimum order quantity must be a whole number/
    );
    expect(() => parsePriceImportRowData({ ...baseRow, maxOrderQty: '0' })).toThrow(
      /Maximum order quantity must be at least 1/
    );
  });
});
