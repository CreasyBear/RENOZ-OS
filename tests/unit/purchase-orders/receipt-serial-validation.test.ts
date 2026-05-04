import { describe, expect, it } from 'vitest';
import { findDuplicateReceiptSerials } from '@/components/domain/purchase-orders/receive/receipt-serial-validation';

describe('receipt serial validation', () => {
  it('detects duplicate receipt serials after canonical trim and uppercase normalization', () => {
    expect(findDuplicateReceiptSerials([' sn-001 ', 'SN-002', 'sn-001'])).toEqual([
      'SN-001',
    ]);
  });

  it('does not report blank serial values as duplicates', () => {
    expect(findDuplicateReceiptSerials(['', '   ', 'SN-001'])).toEqual([]);
  });
});
