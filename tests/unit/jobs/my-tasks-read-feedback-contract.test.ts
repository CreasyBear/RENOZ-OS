import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MY_TASKS_READ_FALLBACK_MESSAGE,
  getMyTasksReadErrorMessage,
} from '@/components/domain/jobs/my-tasks/my-tasks-read-error-messages';
import { normalizeReadQueryError } from '@/lib/read-path-policy';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('my tasks read feedback contract', () => {
  it('formats my tasks read failures without leaking unsafe internals', () => {
    const normalized = normalizeReadQueryError(
      {
        statusCode: 503,
        code: 'INTERNAL_ERROR',
        message: 'select from job_tasks violates row level security policy',
      },
      {
        contractType: 'always-shaped',
        fallbackMessage: MY_TASKS_READ_FALLBACK_MESSAGE,
      }
    );

    expect(getMyTasksReadErrorMessage(normalized)).toBe(MY_TASKS_READ_FALLBACK_MESSAGE);
    expect(
      getMyTasksReadErrorMessage(
        new Error('duplicate key violates my_tasks_assignee_idx postgres stack')
      )
    ).toBe(MY_TASKS_READ_FALLBACK_MESSAGE);
  });

  it('keeps every my tasks warning behind the read helper', () => {
    const kanban = read('src/components/domain/jobs/my-tasks/my-tasks-kanban.tsx');
    const hooks = read('src/hooks/jobs/use-job-tasks.ts');
    const queryKeys = read('src/lib/query-keys.ts');

    expect(hooks).toContain(
      "fallbackMessage: 'Your tasks are temporarily unavailable. Please refresh and try again.'"
    );
    expect(hooks).toContain('queryKeys.jobTasks.myTasks.list(filters)');
    expect(queryKeys).toContain('myTasks');
    expect(kanban).toContain(
      "import { getMyTasksReadErrorMessage } from './my-tasks-read-error-messages';"
    );
    expect(kanban.match(/\{getMyTasksReadErrorMessage\(error\)\}/g)).toHaveLength(3);
    expect(kanban).not.toContain('<span>{error.message}</span>');
  });
});
