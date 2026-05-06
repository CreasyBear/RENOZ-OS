import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatPipelineQuoteMutationError } from '@/hooks/pipeline/_mutation-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('pipeline quote mutation feedback contract', () => {
  it('suppresses unsafe quote action failures with action-specific fallback copy', () => {
    expect(
      formatPipelineQuoteMutationError(
        new Error('duplicate key value violates unique constraint quote_versions_pkey'),
        'generatePdf'
      )
    ).toBe('Unable to generate quote PDF. Refresh and try again.');

    expect(
      formatPipelineQuoteMutationError(
        {
          statusCode: 400,
          message: 'TypeError: Cannot read properties of undefined (reading customerId)',
        },
        'send'
      )
    ).toBe('Unable to send quote. Refresh and try again.');

    expect(
      formatPipelineQuoteMutationError(
        new Error('SQL update failed at quote delete stack frame'),
        'delete'
      )
    ).toBe('Unable to delete quote. Refresh and try again.');
  });

  it('keeps safe validation and known pipeline quote codes useful for operators', () => {
    expect(
      formatPipelineQuoteMutationError(
        { statusCode: 400, errors: { recipientEmail: ['Customer email is required.'] } },
        'send'
      )
    ).toBe('Customer email is required.');

    expect(
      formatPipelineQuoteMutationError({ statusCode: 403, code: 'FORBIDDEN' }, 'delete')
    ).toBe('You do not have permission to manage quotes.');

    expect(
      formatPipelineQuoteMutationError({ statusCode: 409, code: 'CONFLICT' }, 'send')
    ).toBe('Quote state changed. Refresh and review before trying again.');
  });

  it('keeps quote detail actions on the pipeline formatter contract', () => {
    const index = read('src/hooks/pipeline/index.ts');
    const formatter = read('src/hooks/pipeline/_mutation-errors.ts');
    const quoteDetail = read(
      'src/components/domain/pipeline/quotes/containers/quote-detail-container.tsx'
    );
    const opportunityDetail = read('src/hooks/pipeline/use-opportunity-detail.ts');

    expect(index).toContain('formatPipelineQuoteMutationError');
    expect(formatter).toContain('PIPELINE_QUOTE_CODE_MESSAGES');
    expect(quoteDetail).toContain("formatPipelineQuoteMutationError(error, 'generatePdf')");
    expect(quoteDetail).toContain("formatPipelineQuoteMutationError(result.error, 'send')");
    expect(quoteDetail).toContain("formatPipelineQuoteMutationError(error, 'send')");
    expect(quoteDetail).toContain("formatPipelineQuoteMutationError(error, 'delete')");
    expect(opportunityDetail).toContain("formatPipelineQuoteMutationError(result.error, 'send')");
    expect(opportunityDetail).toContain("formatPipelineQuoteMutationError(error, 'send')");

    expect(quoteDetail).not.toContain(
      "error instanceof Error ? error.message : 'Failed to generate PDF'"
    );
    expect(quoteDetail).not.toContain(
      "error instanceof Error ? error.message : 'Failed to send quote'"
    );
    expect(quoteDetail).not.toContain(
      "error instanceof Error ? error.message : 'Failed to delete quote'"
    );
    expect(opportunityDetail).not.toContain("result.error ?? 'Failed to send quote'");
    expect(opportunityDetail).not.toContain(
      "error instanceof Error ? error.message : 'Failed to send quote'"
    );
  });
});
