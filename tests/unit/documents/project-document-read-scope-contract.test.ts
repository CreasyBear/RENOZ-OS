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

describe('project document read scope contract', () => {
  it('requires active tenant-owned projects before generating project documents', () => {
    const source = compact(
      read('src/server/functions/documents/generate-project-documents-sync.tsx')
    );

    expect(source).toContain(
      '.where(and(eq(projects.id,projectId),eq(projects.organizationId,organizationId),isNull(projects.deletedAt)))'
    );
    expect(source).not.toContain(
      '.where(and(eq(projects.id,projectId),eq(projects.organizationId,organizationId)))'
    );
  });

  it('scopes project work-order materials by project, tenant, product tenant, and active product state', () => {
    const source = compact(
      read('src/server/functions/documents/generate-project-documents-sync.tsx')
    );

    expect(source).toContain(
      'asyncfunctionfetchProjectMaterials(projectId:string,organizationId:string)'
    );
    expect(source).toContain(
      '.where(and(eq(jobMaterials.projectId,projectId),eq(jobMaterials.organizationId,organizationId),eq(products.organizationId,organizationId),isNull(products.deletedAt)))'
    );
    expect(source).toContain('constmaterials=awaitfetchProjectMaterials(projectId,ctx.organizationId);');
    expect(source).not.toContain('.where(eq(jobMaterials.projectId,projectId));');
  });
});
