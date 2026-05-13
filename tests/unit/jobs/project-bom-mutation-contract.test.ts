import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatProjectBomMutationError } from '@/hooks/jobs/_mutation-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('project BOM mutation contract', () => {
  it('formats project BOM mutation failures without leaking unsafe internals', () => {
    expect(
      formatProjectBomMutationError(
        new Error('duplicate key violates project_bom_items_project_idx postgres stack'),
        'addItem'
      )
    ).toBe('Project BOM item creation is temporarily unavailable. Please refresh and try again.');

    expect(
      formatProjectBomMutationError(
        { statusCode: 403, code: 'PERMISSION_DENIED', message: 'raw auth detail' },
        'removeItem'
      )
    ).toBe('You do not have permission to manage project materials.');

    expect(
      formatProjectBomMutationError(
        {
          statusCode: 400,
          errors: {
            quantity: ['Quantity must be greater than zero'],
          },
        },
        'updateItem'
      )
    ).toBe('Quantity must be greater than zero');
  });

  it('keeps project BOM item mutations project-scoped, cache-safe, and operator-safe', () => {
    const tab = read('src/components/domain/jobs/projects/project-bom-tab.tsx');
    const bulkStatusDialog = read(
      'src/components/domain/jobs/projects/project-bom-bulk-status-dialog.tsx'
    );
    const editItemDialog = read('src/components/domain/jobs/projects/project-bom-edit-item-dialog.tsx');
    const dialog = read('src/components/domain/jobs/projects/bom-dialogs.tsx');
    const hooks = read('src/hooks/jobs/use-project-bom.ts');
    const jobsIndex = read('src/hooks/jobs/index.ts');
    const server = read('src/server/functions/project-bom.ts');
    const compactTab = compact(tab);
    const compactDialog = compact(dialog);
    const compactHooks = compact(hooks);
    const compactServer = compact(server);

    expect(tab).toContain("formatProjectBomMutationError(error, 'create')");
    expect(editItemDialog).toContain("formatProjectBomMutationError(error, 'updateItem')");
    expect(tab).toContain("formatProjectBomMutationError(error, 'removeItem')");
    expect(tab).toContain("formatProjectBomMutationError(error, 'removeItems')");
    expect(bulkStatusDialog).toContain("formatProjectBomMutationError(error, 'updateStatus')");
    expect(tab).toContain("formatProjectBomMutationError(error, 'importCsv')");
    expect(tab).toContain("formatProjectBomMutationError(error, 'importOrder')");
    expect(compactTab).not.toContain("toast.error('Failedtoadditem')");
    expect(compactTab).not.toContain("toast.error('Failedtoupdateitem')");
    expect(compactTab).not.toContain("toast.error('Failedtoremoveitem')");
    expect(compactTab).not.toContain("toast.error('Failedtoupdatestatus')");

    expect(dialog).toContain("formatProjectBomMutationError(error, 'addItem')");
    expect(compactDialog).not.toContain("toast.error('Failedtoadditem')");
    expect(dialog).not.toContain("err instanceof Error ? err.message : 'Failed to add item'");

    expect(jobsIndex).toContain('formatProjectBomMutationError');
    expect(compactHooks).toContain('addFn({data:{...params.data,projectId}})');
    expect(compactHooks).toContain('updateFn({data:{...params.data,projectId}})');
    expect(compactHooks).toContain('removeFn({data:{...params.data,projectId}})');
    expect(hooks).toContain('queryKeys.projects.bom(projectId)');
    expect(hooks).toContain('queryKeys.projects.alerts(projectId)');

    expect(server).toContain('ConflictError');
    expect(server).toContain("throw new NotFoundError('Project BOM item not found', 'projectBomItem')");
    expect(compactServer).toContain(
      'leftJoin(products,and(eq(projectBomItems.productId,products.id),eq(products.organizationId,ctx.organizationId)))'
    );
    expect(compactServer).toContain(
      'where(and(eq(projectBomItems.bomId,bom.id),eq(projectBomItems.projectId,data.projectId),eq(projectBomItems.organizationId,ctx.organizationId)))'
    );
    expect(compactServer).toContain(
      'where(and(eq(projectBom.id,data.bomId),eq(projectBom.projectId,data.projectId),eq(projectBom.organizationId,ctx.organizationId)))'
    );
    expect(compactServer).toContain(
      'where(and(eq(products.id,data.productId),eq(products.organizationId,ctx.organizationId)))'
    );
    expect(compactServer).toContain(
      'where(and(eq(projectBomItems.id,data.itemId),eq(projectBomItems.projectId,data.projectId),eq(projectBomItems.organizationId,ctx.organizationId)))'
    );
    expect(compactServer).toContain(
      'inArray(projectBomItems.id,data.itemIds),eq(projectBomItems.projectId,data.projectId),eq(projectBomItems.organizationId,ctx.organizationId)'
    );
    expect(compactServer).toContain('.returning({id:projectBomItems.id})');
    expect(compactServer).toContain('deleted.length!==data.itemIds.length');
    expect(compactServer).toContain('updated.length!==data.itemIds.length');
    expect(compactServer).not.toContain('.where(eq(projectBomItems.id,data.itemId))');
  });
});
