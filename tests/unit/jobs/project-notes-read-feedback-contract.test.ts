import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PROJECT_NOTES_READ_FALLBACK_MESSAGE,
  getProjectNotesReadErrorMessage,
} from '@/components/domain/jobs/projects/project-read-error-messages';
import { normalizeReadQueryError } from '@/lib/read-path-policy';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project notes read feedback contract', () => {
  it('formats project notes read failures without leaking unsafe internals', () => {
    const normalized = normalizeReadQueryError(
      {
        statusCode: 503,
        code: 'INTERNAL_ERROR',
        message: 'select from project_notes violates row level security policy',
      },
      {
        contractType: 'always-shaped',
        fallbackMessage: PROJECT_NOTES_READ_FALLBACK_MESSAGE,
      }
    );

    expect(getProjectNotesReadErrorMessage(normalized)).toBe(
      PROJECT_NOTES_READ_FALLBACK_MESSAGE
    );
    expect(
      getProjectNotesReadErrorMessage(
        new Error('duplicate key violates project_notes_org_idx postgres stack')
      )
    ).toBe(PROJECT_NOTES_READ_FALLBACK_MESSAGE);
  });

  it('keeps the project notes warning behind the read helper', () => {
    const notesTab = read('src/components/domain/jobs/projects/project-notes-tab.tsx');
    const hooks = read('src/hooks/jobs/use-notes.ts');

    expect(hooks).toContain(
      "fallbackMessage: 'Project notes are temporarily unavailable. Please refresh and try again.'"
    );
    expect(notesTab).toContain(
      "import { getProjectNotesReadErrorMessage } from './project-read-error-messages';"
    );
    expect(notesTab).toContain('{getProjectNotesReadErrorMessage(error)}');
    expect(notesTab).not.toContain("error.message || 'Project notes are temporarily unavailable");
  });
});
