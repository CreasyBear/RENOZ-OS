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

describe('job material serialization requirements', () => {
  it('keeps material installation from skipping serialized lineage for installed serials', () => {
    const source = compact(read('src/server/functions/jobs/job-materials.ts'));

    expect(source).toContain('allowAutoUpsert:false');
    expect(source).toContain('thrownewValidationError(\'Serializeditemrecordnotfound\'');
    expect(source).toContain('source:\'job_material_installation\'');
    expect(source).toContain('entityType:\'job_material\'');
    expect(source).not.toContain('if(serializedItem){awaitaddSerializedItemEvent');
  });
});
