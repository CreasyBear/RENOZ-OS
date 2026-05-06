import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatPipelineQuoteMutationError } from '@/hooks/pipeline/_mutation-errors';
import { formatPipelineQuoteSendSuccessMessage } from '@/lib/pipeline/quote-send-feedback';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('pipeline quote mutation feedback contract', () => {
  it('formats quote-send partial success states honestly', () => {
    expect(
      formatPipelineQuoteSendSuccessMessage({
        stages: {
          pdf: { status: 'completed' },
          emailHistory: { status: 'completed' },
          email: { status: 'completed' },
          stageBump: { status: 'completed' },
        },
      })
    ).toBe('Quote sent successfully');

    expect(
      formatPipelineQuoteSendSuccessMessage({
        stages: {
          pdf: { status: 'completed' },
          emailHistory: { status: 'failed' },
          email: { status: 'completed' },
          stageBump: { status: 'completed' },
        },
      })
    ).toBe('Quote sent, but email history needs attention');

    expect(
      formatPipelineQuoteSendSuccessMessage({
        stages: {
          pdf: { status: 'completed' },
          emailHistory: { status: 'failed' },
          email: { status: 'completed' },
          stageBump: { status: 'failed' },
        },
      })
    ).toBe('Quote sent, but email history and follow-up updates need attention');
  });

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

    expect(
      formatPipelineQuoteMutationError(
        new Error('duplicate key value violates unique constraint quote_versions_restore_pkey'),
        'restore'
      )
    ).toBe('Unable to restore quote version. Refresh and try again.');
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

    expect(
      formatPipelineQuoteMutationError({ code: 'PDF_MISSING' }, 'generatePdf')
    ).toBe('Quote PDF is unavailable. Refresh and try again.');
  });

  it('keeps quote detail actions on the pipeline formatter contract', () => {
    const index = read('src/hooks/pipeline/index.ts');
    const formatter = read('src/hooks/pipeline/_mutation-errors.ts');
    const pipelineLibIndex = read('src/lib/pipeline/index.ts');
    const quoteSendFeedback = read('src/lib/pipeline/quote-send-feedback.ts');
    const quoteDetail = read(
      'src/components/domain/pipeline/quotes/containers/quote-detail-container.tsx'
    );
    const opportunityDetail = read('src/hooks/pipeline/use-opportunity-detail.ts');
    const opportunityQuoteTab = read(
      'src/components/domain/pipeline/opportunities/tabs/opportunity-quote-tab.tsx'
    );
    const quoteBuilder = read('src/components/domain/pipeline/quotes/quote-builder.tsx');
    const quoteVersionHistory = read(
      'src/components/domain/pipeline/quotes/quote-version-history.tsx'
    );
    const quotePdfPreview = read('src/components/domain/pipeline/quotes/quote-pdf-preview.tsx');
    const quickQuoteForm = read('src/components/domain/pipeline/quotes/quick-quote-form.tsx');

    expect(index).toContain('formatPipelineQuoteMutationError');
    expect(formatter).toContain('PIPELINE_QUOTE_CODE_MESSAGES');
    expect(pipelineLibIndex).toContain('formatPipelineQuoteSendSuccessMessage');
    expect(quoteSendFeedback).toContain('emailHistoryFailed && followUpFailed');
    expect(quoteDetail).toContain("formatPipelineQuoteMutationError(error, 'generatePdf')");
    expect(quoteDetail).toContain("formatPipelineQuoteMutationError(result.error, 'send')");
    expect(quoteDetail).toContain("formatPipelineQuoteMutationError(error, 'send')");
    expect(quoteDetail).toContain("formatPipelineQuoteMutationError(error, 'delete')");
    expect(quoteDetail).toContain('toastSuccess(formatPipelineQuoteSendSuccessMessage(result))');
    expect(opportunityDetail).toContain("formatPipelineQuoteMutationError(result.error, 'send')");
    expect(opportunityDetail).toContain("formatPipelineQuoteMutationError(error, 'send')");
    expect(opportunityDetail).toContain('toast.success(formatPipelineQuoteSendSuccessMessage(result)');
    expect(opportunityQuoteTab).toContain("formatPipelineQuoteMutationError(error, 'save')");
    expect(opportunityQuoteTab).toContain("formatPipelineQuoteMutationError(error, 'generatePdf')");
    expect(quoteBuilder).toContain('formatPipelineQuoteMutationError(error, "save")');
    expect(quoteVersionHistory).toContain('formatPipelineQuoteMutationError(error, "restore")');
    expect(quotePdfPreview).toContain(
      'formatPipelineQuoteMutationError({ code: "PDF_MISSING" }, "generatePdf")'
    );
    expect(quotePdfPreview).toContain('formatPipelineQuoteMutationError(error, "generatePdf")');
    expect(quickQuoteForm).toContain('formatPipelineQuoteMutationError(error, "save")');

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
    expect(opportunityDetail).not.toContain("result.stages.stageBump.status === 'failed'");
    expect(quoteDetail).not.toContain("result.stages.stageBump.status === 'failed'");
    expect(opportunityQuoteTab).not.toContain(
      "error instanceof Error ? error.message : 'Failed to save quote'"
    );
    expect(opportunityQuoteTab).not.toContain(
      "error instanceof Error ? error.message : 'Failed to generate PDF'"
    );
    expect(quoteBuilder).not.toContain(
      'error instanceof Error ? error.message : "Failed to save quote"'
    );
    expect(quoteVersionHistory).not.toContain('toastError("Failed to restore quote version")');
    expect(quotePdfPreview).not.toContain('toastError("PDF generation failed")');
    expect(quotePdfPreview).not.toContain('toastError("Failed to generate PDF")');
    expect(quickQuoteForm).not.toContain('toastError("Failed to create quote")');
  });
});
