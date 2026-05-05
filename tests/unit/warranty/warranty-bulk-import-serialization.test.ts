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

describe('warranty bulk import serialization requirements', () => {
  it('keeps serial-backed import rows from treating lineage as best effort', () => {
    const source = compact(read('src/server/functions/warranty/bulk-import/warranty-bulk-import.ts'));

    expect(source).toContain('allowAutoUpsert:false');
    expect(source).toContain('thrownewValidationError(\'Serializeditemrecordnotfound\'');
    expect(source).toContain('eventType:\'warranty_registered\'');
    expect(source).toContain('createdWarranties.push(created)');
    expect(source).not.toContain('findSerializedItemBySerial(db,ctx.organizationId');
    expect(source).not.toContain('fire-and-forget');
    expect(source).not.toContain('lineageisbest-effort');
    expect(source).not.toContain('if(serializedItem){awaitaddSerializedItemEvent');
  });
});
