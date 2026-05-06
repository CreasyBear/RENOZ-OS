import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('pipeline kanban opportunity type contract', () => {
  it('keeps board and list views on the minimal presenter opportunity item', () => {
    const typeSource = read('src/components/domain/pipeline/pipeline-opportunity-types.ts');
    const container = read('src/components/domain/pipeline/pipeline-kanban-container.tsx');
    const board = read('src/components/domain/pipeline/pipeline-board.tsx');
    const listView = read('src/components/domain/pipeline/pipeline-list-view.tsx');

    expect(typeSource).toContain('export type PipelineOpportunityItem');
    expect(typeSource).toContain('"id"');
    expect(typeSource).toContain('"title"');
    expect(typeSource).toContain('"description"');
    expect(typeSource).toContain('"customerId"');
    expect(typeSource).toContain('"stage"');
    expect(typeSource).toContain('"value"');
    expect(typeSource).toContain('"probability"');
    expect(typeSource).toContain('"daysInStage"');
    expect(typeSource).toContain('expectedCloseDate: Date | string | null');
    expect(typeSource).toContain('quoteExpiresAt: Date | string | null');

    expect(container).toContain(
      'const opportunities: PipelineOpportunityItem[] = opportunitiesData?.items ?? []'
    );
    expect(board).toContain('opportunities: PipelineOpportunityItem[]');
    expect(board).toContain('opportunity: PipelineOpportunityItem');
    expect(listView).toContain('opportunities: PipelineOpportunityItem[]');

    expect(container).not.toContain('as Opportunity[]');
    expect(container).not.toContain('Cast: OpportunityMetadata');
    expect(board).not.toContain('Opportunity[]');
    expect(listView).not.toContain('Opportunity[]');
  });
});
