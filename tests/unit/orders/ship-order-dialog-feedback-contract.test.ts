import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('ship order dialog feedback contract', () => {
  it('routes shipment creation failures through the shipment action formatter', () => {
    const dialog = read('src/components/domain/orders/fulfillment/ship-order-dialog.tsx');

    expect(dialog).toContain('getShipmentActionErrorMessage(error, options?.message ?? SHIPMENT_OPERATION_FALLBACK)');
    expect(dialog).toContain('const SHIPMENT_OPERATION_FALLBACK = "Unable to complete shipment operation."');
    expect(dialog).toContain('if (error instanceof ValidationError && error.errors && options?.setItemErrors)');
    expect(dialog).not.toContain('error instanceof Error ? error.message : "Shipment operation failed"');
    expect(dialog).not.toContain('"Shipment operation failed"');
  });
});
