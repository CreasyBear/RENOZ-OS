import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project BOM add item dialog boundary contract', () => {
  it('keeps add-item product search and mutation UI behind the canonical BOM dialog', () => {
    const tab = read('src/components/domain/jobs/projects/project-bom-tab.tsx');
    const dialog = read('src/components/domain/jobs/projects/bom-dialogs.tsx');

    expect(tab).toContain("import { BomAddItemDialog } from './bom-dialogs';");
    expect(tab).toContain('<BomAddItemDialog');
    expect(tab).not.toContain('function AddBomItemDialog');
    expect(tab).not.toContain('useAddBomItem');
    expect(tab).not.toContain("formatProjectBomMutationError(error, 'addItem')");
    expect(tab).not.toContain('useProductSearch');
    expect(tab).not.toContain('useDebounce(searchQuery');

    expect(dialog).toContain('export interface BomAddItemDialogProps');
    expect(dialog).toContain('export function BomAddItemDialog');
    expect(dialog).toContain('useAddBomItem(projectId)');
    expect(dialog).toContain('useProductSearch(');
    expect(dialog).toContain("formatProjectBomMutationError(error, 'addItem')");
    expect(dialog).toContain('submitError={submitError}');
    expect(dialog).toContain('resetOnClose={false}');
    expect(dialog).toContain("import { toast } from '@/lib/toast';");
    expect(dialog).toContain('formatCurrency(value, { cents: false, showCents: true })');
  });
});
