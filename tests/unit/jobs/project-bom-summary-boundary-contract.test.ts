import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project BOM summary boundary contract', () => {
  it('keeps BOM status, cost, and progress cards behind a narrow presenter', () => {
    const tab = read('src/components/domain/jobs/projects/project-bom-tab.tsx');
    const summary = read('src/components/domain/jobs/projects/project-bom-summary-cards.tsx');

    expect(tab).toContain("import { ProjectBomSummaryCards } from './project-bom-summary-cards';");
    expect(tab).toContain('<ProjectBomSummaryCards items={items} bom={bom} />');
    expect(tab).not.toContain('const BOM_STATUS_CONFIG');
    expect(tab).not.toContain('Estimated Cost');

    expect(summary).toContain('const BOM_STATUS_CONFIG');
    expect(summary).toContain('export interface ProjectBomSummaryCardsProps');
    expect(summary).toContain('items: BomItemWithProduct[];');
    expect(summary).toContain('bom: ProjectBom;');
    expect(summary).toContain('formatCurrency(value, { cents: false, showCents: true })');
    expect(summary).toContain('const installedCount = byStatus');
    expect(summary).toContain('<Progress value={stats.progress}');
  });
});
