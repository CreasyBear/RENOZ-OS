import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project BOM header boundary contract', () => {
  it('keeps BOM import and add-material controls behind a narrow header presenter', () => {
    const tab = read('src/components/domain/jobs/projects/project-bom-tab.tsx');
    const header = read('src/components/domain/jobs/projects/project-bom-header-actions.tsx');

    expect(tab).toContain("import { ProjectBomHeaderActions } from './project-bom-header-actions';");
    expect(tab).toContain('<ProjectBomHeaderActions');
    expect(tab).toContain('bomNumber={bom.bomNumber}');
    expect(tab).toContain('itemCount={items.length}');
    expect(tab).not.toContain('csvInputRef');
    expect(tab).not.toContain('type="file"');
    expect(tab).not.toContain('TooltipProvider');
    expect(tab).not.toContain('ShoppingCart');

    expect(header).toContain('export interface ProjectBomHeaderActionsProps');
    expect(header).toContain('const csvInputRef = useRef<HTMLInputElement>(null);');
    expect(header).toContain("accept=\".csv\"");
    expect(header).toContain("isImportingCsv ? 'Importing...' : 'Import CSV'");
    expect(header).toContain("isImportingFromOrder ? 'Importing...' : 'Import from Order'");
    expect(header).toContain('Link an order to this project first');
    expect(header).toContain('onAddMaterial');
  });
});
