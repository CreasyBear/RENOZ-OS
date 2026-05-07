import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  SCHEDULE_DATA_READ_FALLBACK_MESSAGE,
  getScheduleDataReadErrorMessage,
} from '@/components/domain/jobs/schedule/schedule-read-error-messages';
import { normalizeReadQueryError } from '@/lib/read-path-policy';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('schedule read feedback contract', () => {
  it('formats schedule read failures without leaking unsafe internals', () => {
    const normalized = normalizeReadQueryError(
      {
        statusCode: 503,
        code: 'INTERNAL_ERROR',
        message: 'select from site_visits violates row level security policy',
      },
      {
        contractType: 'always-shaped',
        fallbackMessage: SCHEDULE_DATA_READ_FALLBACK_MESSAGE,
      }
    );

    expect(getScheduleDataReadErrorMessage(normalized)).toBe(
      SCHEDULE_DATA_READ_FALLBACK_MESSAGE
    );
    expect(
      getScheduleDataReadErrorMessage(
        new Error('duplicate key violates site_visits_schedule_idx postgres stack')
      )
    ).toBe(SCHEDULE_DATA_READ_FALLBACK_MESSAGE);
  });

  it('keeps the schedule calendar warning behind the read helper', () => {
    const calendar = read('src/components/domain/jobs/schedule/schedule-calendar-container.tsx');
    const hooks = read('src/hooks/jobs/use-site-visits.ts');

    expect(hooks).toContain(
      "fallbackMessage: 'Schedule data is temporarily unavailable. Please refresh and try again.'"
    );
    expect(calendar).toContain(
      "import { getScheduleDataReadErrorMessage } from './schedule-read-error-messages';"
    );
    expect(calendar).toContain('{getScheduleDataReadErrorMessage(error)}');
    expect(calendar).not.toContain(
      "error.message || 'Schedule data is temporarily unavailable"
    );
  });
});
