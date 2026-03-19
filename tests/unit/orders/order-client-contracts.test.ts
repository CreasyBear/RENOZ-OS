import { describe, expect, it } from 'vitest';
import {
  getClientErrorMessage,
  normalizeOrderMutationError,
  normalizeShipmentMutationError,
} from '@/hooks/orders/order-mutation-client-errors';
import { applyOptimisticOrderPatch } from '@/hooks/orders/apply-optimistic-order-patch';

describe('order client contracts', () => {
  it('classifies order conflicts and retry guidance', () => {
    const error = normalizeOrderMutationError({
      message: 'Order status was modified by another user. Please refresh and try again.',
      statusCode: 409,
      code: 'CONFLICT',
    });

    expect(error.kind).toBe('conflict');
    expect(getClientErrorMessage(error, 'Unable to update order.')).toContain('refresh');
  });

  it('classifies shipment transition blocks from validation payloads', () => {
    const error = normalizeShipmentMutationError({
      message: 'Invalid status transition',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      errors: {
        code: ['transition_blocked'],
      },
    });

    expect(error.kind).toBe('blocked');
    expect(error.fieldErrors?.code).toEqual(['transition_blocked']);
  });

  it('preserves server-owned order fields during optimistic patching', () => {
    const patched = applyOptimisticOrderPatch(
      {
        id: 'order-1',
        orderNumber: 'ORD-001',
        status: 'draft',
        shippingAmount: 500,
        subtotal: 1000,
        total: 1100,
        version: 7,
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      },
      {
        id: 'order-1',
        orderNumber: 'ORD-002',
        shippingAmount: 900,
        expectedVersion: 7,
        version: 8,
        updatedAt: new Date('2026-03-02T00:00:00.000Z'),
        total: 1800,
      }
    );

    expect(patched.orderNumber).toBe('ORD-002');
    expect(patched.shippingAmount).toBe(900);
    expect(patched.version).toBe(7);
    expect(patched.total).toBe(1100);
    expect(patched.updatedAt).toEqual(new Date('2026-03-01T00:00:00.000Z'));
    expect(patched).not.toHaveProperty('expectedVersion');
  });
});
