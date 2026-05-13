import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project BOM bulk status dialog boundary contract', () => {
  it('keeps bulk status mutation UI behind a dialog presenter with shared status config', () => {
    const tab = read('src/components/domain/jobs/projects/project-bom-tab.tsx');
    const dialog = read('src/components/domain/jobs/projects/project-bom-bulk-status-dialog.tsx');

    expect(tab).toContain("import { ProjectBomBulkStatusDialog } from './project-bom-bulk-status-dialog';");
    expect(tab).toContain('<ProjectBomBulkStatusDialog');
    expect(tab).not.toContain('function BulkStatusDialog');
    expect(tab).not.toContain('Update Status</DialogTitle>');
    expect(tab).not.toContain("formatProjectBomMutationError(error, 'updateStatus')");
    expect(tab).not.toContain('Loader2');

    expect(dialog).toContain('export interface ProjectBomBulkStatusMutation');
    expect(dialog).toContain('export interface ProjectBomBulkStatusDialogProps');
    expect(dialog).toContain("import { PROJECT_BOM_ITEM_STATUS_CONFIG } from './project-bom-status-config';");
    expect(dialog).toContain('bomItemStatusSchema.safeParse(value)');
    expect(dialog).toContain("formatProjectBomMutationError(error, 'updateStatus')");
    expect(dialog).toContain('createPendingDialogOpenChangeHandler(onUpdateStatus.isPending, onOpenChange)');
    expect(dialog).toContain('itemIds: items.map((item) => item.id)');
  });
});
