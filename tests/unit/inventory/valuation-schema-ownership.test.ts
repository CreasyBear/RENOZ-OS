import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  cogsCalculationSchema,
  createCostLayerSchema,
  inventoryFinanceIntegrityQuerySchema,
  inventoryFinanceReconcileSchema,
  inventoryTurnoverQuerySchema,
  inventoryValuationQuerySchema,
} from '@/lib/schemas/inventory';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('inventory valuation schema ownership', () => {
  it('keeps valuation and finance integrity schemas owned by the valuation schema file', () => {
    const valuationSchema = read('src/lib/schemas/inventory/valuation.ts');
    const inventorySchema = read('src/lib/schemas/inventory/inventory.ts');

    expect(valuationSchema).toContain('export const createCostLayerSchema');
    expect(valuationSchema).toContain('export const inventoryValuationQuerySchema');
    expect(valuationSchema).toContain('export const cogsCalculationSchema');
    expect(valuationSchema).toContain('export const inventoryFinanceIntegrityQuerySchema');
    expect(valuationSchema).toContain('export interface InventoryValuationResult');
    expect(inventorySchema).not.toContain('export const createCostLayerSchema');
    expect(inventorySchema).not.toContain('export const inventoryValuationQuerySchema');
    expect(inventorySchema).not.toContain('export const cogsCalculationSchema');
    expect(inventorySchema).not.toContain('export const inventoryFinanceIntegrityQuerySchema');
    expect(inventorySchema).not.toContain('export interface InventoryValuationResult');
  });

  it('preserves the public inventory schema barrel for valuation callers', () => {
    expect(inventoryValuationQuerySchema.parse(undefined)).toEqual({
      valuationMethod: 'fifo',
    });
    expect(inventoryTurnoverQuerySchema.parse(undefined)).toEqual({
      period: '365d',
    });
    expect(inventoryFinanceIntegrityQuerySchema.parse(undefined)).toEqual({
      valueDriftTolerance: 0.01,
      topDriftLimit: 25,
    });
    expect(inventoryFinanceReconcileSchema.parse(undefined)).toEqual({
      dryRun: true,
      limit: 1000,
    });
    expect(
      cogsCalculationSchema.parse({
        inventoryId: '00000000-0000-4000-8000-000000000001',
        quantity: '2',
      })
    ).toMatchObject({
      inventoryId: '00000000-0000-4000-8000-000000000001',
      quantity: 2,
      simulate: true,
    });
    expect(
      createCostLayerSchema.parse({
        inventoryId: '00000000-0000-4000-8000-000000000001',
        receivedAt: '2026-01-01T00:00:00.000Z',
        quantityReceived: 3,
        quantityRemaining: 3,
        unitCost: '42.50',
      })
    ).toMatchObject({
      inventoryId: '00000000-0000-4000-8000-000000000001',
      quantityReceived: 3,
      quantityRemaining: 3,
      unitCost: 42.5,
    });
  });

  it('rejects cost layers with remaining quantity above received quantity', () => {
    const result = createCostLayerSchema.safeParse({
      inventoryId: '00000000-0000-4000-8000-000000000001',
      receivedAt: '2026-01-01T00:00:00.000Z',
      quantityReceived: 3,
      quantityRemaining: 4,
      unitCost: '42.50',
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected invalid cost-layer quantity bounds');
    }
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['quantityRemaining'],
          message: 'Quantity remaining cannot exceed quantity received',
        }),
      ])
    );
  });
});
