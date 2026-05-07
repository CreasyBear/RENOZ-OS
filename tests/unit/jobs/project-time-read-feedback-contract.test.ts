import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PROJECT_TIME_TRACKING_READ_FALLBACK_MESSAGE,
  getProjectTimeTrackingReadErrorMessage,
} from '@/components/domain/jobs/projects/project-read-error-messages';
import { normalizeReadQueryError } from '@/lib/read-path-policy';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project time tracking read feedback contract', () => {
  it('formats project time read failures without leaking unsafe internals', () => {
    const normalized = normalizeReadQueryError(
      {
        statusCode: 503,
        code: 'INTERNAL_ERROR',
        message: 'select from job_time_entries violates row level security policy',
      },
      {
        contractType: 'detail-not-found',
        fallbackMessage: PROJECT_TIME_TRACKING_READ_FALLBACK_MESSAGE,
        notFoundMessage: 'The requested time tracking scope could not be found.',
      }
    );

    expect(getProjectTimeTrackingReadErrorMessage(normalized)).toBe(
      PROJECT_TIME_TRACKING_READ_FALLBACK_MESSAGE
    );
    expect(
      getProjectTimeTrackingReadErrorMessage(
        new Error('duplicate key violates job_time_entries_org_idx postgres stack')
      )
    ).toBe(PROJECT_TIME_TRACKING_READ_FALLBACK_MESSAGE);
  });

  it('keeps the project time card warning behind the read helper', () => {
    const timeCard = read('src/components/domain/jobs/projects/sidebar/time-card.tsx');
    const hooks = read('src/hooks/jobs/use-job-resources.ts');

    expect(hooks).toContain(
      "'Time tracking is temporarily unavailable. Please refresh and try again.'"
    );
    expect(timeCard).toContain(
      "import { getProjectTimeTrackingReadErrorMessage } from '../project-read-error-messages';"
    );
    expect(timeCard).toContain('{getProjectTimeTrackingReadErrorMessage(error)}');
    expect(timeCard).not.toContain('error instanceof Error');
    expect(timeCard).not.toContain('error.message');
  });
});
