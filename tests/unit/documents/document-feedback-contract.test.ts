import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DOCUMENT_HISTORY_CACHED_READ_FALLBACK_MESSAGE,
  DOCUMENT_HISTORY_READ_FALLBACK_MESSAGE,
  formatDocumentGenerationError,
  getDocumentHistoryReadErrorMessage,
} from '@/hooks/documents/document-error-messages';
import { normalizeReadQueryError } from '@/lib/read-path-policy';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('document feedback contract', () => {
  it('formats document history read failures without leaking unsafe internals', () => {
    const normalized = normalizeReadQueryError(
      {
        statusCode: 503,
        code: 'INTERNAL_ERROR',
        message: 'select from generated_documents violates row level security policy',
      },
      {
        contractType: 'always-shaped',
        fallbackMessage: DOCUMENT_HISTORY_READ_FALLBACK_MESSAGE,
      }
    );

    expect(getDocumentHistoryReadErrorMessage(normalized)).toBe(
      DOCUMENT_HISTORY_READ_FALLBACK_MESSAGE
    );
    expect(
      getDocumentHistoryReadErrorMessage(normalized, { hasCachedDocuments: true })
    ).toBe(DOCUMENT_HISTORY_CACHED_READ_FALLBACK_MESSAGE);
    expect(
      getDocumentHistoryReadErrorMessage(
        new Error('duplicate key violates generated_documents_org_idx postgres stack'),
        { hasCachedDocuments: true }
      )
    ).toBe(DOCUMENT_HISTORY_CACHED_READ_FALLBACK_MESSAGE);
  });

  it('formats document generation failures without leaking unsafe internals', () => {
    expect(
      formatDocumentGenerationError(
        new Error('duplicate key violates generated_documents_org_idx postgres stack'),
        'Quote'
      )
    ).toBe('Quote generation is temporarily unavailable. Please refresh and try again.');

    expect(
      formatDocumentGenerationError(
        { statusCode: 403, code: 'PERMISSION_DENIED', message: 'raw storage policy' },
        'Invoice'
      )
    ).toBe('You do not have permission to generate this document.');

    expect(
      formatDocumentGenerationError(
        { statusCode: 404, code: 'NOT_FOUND', message: 'raw missing order id' },
        'Quote'
      )
    ).toBe('The source record for this document could not be found. Refresh and try again.');
  });

  it('keeps document feedback behind domain helpers', () => {
    const historyList = read('src/components/domain/documents/document-history-list.tsx');
    const pdfButton = read('src/components/domain/documents/download-pdf-button.tsx');
    const historyHook = read('src/hooks/documents/use-document-history.ts');

    expect(historyHook).toContain('fallbackMessage: DOCUMENT_HISTORY_READ_FALLBACK_MESSAGE');
    expect(historyList).toContain('getDocumentHistoryReadErrorMessage(error, {');
    expect(historyList).not.toContain("error.message || 'Document history is temporarily");

    expect(pdfButton).toContain(
      'toastError(formatDocumentGenerationError(error, getDocumentLabel(documentType)))'
    );
    expect(pdfButton).not.toContain('error instanceof Error');
    expect(pdfButton).not.toContain('? error.message');
  });
});
