import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import {
  CREDIT_NOTE_DETAIL_READ_FALLBACK_MESSAGE,
  CREDIT_NOTE_LIST_READ_FALLBACK_MESSAGE,
  getCreditNoteDetailReadErrorMessage,
  getCreditNoteListReadErrorMessage,
} from '@/components/domain/financial/credit-note-read-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('credit note read feedback contract', () => {
  it('preserves normalized credit-note list and detail read messages', () => {
    const listError = normalizeReadQueryError(
      { message: 'database timeout', statusCode: 503, code: 'INTERNAL_ERROR' },
      {
        contractType: 'always-shaped',
        fallbackMessage: CREDIT_NOTE_LIST_READ_FALLBACK_MESSAGE,
      }
    );
    const detailError = normalizeReadQueryError(
      { message: 'Credit note not found', statusCode: 404, code: 'NOT_FOUND' },
      {
        contractType: 'detail-not-found',
        fallbackMessage: CREDIT_NOTE_DETAIL_READ_FALLBACK_MESSAGE,
        notFoundMessage: 'The requested credit note could not be found.',
      }
    );

    expect(getCreditNoteListReadErrorMessage(listError)).toBe(
      CREDIT_NOTE_LIST_READ_FALLBACK_MESSAGE
    );
    expect(getCreditNoteDetailReadErrorMessage(detailError)).toBe(
      'The requested credit note could not be found.'
    );
  });

  it('falls back for raw technical failures before rendering finance UI', () => {
    expect(
      getCreditNoteListReadErrorMessage(
        new Error('postgres select failed for tenant credit_notes table')
      )
    ).toBe(CREDIT_NOTE_LIST_READ_FALLBACK_MESSAGE);
    expect(
      getCreditNoteDetailReadErrorMessage({
        message: 'duplicate key stack trace',
        statusCode: 500,
      })
    ).toBe(CREDIT_NOTE_DETAIL_READ_FALLBACK_MESSAGE);
  });

  it('keeps credit-note read UI behind finance-owned formatter copy', () => {
    const formatter = read('src/components/domain/financial/credit-note-read-error-messages.ts');
    const listContainer = read('src/components/domain/financial/credit-notes-list-container.tsx');
    const listPresenter = read('src/components/domain/financial/credit-notes-list-presenter.tsx');
    const detailContainer = read('src/components/domain/financial/credit-note-detail-container.tsx');

    expect(formatter).toContain('getCreditNoteListReadErrorMessage');
    expect(formatter).toContain('getCreditNoteDetailReadErrorMessage');
    expect(listContainer).toContain('getCreditNoteListReadErrorMessage(error)');
    expect(listContainer).toContain('readErrorMessage={');
    expect(listContainer).not.toContain("new Error('Unknown error')");
    expect(listPresenter).toContain('readErrorMessage: string | null');
    expect(listPresenter).not.toContain('description={error.message}');
    expect(detailContainer).toContain('getCreditNoteDetailReadErrorMessage(error)');
    expect(detailContainer).not.toContain("message={error.message}");
  });
});
