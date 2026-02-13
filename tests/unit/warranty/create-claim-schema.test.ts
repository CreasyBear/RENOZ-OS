/**
 * createWarrantyClaim Schema Unit Tests
 *
 * Validates behavior of create warranty claim input schema.
 *
 * @see src/lib/schemas/warranty/claims.ts
 */

import { describe, it, expect } from 'vitest';
import { createWarrantyClaimSchema } from '@/lib/schemas/warranty/claims';

const VALID_WARRANTY_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('createWarrantyClaimSchema', () => {
  it('accepts valid input with required fields only', () => {
    const result = createWarrantyClaimSchema.safeParse({
      warrantyId: VALID_WARRANTY_ID,
      claimType: 'cell_degradation',
      description: 'Battery cells showing degradation after 500 cycles',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.warrantyId).toBe(VALID_WARRANTY_ID);
      expect(result.data.claimType).toBe('cell_degradation');
      expect(result.data.cycleCountAtClaim).toBeUndefined();
      expect(result.data.notes).toBeUndefined();
    }
  });

  it('accepts valid input with optional fields', () => {
    const result = createWarrantyClaimSchema.safeParse({
      warrantyId: VALID_WARRANTY_ID,
      claimType: 'bms_fault',
      description: 'BMS fault detected',
      cycleCountAtClaim: 450,
      notes: 'Customer reported intermittent fault',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cycleCountAtClaim).toBe(450);
      expect(result.data.notes).toBe('Customer reported intermittent fault');
    }
  });

  it('accepts all claim types', () => {
    const types = ['cell_degradation', 'bms_fault', 'inverter_failure', 'installation_defect', 'other'] as const;
    for (const claimType of types) {
      const result = createWarrantyClaimSchema.safeParse({
        warrantyId: VALID_WARRANTY_ID,
        claimType,
        description: 'Valid description with enough characters',
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects missing warrantyId', () => {
    const result = createWarrantyClaimSchema.safeParse({
      claimType: 'cell_degradation',
      description: 'Valid description',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid warrantyId (not UUID)', () => {
    const result = createWarrantyClaimSchema.safeParse({
      warrantyId: 'not-a-uuid',
      claimType: 'cell_degradation',
      description: 'Valid description',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid claimType', () => {
    const result = createWarrantyClaimSchema.safeParse({
      warrantyId: VALID_WARRANTY_ID,
      claimType: 'invalid_type',
      description: 'Valid description',
    });
    expect(result.success).toBe(false);
  });

  it('rejects description under 10 characters', () => {
    const result = createWarrantyClaimSchema.safeParse({
      warrantyId: VALID_WARRANTY_ID,
      claimType: 'cell_degradation',
      description: 'Short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects description over 5000 characters', () => {
    const result = createWarrantyClaimSchema.safeParse({
      warrantyId: VALID_WARRANTY_ID,
      claimType: 'cell_degradation',
      description: 'a'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative cycleCountAtClaim', () => {
    const result = createWarrantyClaimSchema.safeParse({
      warrantyId: VALID_WARRANTY_ID,
      claimType: 'cell_degradation',
      description: 'Valid description',
      cycleCountAtClaim: -1,
    });
    expect(result.success).toBe(false);
  });
});
