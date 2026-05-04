import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getPurchaseOrderScheduleDateError } from '@/lib/purchase-orders/schedule-dates';

describe('purchase order schedule date validation', () => {
  it('accepts required and expected dates on or after the order date', () => {
    expect(
      getPurchaseOrderScheduleDateError({
        orderDate: '2026-05-05',
        requiredDate: '2026-05-05',
        expectedDeliveryDate: '2026-05-12',
      })
    ).toBeNull();
  });

  it('returns an operator-safe required date error', () => {
    expect(
      getPurchaseOrderScheduleDateError({
        orderDate: '2026-05-05',
        requiredDate: '2026-05-04',
      })
    ).toEqual({
      message: 'Required date (2026-05-04) cannot be before order date (2026-05-05)',
      fieldErrors: { requiredDate: ['Required date cannot be before order date'] },
    });
  });

  it('returns an operator-safe expected delivery date error', () => {
    expect(
      getPurchaseOrderScheduleDateError({
        orderDate: '2026-05-05',
        expectedDeliveryDate: '2026-05-04',
      })
    ).toEqual({
      message: 'Expected delivery date (2026-05-04) cannot be before order date (2026-05-05)',
      fieldErrors: {
        expectedDeliveryDate: ['Expected delivery date cannot be before order date'],
      },
    });
  });

  it('keeps create and update server functions on the shared schedule-date rule', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/server/functions/suppliers/purchase-orders.ts'),
      'utf8'
    ).replace(/\s+/g, '');

    expect(source).toMatch(
      /getPurchaseOrderScheduleDateError\(\{orderDate,requiredDate:data\.requiredDate,expectedDeliveryDate:data\.expectedDeliveryDate,?\}\)/
    );
    expect(source).toMatch(
      /getPurchaseOrderScheduleDateError\(\{orderDate:existing\.po\.orderDate,requiredDate:updateData\.requiredDate,expectedDeliveryDate:updateData\.expectedDeliveryDate,?\}\)/
    );
  });
});
