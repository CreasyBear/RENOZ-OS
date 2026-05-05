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

describe('warranty entitlement serialization requirements', () => {
  it('keeps delivery entitlements from storing nullable serialized item ids for captured serials', () => {
    const source = compact(read('src/server/functions/warranty/_shared/entitlement-core.ts'));

    expect(source).toContain('allowAutoUpsert:false');
    expect(source).toContain('thrownewValidationError(\'Serializeditemrecordnotfound\'');
    expect(source).toContain('source:\'warranty_entitlement_delivery\'');
    expect(source).toContain('serializedItemId:serializedItem.id');
    expect(source).not.toContain('serializedItemId:serializedItem?.id??null');
  });
});
