/**
 * Receive Goods Unit Tests
 *
 * Verifies currency conversion for multi-currency POs:
 * - Same currency: no conversion
 * - Different currency: unitPrice * exchange_rate
 *
 * @see src/server/functions/suppliers/receive-goods.ts
 * @see src/server/functions/suppliers/receive-goods-utils.ts
 */

import { describe, it, expect } from 'vitest';
import { unitPriceToOrgCurrency } from '@/server/functions/suppliers/receive-goods-utils';

describe('receive-goods-utils', () => {
  describe('unitPriceToOrgCurrency', () => {
    it('returns unit price as-is when PO currency matches org currency', () => {
      expect(unitPriceToOrgCurrency(790, 'AUD', 'AUD', 1)).toBe(790);
      expect(unitPriceToOrgCurrency(1050.5, 'USD', 'USD', null)).toBe(1050.5);
    });

    it('converts USD to AUD using exchange rate', () => {
      // 790 USD * 1.5586 = 1231.294 AUD
      const result = unitPriceToOrgCurrency(790, 'USD', 'AUD', 1.5586);
      expect(result).toBeCloseTo(1231.294, 2);
    });

    it('uses exchange rate 1 when null (same-currency path would not call this)', () => {
      // If callers pass null, we treat as 1 (defensive)
      expect(unitPriceToOrgCurrency(100, 'USD', 'AUD', null)).toBe(100);
    });
  });
});
