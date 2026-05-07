import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PROJECT_FILES_READ_FALLBACK_MESSAGE,
  getProjectFilesReadErrorMessage,
} from '@/components/domain/jobs/projects/project-read-error-messages';
import { normalizeReadQueryError } from '@/lib/read-path-policy';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project files read feedback contract', () => {
  it('formats project files read failures without leaking unsafe internals', () => {
    const normalized = normalizeReadQueryError(
      {
        statusCode: 503,
        code: 'INTERNAL_ERROR',
        message: 'select from project_files violates row level security policy',
      },
      {
        contractType: 'always-shaped',
        fallbackMessage: PROJECT_FILES_READ_FALLBACK_MESSAGE,
      }
    );

    expect(getProjectFilesReadErrorMessage(normalized)).toBe(
      PROJECT_FILES_READ_FALLBACK_MESSAGE
    );
    expect(
      getProjectFilesReadErrorMessage(
        new Error('duplicate key violates project_files_org_idx postgres stack')
      )
    ).toBe(PROJECT_FILES_READ_FALLBACK_MESSAGE);
  });

  it('keeps the project files warning behind the read helper', () => {
    const filesTab = read('src/components/domain/jobs/projects/project-files-tab.tsx');
    const hooks = read('src/hooks/jobs/use-files.ts');

    expect(hooks).toContain(
      "fallbackMessage: 'Project files are temporarily unavailable. Please refresh and try again.'"
    );
    expect(filesTab).toContain(
      "import { getProjectFilesReadErrorMessage } from './project-read-error-messages';"
    );
    expect(filesTab).toContain('{getProjectFilesReadErrorMessage(error)}');
    expect(filesTab).not.toContain("error.message || 'Project files are temporarily unavailable");
  });
});
