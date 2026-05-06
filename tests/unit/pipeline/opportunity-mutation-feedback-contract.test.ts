import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatPipelineOpportunityMutationError } from '@/hooks/pipeline/_mutation-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('pipeline opportunity mutation feedback contract', () => {
  it('suppresses unsafe stage failures with action-specific fallback copy', () => {
    expect(
      formatPipelineOpportunityMutationError(
        new Error('duplicate key value violates unique constraint opportunities_pkey'),
        'stage'
      )
    ).toBe('Unable to update opportunity stage. Refresh and try again.');

    expect(
      formatPipelineOpportunityMutationError(
        {
          statusCode: 400,
          message: 'TypeError: Cannot read properties of undefined (reading version)',
        },
        'stage'
      )
    ).toBe('Unable to update opportunity stage. Refresh and try again.');

    expect(
      formatPipelineOpportunityMutationError(
        new Error('SQL insert failed at convert opportunity stack frame'),
        'convertToOrder'
      )
    ).toBe('Unable to convert opportunity to an order. Refresh and try again.');

    expect(
      formatPipelineOpportunityMutationError(
        new Error('duplicate key value violates unique constraint opportunities_title_unique'),
        'create'
      )
    ).toBe('Unable to create opportunity. Refresh and try again.');

    expect(
      formatPipelineOpportunityMutationError(
        new Error('TypeError: Cannot read properties of undefined (reading opportunityIds)'),
        'bulkStage'
      )
    ).toBe('Unable to update selected opportunity stages. Refresh and try again.');
  });

  it('keeps safe validation and known opportunity codes useful for operators', () => {
    expect(
      formatPipelineOpportunityMutationError(
        { statusCode: 409, code: 'VERSION_CONFLICT' },
        'stage'
      )
    ).toBe('Opportunity changed since this page loaded. Refresh and review before trying again.');

    expect(
      formatPipelineOpportunityMutationError(
        { statusCode: 400, errors: { stage: ['Opportunity is already closed.'] } },
        'stage'
      )
    ).toBe('Opportunity is already closed.');
  });

  it('keeps opportunity detail stage actions on the pipeline formatter contract', () => {
    const index = read('src/hooks/pipeline/index.ts');
    const formatter = read('src/hooks/pipeline/_mutation-errors.ts');
    const opportunityDetail = read('src/hooks/pipeline/use-opportunity-detail.ts');
    const quickDialog = read(
      'src/components/domain/pipeline/opportunities/opportunity-quick-dialog.tsx'
    );
    const kanban = read('src/components/domain/pipeline/pipeline-kanban-container.tsx');
    const board = read('src/components/domain/pipeline/pipeline-board.tsx');
    const list = read(
      'src/components/domain/pipeline/opportunities/opportunities-list-container.tsx'
    );
    const newOpportunityPage = read('src/routes/_authenticated/pipeline/new-opportunity-page.tsx');
    const bulkDialog = read(
      'src/components/domain/pipeline/opportunities/opportunity-bulk-operations-dialog.tsx'
    );

    expect(index).toContain('formatPipelineOpportunityMutationError');
    expect(formatter).toContain('PIPELINE_OPPORTUNITY_CODE_MESSAGES');
    expect(opportunityDetail).toContain("formatPipelineOpportunityMutationError(error, 'stage')");
    expect(opportunityDetail).toContain(
      "formatPipelineOpportunityMutationError(MISSING_OPPORTUNITY_VERSION_ERROR, 'stage')"
    );
    expect(opportunityDetail).toContain("formatPipelineOpportunityMutationError(error, 'delete')");
    expect(opportunityDetail).toContain("formatPipelineOpportunityMutationError(error, 'update')");
    expect(opportunityDetail).toContain(
      "formatPipelineOpportunityMutationError(error, 'convertToOrder')"
    );
    expect(opportunityDetail).not.toContain("toastError('Failed to delete opportunity')");
    expect(opportunityDetail).not.toContain("toastError('Failed to update stage')");
    expect(opportunityDetail).not.toContain(
      "toastError('Unable to update stage. Please refresh and try again.')"
    );
    expect(opportunityDetail).not.toContain("throw new Error('Delete failed')");
    expect(opportunityDetail).not.toContain("toastError('Failed to update opportunity')");
    expect(opportunityDetail).not.toContain("toastError('Failed to convert to order')");
    expect(quickDialog).toContain('formatPipelineOpportunityMutationError(error, "create")');
    expect(quickDialog).toContain('formatPipelineOpportunityMutationError(error, "update")');
    expect(quickDialog).not.toContain(
      'error instanceof Error ? error.message : "Failed to create opportunity."'
    );
    expect(quickDialog).not.toContain(
      'error instanceof Error ? error.message : "Failed to update opportunity."'
    );
    expect(kanban).toContain('formatPipelineOpportunityMutationError(error, "stage")');
    expect(kanban).toContain('formatPipelineOpportunityMutationError(error, "delete")');
    expect(kanban).not.toContain(
      'toastError("Failed to update opportunity stage. Please try again.")'
    );
    expect(kanban).not.toContain('throw new Error("Stage change failed")');
    expect(kanban).toContain('return false;');
    expect(kanban).not.toContain(
      'error instanceof Error ? error.message : "Failed to delete opportunity."'
    );
    expect(board).toContain('return result !== false;');
    expect(board).toContain('if (result === false)');
    expect(board).toContain('setPendingTransition(null);');
    expect(list).toContain('formatPipelineOpportunityMutationError(error, "delete")');
    expect(list).toContain('formatPipelineOpportunityMutationError(error, "bulkDelete")');
    expect(list).toContain('formatPipelineOpportunityMutationError(error, "bulkStage")');
    expect(list).not.toContain('toastError("Failed to delete opportunity")');
    expect(list).not.toContain('toastError("Failed to delete some opportunities")');
    expect(list).not.toContain(
      'error instanceof Error ? error.message : "Failed to update opportunity stages"'
    );
    expect(list).not.toContain('throw new Error("Bulk stage change failed")');
    expect(newOpportunityPage).toContain(
      "formatPipelineOpportunityMutationError(error, 'create')"
    );
    expect(newOpportunityPage).not.toContain(
      "toastError('Failed to create opportunity. Please try again.')"
    );
    expect(bulkDialog).not.toContain('toastError');
    expect(bulkDialog).not.toContain(
      "error instanceof Error ? error.message : 'Failed to complete bulk operation'"
    );
    expect(bulkDialog).toContain('Parent owns user-facing mutation feedback');
    expect(bulkDialog).toContain('const result = await onConfirm(selectedStage)');
    expect(bulkDialog).toContain('if (result === false)');
  });
});
