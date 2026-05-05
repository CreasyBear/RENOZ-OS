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

describe('warranty claim serialization requirements', () => {
  it('keeps warranty claim submission from treating serialized lineage as best effort', () => {
    const source = compact(read('src/server/functions/warranty/claims/warranty-claims.ts'));

    expect(source).toContain('allowAutoUpsert:false');
    expect(source).toContain('thrownewValidationError(\'Serializeditemrecordnotfound\'');
    expect(source).toContain('eventType:\'warranty_claimed\'');
    expect(source).not.toContain('findSerializedItemBySerial(db,ctx.organizationId');
    expect(source).not.toContain('if(serializedItem){awaitaddSerializedItemEvent');
  });
});
