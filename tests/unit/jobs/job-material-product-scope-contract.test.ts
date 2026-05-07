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

function sliceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);

  return source.slice(startIndex, endIndex);
}

function sliceFrom(source: string, start: string): string {
  const startIndex = source.indexOf(start);

  expect(startIndex).toBeGreaterThanOrEqual(0);

  return source.slice(startIndex);
}

describe('job material product scope contract', () => {
  it('keeps material product joins tenant-aware and active-product only', () => {
    const server = read('src/server/functions/jobs/job-materials.ts');
    const compactServer = compact(server);
    const listBlock = compact(
      sliceBetween(server, 'export const listJobMaterials =', '// ADD JOB MATERIAL')
    );
    const getBlock = compact(
      sliceBetween(server, 'export const getJobMaterial =', '// RECORD MATERIAL INSTALLATION')
    );

    expect(server).toContain('isNull');
    expect(server).toContain('function jobMaterialProductJoinCondition');
    expect(compactServer).toContain(
      'eq(products.organizationId,jobMaterials.organizationId),isNull(products.deletedAt)'
    );
    expect(listBlock).toContain('.leftJoin(products,jobMaterialProductJoinCondition())');
    expect(getBlock).toContain('.leftJoin(products,jobMaterialProductJoinCondition())');
    expect(compactServer).not.toContain('.leftJoin(products,eq(jobMaterials.productId,products.id))');
  });

  it('keeps get material and logging product lookups scoped to the authenticated organization', () => {
    const server = read('src/server/functions/jobs/job-materials.ts');
    const compactServer = compact(server);
    const updateBlock = compact(
      sliceBetween(server, 'export const updateJobMaterial =', '// REMOVE JOB MATERIAL')
    );
    const removeBlock = compact(
      sliceBetween(server, 'export const removeJobMaterial =', '// RESERVE JOB STOCK')
    );
    const getBlock = compact(
      sliceBetween(server, 'export const getJobMaterial =', '// RECORD MATERIAL INSTALLATION')
    );
    const installBlock = compact(sliceFrom(server, 'export const recordMaterialInstallation ='));

    expect(getBlock).toContain(
      'where(and(eq(jobMaterials.id,data.materialId),eq(jobMaterials.organizationId,ctx.organizationId)))'
    );
    expect(getBlock).toContain("if(!material){thrownewNotFoundError('Materialnotfound');}");
    expect(compactServer).not.toContain('.where(eq(jobMaterials.id,data.materialId))');

    expect(updateBlock).toContain(
      'eq(products.id,material.productId),eq(products.organizationId,ctx.organizationId),isNull(products.deletedAt)'
    );
    expect(removeBlock).toContain(
      'eq(products.id,existingMaterial.productId),eq(products.organizationId,ctx.organizationId),isNull(products.deletedAt)'
    );
    expect(installBlock).toContain(
      'eq(products.id,existingMaterial.productId),eq(products.organizationId,ctx.organizationId),isNull(products.deletedAt)'
    );
  });
});
