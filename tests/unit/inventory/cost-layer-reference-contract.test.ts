import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createCostLayerSchema } from '@/lib/schemas/inventory';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('inventory cost-layer reference contract', () => {
  it('accepts manual receive as a cost-layer source at the schema boundary', () => {
    expect(
      createCostLayerSchema.parse({
        inventoryId: '00000000-0000-4000-8000-000000000001',
        receivedAt: '2026-01-01T00:00:00.000Z',
        quantityReceived: 1,
        quantityRemaining: 1,
        unitCost: '42.50',
        referenceType: 'manual_receive',
      })
    ).toMatchObject({
      referenceType: 'manual_receive',
      unitCost: 42.5,
    });
  });

  it('keeps manual receive aligned across schema, database enum, migration, and write helper', () => {
    const valuationSchema = read('src/lib/schemas/inventory/valuation.ts');
    const enumSchema = read('drizzle/schema/_shared/enums.ts');
    const migration = read('drizzle/migrations/0039_cost_layer_manual_receive_reference.sql');
    const receivingSource = read('src/server/functions/inventory/receiving.ts');
    const financeHelper = compact(read('src/server/functions/_shared/inventory-finance.ts'));

    expect(valuationSchema).toContain("'manual_receive'");
    expect(enumSchema).toContain('"manual_receive"');
    expect(migration).toContain("ADD VALUE IF NOT EXISTS 'manual_receive'");
    expect(receivingSource).toContain("referenceType: 'manual_receive'");
    expect(financeHelper).toContain("|'manual_receive'|");
    expect(financeHelper).toContain('referenceType:CostLayerReferenceType;');
    expect(financeHelper).not.toContain('referenceType:string;');
  });
});
