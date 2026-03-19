import { describe, expect, it, vi } from 'vitest';
import {
  calculateLineItemTotals,
  calculateOrderTotals,
  validateStatusTransition,
} from '@/server/functions/orders/orders';

vi.mock('@/trigger/jobs', () => ({
  generateQuotePdf: { trigger: vi.fn() },
  generateInvoicePdf: { trigger: vi.fn() },
  generateDeliveryNotePdf: { trigger: vi.fn() },
}));

describe('order refactor smoke', () => {
  it('keeps pricing helpers available through the compatibility facade', () => {
    const line = calculateLineItemTotals({
      quantity: 2,
      unitPrice: 100,
      discountPercent: 10,
      taxType: 'gst',
    });

    const order = calculateOrderTotals([line], null, null, 20);

    expect(line.taxAmount).toBeGreaterThan(0);
    expect(order.total).toBeGreaterThan(order.subtotal);
  });

  it('keeps status transition rules available through the facade', () => {
    expect(validateStatusTransition('draft', 'confirmed')).toBe(true);
    expect(validateStatusTransition('draft', 'delivered')).toBe(false);
  });

  it('order amendments still load after pricing extraction', async () => {
    const module = await import('@/server/functions/orders/order-amendments');
    expect(module.requestAmendment).toBeTypeOf('function');
  });

  it('order templates still load after numbering extraction', async () => {
    const module = await import('@/server/functions/orders/order-templates');
    expect(module.listTemplates).toBeTypeOf('function');
  });
});
