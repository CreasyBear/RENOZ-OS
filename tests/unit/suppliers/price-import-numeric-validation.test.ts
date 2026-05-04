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
      currency: 'AUD',
      discountValue: 25.5,
      minOrderQty: 2,
      maxOrderQty: 100,
    });
  });

  it('normalizes valid currency codes and rejects malformed currency values', () => {
    expect(parsePriceImportRowData({ ...baseRow, currency: ' usd ' })).toMatchObject({
      currency: 'USD',
    });

    expect(() => parsePriceImportRowData({ ...baseRow, currency: 'AU' })).toThrow(
      /Currency must use a 3-letter code/
    );
    expect(() => parsePriceImportRowData({ ...baseRow, currency: 'AUDD' })).toThrow(
      /Currency must use a 3-letter code/
    );
    expect(() => parsePriceImportRowData({ ...baseRow, currency: '12$' })).toThrow(
      /Currency must use a 3-letter code/
    );
  });

  it('rejects unsupported volume discounts before effective price calculation', () => {
    expect(() =>
      parsePriceImportRowData({
        ...baseRow,
        discountType: 'volume',
        discountValue: '10',
      })
    ).toThrow(/Volume discounts are not supported in supplier price imports/);
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
