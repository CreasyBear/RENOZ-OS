import { describe, expect, it } from 'vitest';
import {
  buildPriceImportRowData,
  parsePriceImportRowData,
} from '@/server/functions/suppliers/price-imports';

describe('supplier price import row normalization', () => {
  it('maps template headers to the price import schema field names', () => {
    const headers = [
      'Supplier Code',
      'Supplier Name',
      'Product Name',
      'Product SKU',
      'Base Price',
      'Currency',
      'Discount Type',
      'Discount Value',
      'Min Order Qty',
      'Max Order Qty',
      'Effective Date',
      'Expiry Date',
      'Status',
    ];
    const row = [
      'SUP001',
      'Battery Parts Co',
      'RENOZ 100Ah Lithium Battery',
      'RNZ-100',
      '$250.00',
      'AUD',
      'percentage',
      '10',
      '1',
      '100',
      '2026-05-01',
      '2026-12-31',
      'active',
    ];

    expect(buildPriceImportRowData(row, headers)).toEqual({
      supplierCode: 'SUP001',
      supplierName: 'Battery Parts Co',
      productName: 'RENOZ 100Ah Lithium Battery',
      productSku: 'RNZ-100',
      basePrice: '$250.00',
      currency: 'AUD',
      discountType: 'percentage',
      discountValue: '10',
      minOrderQty: '1',
      maxOrderQty: '100',
      effectiveDate: '2026-05-01',
      expiryDate: '2026-12-31',
      status: 'active',
    });
  });

  it('maps no-header rows using the published template order and defaults', () => {
    const row = ['SUP002', '', 'RENOZ 200Ah Lithium Battery', 'RNZ-200', '450.00'];

    expect(buildPriceImportRowData(row, null)).toMatchObject({
      supplierCode: 'SUP002',
      supplierName: '',
      productName: 'RENOZ 200Ah Lithium Battery',
      productSku: 'RNZ-200',
      basePrice: '450.00',
      currency: 'AUD',
      discountType: 'percentage',
      discountValue: '0',
      status: 'active',
    });
  });

  it('normalizes whitespace and CRLF artifacts from import cells before schema validation', () => {
    const headers = [
      'Supplier Code',
      'Supplier Name',
      'Product Name',
      'Product SKU',
      'Base Price',
      'Currency',
      'Discount Type',
      'Discount Value',
      'Min Order Qty',
      'Max Order Qty',
      'Effective Date',
      'Expiry Date',
      'Status',
    ];
    const row = [
      ' SUP003 ',
      ' Battery Cell Supply Co ',
      ' RENOZ 300Ah Lithium Battery ',
      ' RNZ-300 ',
      ' 650.00 ',
      ' AUD ',
      ' percentage ',
      ' 5 ',
      ' 1 ',
      ' 25 ',
      ' 2026-05-01 ',
      ' 2026-12-31 ',
      ' active\r',
    ];

    const rowData = buildPriceImportRowData(row, headers);

    expect(parsePriceImportRowData(rowData)).toMatchObject({
      supplierCode: 'SUP003',
      supplierName: 'Battery Cell Supply Co',
      productName: 'RENOZ 300Ah Lithium Battery',
      productSku: 'RNZ-300',
      currency: 'AUD',
      discountType: 'percentage',
      effectiveDate: '2026-05-01',
      expiryDate: '2026-12-31',
      status: 'active',
    });
  });
});
