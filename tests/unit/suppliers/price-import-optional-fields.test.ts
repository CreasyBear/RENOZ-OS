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

describe('supplier price import optional field handling', () => {
  it('normalizes blank optional import fields before resolution and persistence', () => {
    const rowData = buildPriceImportRowData(
      ['SUP001', '', 'RENOZ 100Ah Lithium Battery', '', '250.00', 'AUD', 'percentage', '0', '', '', '', '', 'active'],
      null
    );

    expect(parsePriceImportRowData(rowData)).toMatchObject({
      supplierCode: 'SUP001',
      supplierName: undefined,
      productName: 'RENOZ 100Ah Lithium Battery',
      productSku: undefined,
      effectiveDate: undefined,
      expiryDate: undefined,
    });
  });

  it('requires template date fields to use YYYY-MM-DD format when present', () => {
    expect(parsePriceImportRowData({ ...baseRow, effectiveDate: '2026-05-01' })).toMatchObject({
      effectiveDate: '2026-05-01',
    });

    expect(() => parsePriceImportRowData({ ...baseRow, effectiveDate: '05/01/2026' })).toThrow(
      /Effective date must use YYYY-MM-DD format/
    );
    expect(() => parsePriceImportRowData({ ...baseRow, expiryDate: 'next month' })).toThrow(
      /Expiry date must use YYYY-MM-DD format/
    );
  });
});
