import { describe, expect, it } from 'vitest';

describe('order shipments facade', () => {
  it('keeps shipment server functions available through the compatibility facade', async () => {
    const module = await import('@/server/functions/orders/order-shipments');

    expect(module.listShipments).toBeTypeOf('function');
    expect(module.createShipment).toBeTypeOf('function');
    expect(module.markShipped).toBeTypeOf('function');
    expect(module.updateShipmentStatus).toBeTypeOf('function');
    expect(module.confirmDelivery).toBeTypeOf('function');
    expect(module.getOrderShipments).toBeTypeOf('function');
  });
});
