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

describe('job material reservation preview contract', () => {
  it('keeps reservation previews scoped, complete, and explicit until inventory integration exists', () => {
    const server = read('src/server/functions/jobs/job-materials.ts');
    const schema = read('src/lib/schemas/jobs/job-materials.ts');
    const compactServer = compact(server);

    expect(server).toContain('inArray');
    expect(server).toContain('const requestedMaterialIds = [...new Set(data.materialIds ?? [])];');
    expect(compactServer).toContain('inArray(jobMaterials.id,requestedMaterialIds)');
    expect(compactServer).toContain(
      "if(materials.length!==requestedMaterialIds.length){thrownewNotFoundError('Oneormorejobmaterialswerenotfound');}"
    );
    expect(compactServer).toContain('eq(jobMaterials.jobId,data.jobId)');
    expect(compactServer).toContain('eq(jobMaterials.organizationId,ctx.organizationId)');
    expect(server).not.toContain('ANY(${data.materialIds})');
    expect(server).not.toContain('TODO(PHASE12-007): Integrate with inventory domain');

    expect(schema).toContain("status: 'unavailable';");
    expect(schema).toContain('reservationCreated: false;');
    expect(schema).toContain('reservedCount: 0;');
  });
});
