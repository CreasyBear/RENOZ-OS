import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project BOM edit item dialog boundary contract', () => {
  it('keeps edit-item mutation UI behind a dialog presenter with shared status config', () => {
    const tab = read('src/components/domain/jobs/projects/project-bom-tab.tsx');
    const dialog = read('src/components/domain/jobs/projects/project-bom-edit-item-dialog.tsx');

    expect(tab).toContain("import { ProjectBomEditItemDialog } from './project-bom-edit-item-dialog';");
    expect(tab).toContain('<ProjectBomEditItemDialog');
    expect(tab).not.toContain('function EditBomItemDialog');
    expect(tab).not.toContain("formatProjectBomMutationError(error, 'updateItem')");
    expect(tab).not.toContain('  useUpdateBomItem,');
    expect(tab).not.toContain('bomItemStatusSchema');
    expect(tab).not.toContain('PROJECT_BOM_ITEM_STATUS_CONFIG');

    expect(dialog).toContain('export interface ProjectBomEditItemDialogProps');
    expect(dialog).toContain('useUpdateBomItem(projectId)');
    expect(dialog).toContain('startTransition(() =>');
    expect(dialog).toContain("formatProjectBomMutationError(error, 'updateItem')");
    expect(dialog).toContain("import { PROJECT_BOM_ITEM_STATUS_CONFIG } from './project-bom-status-config';");
    expect(dialog).toContain('bomItemStatusSchema.safeParse(value)');
    expect(dialog).toContain('createPendingDialogOpenChangeHandler(updateItem.isPending, onOpenChange)');
  });
});
