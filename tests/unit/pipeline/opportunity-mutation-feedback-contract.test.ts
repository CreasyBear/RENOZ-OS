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

    expect(index).toContain('formatPipelineOpportunityMutationError');
    expect(formatter).toContain('PIPELINE_OPPORTUNITY_CODE_MESSAGES');
    expect(opportunityDetail).toContain("formatPipelineOpportunityMutationError(error, 'stage')");
    expect(opportunityDetail).not.toContain("toastError('Failed to update stage')");
  });
});
