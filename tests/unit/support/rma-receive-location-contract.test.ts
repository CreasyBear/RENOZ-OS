import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('RMA receive location contract', () => {
  it('keeps receiveRma input location-aware', () => {
    const schema = read('src/lib/schemas/support/rma.ts');

    expect(schema).toContain('export const receiveRmaSchema = z.object({');
    expect(schema).toContain("locationId: z.string().uuid('Receiving location is required').optional()");
  });

  it('blocks detail receives before mutation when location is missing', () => {
    const hook = read('src/hooks/support/use-rma-detail.ts');

    expect(hook).toContain("if (!inspection?.locationId) {");
    expect(hook).toContain("toast.error('Receiving location is required')");
    expect(hook).toContain('locationId: inspection.locationId');
  });

  it('validates selected receiving location and rejects ambiguous fallback locations server-side', () => {
    const execution = read('src/server/functions/orders/_shared/rma-execution.ts');

    expect(execution).toContain('const requestedLocationRows = await tx');
    expect(execution).toContain('eq(warehouseLocations.id, data.locationId)');
    expect(execution).toContain('.limit(data.locationId ? 1 : 2)');
    expect(execution).toContain(
      'Receiving location is required when more than one active warehouse location exists.',
    );
    expect(execution).not.toContain('.limit(1);\n\n      if (!location');
  });

  it('forwards bulk receive location into each internal RMA receive executor', () => {
    const server = read('src/server/functions/orders/rma.ts');

    expect(server).toContain('const result = await executeReceiveRma({');
    expect(server).toContain('ctx,');
    expect(server).toContain('locationId: data.locationId');
    expect(server).not.toContain('const result = await receiveRma({');
  });

  it('returns inventory mutation identity for post-receive cache policy', () => {
    const server = read('src/server/functions/orders/rma.ts');
    const execution = read('src/server/functions/orders/_shared/rma-execution.ts');

    expect(execution).toContain('const affectedInventoryIds = new Set<string>();');
    expect(execution).toContain('const affectedProductIds = new Set<string>();');
    expect(execution).toContain('let touchesSerializedInventory = false;');
    expect(execution).toContain('affectedProductIds.add(productId);');
    expect(execution).toContain('affectedInventoryIds.add(invRow.id);');
    expect(execution).toContain('affectedInventoryIds.add(invId);');
    expect(server).toContain('affectedInventoryIds: result.affectedInventoryIds');
    expect(server).toContain('affectedProductIds: result.affectedProductIds');
    expect(server).toContain('touchesSerializedInventory: result.touchesSerializedInventory');
    expect(server).toContain('(result.affectedInventoryIds ?? []).forEach((inventoryId) => {');
    expect(server).toContain('(result.affectedProductIds ?? []).forEach((productId) => {');
    expect(server).toContain('affectedInventoryIds: Array.from(affectedInventoryIds)');
    expect(server).toContain('affectedProductIds: Array.from(affectedProductIds)');
  });

  it('keeps damaged non-serialized returns out of available aggregate rows', () => {
    const execution = read('src/server/functions/orders/_shared/rma-execution.ts');

    expect(execution).toContain("const targetStatus =");
    expect(execution).toContain("eq(inventory.status, targetStatus)");
    expect(execution).toContain("status: targetStatus");
  });

  it('keeps the RMA receive trace aligned with explicit location selection', () => {
    const trace = read('docs/code-traces/13-rma-receive-inventory.md');

    expect(trace).toContain('selected `locationId`');
    expect(trace).toContain('single-active-location');
    expect(trace).not.toContain('First row in `warehouse_locations`');
    expect(trace).not.toContain('operator cannot pick receiving dock');
  });
});
