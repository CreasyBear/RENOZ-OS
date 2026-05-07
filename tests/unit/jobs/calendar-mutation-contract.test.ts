import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatJobCalendarMutationError } from '@/hooks/jobs/_mutation-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('job calendar mutation contract', () => {
  it('formats calendar mutation failures without leaking unsafe internals', () => {
    expect(
      formatJobCalendarMutationError(
        new Error('duplicate key violates job_calendar_events_org_idx postgres stack'),
        'sync'
      )
    ).toBe('Calendar sync is temporarily unavailable. Please refresh and try again.');

    expect(
      formatJobCalendarMutationError(
        { statusCode: 403, code: 'PERMISSION_DENIED', message: 'raw auth detail' },
        'update'
      )
    ).toBe('You do not have permission to manage calendar events.');

    expect(
      formatJobCalendarMutationError(
        { statusCode: 404, code: 'NOT_FOUND', message: 'raw missing provider id' },
        'remove'
      )
    ).toBe('The calendar event could not be found. Refresh and try again.');
  });

  it('keeps calendar sync/update/remove toasts behind the formatter', () => {
    const hook = read('src/hooks/jobs/use-job-scheduling.ts');
    const jobsIndex = read('src/hooks/jobs/index.ts');

    expect(hook).toContain("formatJobCalendarMutationError(error, 'sync')");
    expect(hook).toContain("formatJobCalendarMutationError(error, 'update')");
    expect(hook).toContain("formatJobCalendarMutationError(error, 'remove')");
    expect(hook).not.toContain(
      "description: error instanceof Error ? error.message : 'Unknown error occurred'"
    );
    expect(hook).not.toContain(
      "description: error instanceof Error ? error.message : 'Failed to update calendar event'"
    );
    expect(hook).not.toContain(
      "description: error instanceof Error ? error.message : 'Failed to remove from calendar'"
    );
    expect(jobsIndex).toContain('formatJobCalendarMutationError');
  });
});
