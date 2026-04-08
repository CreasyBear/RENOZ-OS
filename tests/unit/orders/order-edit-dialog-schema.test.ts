import { describe, expect, it } from 'vitest';

import { editOrderSchema } from '@/components/domain/orders/cards/order-edit-dialog.schema';

const customerId = '11111111-1111-4111-8111-111111111111';

describe('order edit dialog schema', () => {
  it('allows saving non-address changes when shipping address is blank', () => {
    const result = editOrderSchema.safeParse({
      customerId,
      orderNumber: 'SO-100',
      dueDate: '2026-04-10',
      internalNotes: 'Updated note',
      customerNotes: '',
      shippingAddress: {
        street1: '',
        street2: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
        contactName: '',
        contactPhone: '',
      },
    });

    expect(result.success).toBe(true);
  });

  it('requires the rest of the address once shipping details start being entered', () => {
    const result = editOrderSchema.safeParse({
      customerId,
      orderNumber: 'SO-100',
      dueDate: '2026-04-10',
      internalNotes: '',
      customerNotes: '',
      shippingAddress: {
        street1: '12 Test Street',
        street2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'AU',
        contactName: '',
        contactPhone: '',
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.shippingAddress?.length ?? 0).toBeGreaterThan(0);
    }
  });
});
