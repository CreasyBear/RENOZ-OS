import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('shipment status serialization requirements', () => {
  it('keeps returned shipments from skipping unresolved serialized item records', () => {
    const source = compact(read('src/server/functions/orders/order-shipments-status.ts'));

    expect(source).toContain('thrownewValidationError(\'Serializeditemrecordnotfound\'');
    expect(source).toContain('allowAutoUpsert:false,source:\'order_shipment_returned\'');
    expect(source).not.toContain('if(!serializedItem)continue;');
  });
});
