import { describe, expect, it } from 'vitest';
import {
  findCrossLineDuplicateReceiptSerials,
  findDuplicateReceiptSerials,
} from '@/lib/receipt-serial-validation';

describe('receipt serial validation', () => {
  it('detects duplicate receipt serials after canonical trim and uppercase normalization', () => {
    expect(findDuplicateReceiptSerials([' sn-001 ', 'SN-002', 'sn-001'])).toEqual([
      'SN-001',
    ]);
  });

  it('does not report blank serial values as duplicates', () => {
    expect(findDuplicateReceiptSerials(['', '   ', 'SN-001'])).toEqual([]);
  });

  it('detects duplicate receipt serials across lines for the same product', () => {
    expect(
      findCrossLineDuplicateReceiptSerials([
        {
          productId: 'product-1',
          productName: 'RENOZ LFP Module',
          serialNumbers: [' sn-001 '],
        },
        {
          productId: 'product-1',
          productName: 'RENOZ LFP Module',
          serialNumbers: ['SN-001'],
        },
      ])
    ).toEqual([
      {
        productId: 'product-1',
        productName: 'RENOZ LFP Module',
        serialNumber: 'SN-001',
      },
    ]);
  });

  it('allows matching serial text across different products', () => {
    expect(
      findCrossLineDuplicateReceiptSerials([
        {
          productId: 'product-1',
          productName: 'RENOZ LFP Module',
          serialNumbers: ['SN-001'],
        },
        {
          productId: 'product-2',
          productName: 'RENOZ BMS',
          serialNumbers: ['SN-001'],
        },
      ])
    ).toEqual([]);
  });
});
