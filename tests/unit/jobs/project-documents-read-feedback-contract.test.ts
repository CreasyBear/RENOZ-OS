import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PROJECT_DOCUMENTS_READ_FALLBACK_MESSAGE,
  getProjectDocumentsReadErrorMessage,
} from '@/components/domain/jobs/projects/project-read-error-messages';
import { normalizeReadQueryError } from '@/lib/read-path-policy';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project documents read feedback contract', () => {
  it('formats project document read failures without leaking unsafe internals', () => {
    const normalized = normalizeReadQueryError(
      {
        statusCode: 503,
        code: 'INTERNAL_ERROR',
        message: 'select from generated_documents violates row level security policy',
      },
      {
        contractType: 'always-shaped',
        fallbackMessage: 'Document history is temporarily unavailable. Please refresh and try again.',
      }
    );

    expect(getProjectDocumentsReadErrorMessage(normalized)).toBe(
      'Document history is temporarily unavailable. Please refresh and try again.'
    );
    expect(
      getProjectDocumentsReadErrorMessage(
        new Error('duplicate key violates generated_documents_org_idx postgres stack')
      )
    ).toBe(PROJECT_DOCUMENTS_READ_FALLBACK_MESSAGE);
  });

  it('keeps the project documents cached warning behind the read helper', () => {
    const documentsTab = read('src/components/domain/jobs/projects/tabs/project-documents-tab.tsx');
    const hooks = read('src/hooks/documents/use-document-history.ts');

    expect(hooks).toContain(
      "fallbackMessage: 'Document history is temporarily unavailable. Please refresh and try again.'"
    );
    expect(documentsTab).toContain(
      "import { getProjectDocumentsReadErrorMessage } from '../project-read-error-messages';"
    );
    expect(documentsTab).toContain('{getProjectDocumentsReadErrorMessage(error)}');
    expect(documentsTab).not.toContain(
      "error.message || 'Documents are temporarily unavailable"
    );
  });
});
