import { describe, expect, it } from 'vitest';
import { parsePriceImportRowData } from '@/server/functions/suppliers/price-imports';

const baseRow = {
  supplierCode: 'SUP001',
  productName: 'RENOZ 100Ah Lithium Battery',
  basePrice: '250.00',
};

describe('supplier price import date window validation', () => {
  it('allows expiry dates on or after the effective date', () => {
    expect(
      parsePriceImportRowData({
        ...baseRow,
        effectiveDate: '2026-05-01',
        expiryDate: '2026-05-01',
      })
    ).toMatchObject({
      effectiveDate: '2026-05-01',
      expiryDate: '2026-05-01',
    });

    expect(
      parsePriceImportRowData({
        ...baseRow,
        effectiveDate: '2026-05-01',
        expiryDate: '2026-12-31',
      })
    ).toMatchObject({
      effectiveDate: '2026-05-01',
      expiryDate: '2026-12-31',
    });
  });

  it('rejects price windows that expire before they become effective', () => {
    expect(() =>
      parsePriceImportRowData({
        ...baseRow,
        effectiveDate: '2026-05-01',
        expiryDate: '2026-04-30',
      })
    ).toThrow(/Expiry date must be on or after effective date/);
  });
});
