import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project BOM items table boundary contract', () => {
  it('keeps BOM row rendering behind the items table presenter and shares status config', () => {
    const tab = read('src/components/domain/jobs/projects/project-bom-tab.tsx');
    const table = read('src/components/domain/jobs/projects/project-bom-items-table.tsx');
    const statusConfig = read('src/components/domain/jobs/projects/project-bom-status-config.ts');

    expect(tab).toContain("import { ProjectBomItemsTable } from './project-bom-items-table';");
    expect(tab).toContain('<ProjectBomItemsTable');
    expect(tab).not.toContain('function BomItemsTable');
    expect(tab).not.toContain('DropdownMenu');
    expect(tab).not.toContain('MoreHorizontal');
    expect(tab).not.toContain('CheckboxCell');
    expect(tab).not.toContain('PROJECT_BOM_ITEM_STATUS_CONFIG');

    expect(table).toContain('export interface ProjectBomItemsTableProps');
    expect(table).toContain('export interface ProjectBomItemsTableSelection');
    expect(table).toContain("import { PROJECT_BOM_ITEM_STATUS_CONFIG } from './project-bom-status-config';");
    expect(table).toContain('to="/products/$productId"');
    expect(table).toContain("ariaLabel={`Select ${product?.name || 'item'}`}");
    expect(table).toContain('formatCurrency(value, { cents: false, showCents: true })');

    expect(statusConfig).toContain('export const PROJECT_BOM_ITEM_STATUS_CONFIG');
    expect(statusConfig).toContain("description: 'Reserved for this project'");
    expect(statusConfig).toContain("description: 'Installed on site'");
  });
});
