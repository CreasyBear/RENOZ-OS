import { describe, expect, it, vi } from 'vitest';
import {
  buildShipmentShippingCostAmendmentRequest,
  getShipmentShippingCostSyncErrorMessage,
  syncShipmentShippingCostAmendment,
} from '@/hooks/orders/use-shipment-shipping-cost-amendment';

describe('shipment shipping cost amendment sync', () => {
  it('builds the shipping_change amendment request used after shipment creation', () => {
    expect(
      buildShipmentShippingCostAmendmentRequest({
        orderId: 'order-1',
        shippingAmount: 42.5,
      })
    ).toEqual({
      orderId: 'order-1',
      amendmentType: 'shipping_change',
      reason: 'Shipping cost from shipment',
      changes: {
        type: 'shipping_change',
        description: 'Shipping cost from shipment',
        shippingAmount: 42.5,
      },
    });
  });

  it('requests, approves, and applies the shipping cost amendment in sequence', async () => {
    const mutations = {
      requestAmendment: vi.fn().mockResolvedValue({ id: 'amendment-1' }),
      approveAmendment: vi.fn().mockResolvedValue({ id: 'amendment-1' }),
      applyAmendment: vi.fn().mockResolvedValue({ id: 'amendment-1' }),
    };

    const result = await syncShipmentShippingCostAmendment({
      orderId: 'order-1',
      shippingAmount: 42.5,
      mutations,
    });

    expect(result).toEqual({ ok: true, amendmentId: 'amendment-1' });
    expect(mutations.requestAmendment).toHaveBeenCalledWith({
      orderId: 'order-1',
      amendmentType: 'shipping_change',
      reason: 'Shipping cost from shipment',
      changes: {
        type: 'shipping_change',
        description: 'Shipping cost from shipment',
        shippingAmount: 42.5,
      },
    });
    expect(mutations.approveAmendment).toHaveBeenCalledWith({ amendmentId: 'amendment-1' });
    expect(mutations.applyAmendment).toHaveBeenCalledWith({ amendmentId: 'amendment-1' });
  });

  it('returns operator-safe fallback text for unknown amendment sync failures', async () => {
    const mutations = {
      requestAmendment: vi.fn().mockResolvedValue({ id: 'amendment-1' }),
      approveAmendment: vi.fn().mockRejectedValue(new Error('database driver stack leaked')),
      applyAmendment: vi.fn(),
    };

    const result = await syncShipmentShippingCostAmendment({
      orderId: 'order-1',
      shippingAmount: 42.5,
      mutations,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe('Create a shipping amendment manually.');
      expect(result.error.kind).toBe('unknown');
    }
    expect(mutations.applyAmendment).not.toHaveBeenCalled();
  });

  it('preserves useful conflict guidance for amendment sync failures', () => {
    expect(
      getShipmentShippingCostSyncErrorMessage({
        message: 'Order was modified by another user. Please refresh and try again.',
        statusCode: 409,
        code: 'CONFLICT',
      })
    ).toContain('refresh');
  });
});
