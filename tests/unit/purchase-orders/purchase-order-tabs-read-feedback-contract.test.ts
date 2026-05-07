import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getPurchaseOrderReadErrorMessage,
  PURCHASE_ORDER_ALLOCATION_FALLBACK_MESSAGE,
  PURCHASE_ORDER_COSTS_FALLBACK_MESSAGE,
  PURCHASE_ORDER_RECEIPTS_FALLBACK_MESSAGE,
} from '@/components/domain/purchase-orders/po-read-error-messages';
import { normalizeReadQueryError } from '@/lib/read-path-policy';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('purchase-order tab read feedback contract', () => {
  it('formats cost, allocation, and receipt read failures without leaking unsafe internals', () => {
    const costs = normalizeReadQueryError(
      {
        statusCode: 503,
        code: 'INTERNAL_ERROR',
        message: 'select from purchase_order_costs violates row level security policy',
      },
      {
        contractType: 'always-shaped',
        fallbackMessage: PURCHASE_ORDER_COSTS_FALLBACK_MESSAGE,
      }
    );
    const allocation = normalizeReadQueryError(
      {
        statusCode: 503,
        code: 'INTERNAL_ERROR',
        message: 'select from landed_cost_allocations violates row level security policy',
      },
      {
        contractType: 'always-shaped',
        fallbackMessage: PURCHASE_ORDER_ALLOCATION_FALLBACK_MESSAGE,
      }
    );
    const receipts = normalizeReadQueryError(
      {
        statusCode: 503,
        code: 'INTERNAL_ERROR',
        message: 'select from goods_receipts violates row level security policy',
      },
      {
        contractType: 'always-shaped',
        fallbackMessage: PURCHASE_ORDER_RECEIPTS_FALLBACK_MESSAGE,
      }
    );

    expect(getPurchaseOrderReadErrorMessage(costs, 'costs')).toBe(
      PURCHASE_ORDER_COSTS_FALLBACK_MESSAGE
    );
    expect(getPurchaseOrderReadErrorMessage(allocation, 'allocation')).toBe(
      PURCHASE_ORDER_ALLOCATION_FALLBACK_MESSAGE
    );
    expect(getPurchaseOrderReadErrorMessage(receipts, 'receipts')).toBe(
      PURCHASE_ORDER_RECEIPTS_FALLBACK_MESSAGE
    );
    expect(
      getPurchaseOrderReadErrorMessage(
        new Error('duplicate key violates purchase_order_costs_org_idx postgres stack'),
        'costs'
      )
    ).toBe(PURCHASE_ORDER_COSTS_FALLBACK_MESSAGE);
    expect(
      getPurchaseOrderReadErrorMessage(
        new Error(
          'Purchase order currency (USD) differs from organization currency (AUD). Set exchange rate on the purchase order to view landed cost.'
        ),
        'allocation'
      )
    ).toBe(
      'Purchase order currency (USD) differs from organization currency (AUD). Set exchange rate on the purchase order to view landed cost.'
    );
  });

  it('keeps purchase-order tab warnings behind the read helper', () => {
    const costsTab = read('src/components/domain/purchase-orders/tabs/po-costs-tab.tsx');
    const receiptsTab = read('src/components/domain/purchase-orders/tabs/po-receipts-tab.tsx');
    const costHooks = read('src/hooks/suppliers/use-po-costs.ts');
    const receiptHooks = read('src/hooks/suppliers/use-goods-receipt.ts');

    expect(costHooks).toContain('normalizeReadQueryError(error, {');
    expect(receiptHooks).toContain('normalizeReadQueryError(error, {');
    expect(costsTab).toContain("getPurchaseOrderReadErrorMessage(costsError, 'costs')");
    expect(costsTab).toContain(
      "getPurchaseOrderReadErrorMessage(allocationError, 'allocation')"
    );
    expect(receiptsTab).toContain("getPurchaseOrderReadErrorMessage(error, 'receipts')");
    expect(costsTab).not.toContain('costsError?.message');
    expect(costsTab).not.toContain('allocationError?.message');
    expect(receiptsTab).not.toContain('error?.message');
  });
});
