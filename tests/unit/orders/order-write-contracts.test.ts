import { describe, expect, it } from 'vitest';
import {
  addOrderLineItemInputSchema,
  confirmDeliverySchema,
  createOrderSchema,
  deleteOrderLineItemInputSchema,
  markShippedSchema,
  updateOrderLineItemInputSchema,
  updateOrderSchema,
} from '@/lib/schemas/orders';

describe('order write contracts', () => {
  it('requires clientRequestId for create order', () => {
    const result = createOrderSchema.safeParse({
      customerId: '11111111-1111-4111-8111-111111111111',
      lineItems: [
        {
          description: 'Battery',
          quantity: 1,
          unitPrice: 10,
          taxType: 'gst',
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('requires expectedVersion for order header updates', () => {
    const result = updateOrderSchema.safeParse({
      internalNotes: 'Updated',
    });

    expect(result.success).toBe(false);
  });

  it('does not inject create defaults into order header updates', () => {
    const result = updateOrderSchema.safeParse({
      expectedVersion: 3,
      internalNotes: 'Updated',
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data).not.toHaveProperty('status');
    expect(result.data).not.toHaveProperty('paymentStatus');
    expect(result.data).not.toHaveProperty('shippingAmount');
    expect(result.data).not.toHaveProperty('metadata');
  });

  it('ignores workflow status fields on generic order header updates', () => {
    const result = updateOrderSchema.safeParse({
      expectedVersion: 3,
      internalNotes: 'Updated',
      status: 'draft',
      paymentStatus: 'paid',
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data).not.toHaveProperty('status');
    expect(result.data).not.toHaveProperty('paymentStatus');
  });

  it('allows clearing nullable header fields during order edits', () => {
    const result = updateOrderSchema.safeParse({
      expectedVersion: 3,
      dueDate: null,
      internalNotes: null,
      customerNotes: null,
      shippingAddress: null,
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.dueDate).toBeNull();
    expect(result.data.internalNotes).toBeNull();
    expect(result.data.customerNotes).toBeNull();
    expect(result.data.shippingAddress).toBeNull();
  });

  it('requires expectedOrderVersion for line-item mutations', () => {
    expect(
      addOrderLineItemInputSchema.safeParse({
        orderId: '11111111-1111-4111-8111-111111111111',
        item: {
          description: 'Battery',
          quantity: 1,
          unitPrice: 10,
          taxType: 'gst',
        },
      }).success
    ).toBe(false);

    expect(
      updateOrderLineItemInputSchema.safeParse({
        orderId: '11111111-1111-4111-8111-111111111111',
        itemId: '22222222-2222-4222-8222-222222222222',
        data: { quantity: 2 },
      }).success
    ).toBe(false);

    expect(
      deleteOrderLineItemInputSchema.safeParse({
        orderId: '11111111-1111-4111-8111-111111111111',
        itemId: '22222222-2222-4222-8222-222222222222',
      }).success
    ).toBe(false);
  });

  it('requires idempotency keys for shipment finalization', () => {
    expect(
      markShippedSchema.safeParse({
        id: '11111111-1111-4111-8111-111111111111',
        carrier: 'AusPost',
      }).success
    ).toBe(false);

    expect(
      confirmDeliverySchema.safeParse({
        id: '11111111-1111-4111-8111-111111111111',
      }).success
    ).toBe(false);
  });
});
