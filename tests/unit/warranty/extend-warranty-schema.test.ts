/**
 * extendWarrantySchema Unit Tests
 *
 * Validates behavior of extend warranty input schema.
 *
 * @see src/lib/schemas/warranty/extensions.ts
 */

import { describe, it, expect } from 'vitest';
import { extendWarrantySchema } from '@/lib/schemas/warranty/extensions';

const VALID_WARRANTY_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('extendWarrantySchema', () => {
  it('accepts valid input for paid extension with price', () => {
    const result = extendWarrantySchema.safeParse({
      warrantyId: VALID_WARRANTY_ID,
      extensionType: 'paid_extension',
      extensionMonths: 12,
      price: 199.99,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.extensionType).toBe('paid_extension');
      expect(result.data.price).toBe(199.99);
    }
  });

  it('accepts valid input for goodwill extension without price', () => {
    const result = extendWarrantySchema.safeParse({
      warrantyId: VALID_WARRANTY_ID,
      extensionType: 'goodwill',
      extensionMonths: 6,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.extensionType).toBe('goodwill');
      expect(result.data.price).toBeUndefined();
    }
  });

  it('accepts all extension types', () => {
    const types = ['paid_extension', 'promotional', 'loyalty_reward', 'goodwill'] as const;
    for (const extensionType of types) {
      const input: Record<string, unknown> = {
        warrantyId: VALID_WARRANTY_ID,
        extensionType,
        extensionMonths: 12,
      };
      if (extensionType === 'paid_extension') {
        input.price = 100;
      }
      const result = extendWarrantySchema.safeParse(input);
      expect(result.success).toBe(true);
    }
  });

  it('rejects paid_extension without price', () => {
    const result = extendWarrantySchema.safeParse({
      warrantyId: VALID_WARRANTY_ID,
      extensionType: 'paid_extension',
      extensionMonths: 12,
    });
    expect(result.success).toBe(false);
  });

  it('rejects paid_extension with zero price', () => {
    const result = extendWarrantySchema.safeParse({
      warrantyId: VALID_WARRANTY_ID,
      extensionType: 'paid_extension',
      extensionMonths: 12,
      price: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid warrantyId', () => {
    const result = extendWarrantySchema.safeParse({
      warrantyId: 'not-uuid',
      extensionType: 'goodwill',
      extensionMonths: 12,
    });
    expect(result.success).toBe(false);
  });

  it('rejects extensionMonths over 120', () => {
    const result = extendWarrantySchema.safeParse({
      warrantyId: VALID_WARRANTY_ID,
      extensionType: 'goodwill',
      extensionMonths: 121,
    });
    expect(result.success).toBe(false);
  });

  it('rejects extensionMonths zero or negative', () => {
    expect(extendWarrantySchema.safeParse({
      warrantyId: VALID_WARRANTY_ID,
      extensionType: 'goodwill',
      extensionMonths: 0,
    }).success).toBe(false);
    expect(extendWarrantySchema.safeParse({
      warrantyId: VALID_WARRANTY_ID,
      extensionType: 'goodwill',
      extensionMonths: -1,
    }).success).toBe(false);
  });
});
