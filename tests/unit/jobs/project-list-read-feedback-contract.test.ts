import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PROJECT_LIST_READ_FALLBACK_MESSAGE,
  getProjectListReadErrorMessage,
} from '@/components/domain/jobs/projects/project-read-error-messages';
import { normalizeReadQueryError } from '@/lib/read-path-policy';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project list read feedback contract', () => {
  it('formats project list read failures without leaking unsafe internals', () => {
    const normalized = normalizeReadQueryError(
      {
        statusCode: 503,
        code: 'INTERNAL_ERROR',
        message: 'select from projects violates row level security policy',
      },
      {
        contractType: 'always-shaped',
        fallbackMessage: PROJECT_LIST_READ_FALLBACK_MESSAGE,
      }
    );

    expect(getProjectListReadErrorMessage(normalized)).toBe(
      PROJECT_LIST_READ_FALLBACK_MESSAGE
    );
    expect(
      getProjectListReadErrorMessage(
        new Error('duplicate key violates projects_org_number_idx postgres stack')
      )
    ).toBe(PROJECT_LIST_READ_FALLBACK_MESSAGE);
  });

  it('keeps the project list presenter behind the read helper', () => {
    const presenter = read('src/components/domain/jobs/projects/projects-list-presenter.tsx');
    const hooks = read('src/hooks/jobs/use-projects.ts');

    expect(hooks).toContain("fallbackMessage: 'Projects are temporarily unavailable. Please refresh and try again.'");
    expect(presenter).toContain(
      'import { getProjectListReadErrorMessage } from "./project-read-error-messages";'
    );
    expect(presenter).toContain('description={getProjectListReadErrorMessage(error)}');
    expect(presenter).not.toContain('description={error.message');
    expect(presenter).not.toContain('"An unexpected error occurred"');
  });
});
