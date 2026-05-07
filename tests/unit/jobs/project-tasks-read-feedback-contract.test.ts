import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PROJECT_TASKS_READ_FALLBACK_MESSAGE,
  getProjectTasksReadErrorMessage,
} from '@/components/domain/jobs/projects/project-read-error-messages';
import { normalizeReadQueryError } from '@/lib/read-path-policy';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project tasks read feedback contract', () => {
  it('formats project task read failures without leaking unsafe internals', () => {
    const normalized = normalizeReadQueryError(
      {
        statusCode: 503,
        code: 'INTERNAL_ERROR',
        message: 'select from job_tasks violates row level security policy',
      },
      {
        contractType: 'always-shaped',
        fallbackMessage: PROJECT_TASKS_READ_FALLBACK_MESSAGE,
      }
    );

    expect(getProjectTasksReadErrorMessage(normalized)).toBe(
      PROJECT_TASKS_READ_FALLBACK_MESSAGE
    );
    expect(
      getProjectTasksReadErrorMessage(
        new Error('duplicate key violates job_tasks_org_idx postgres stack')
      )
    ).toBe(PROJECT_TASKS_READ_FALLBACK_MESSAGE);
  });

  it('keeps every project tasks warning behind the read helper', () => {
    const tasksTab = read('src/components/domain/jobs/projects/project-tasks-tab.tsx');
    const hooks = read('src/hooks/jobs/use-project-tasks.ts');

    expect(hooks).toContain(
      "'Project tasks are temporarily unavailable. Please refresh and try again.'"
    );
    expect(tasksTab).toContain(
      "import { getProjectTasksReadErrorMessage } from './project-read-error-messages';"
    );
    expect(tasksTab.match(/\{getProjectTasksReadErrorMessage\(error\)\}/g)).toHaveLength(3);
    expect(tasksTab).not.toContain('<span>{error.message}</span>');
  });
});
