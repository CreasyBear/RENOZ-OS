import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AUTOMATION_JOB_FAILURE_FALLBACK_MESSAGE,
  formatAutomationJobFailureMessage,
} from '@/hooks/automation-jobs/job-progress-feedback';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('automation job progress feedback contract', () => {
  it('keeps safe job metadata failures and suppresses unsafe internals', () => {
    expect(
      formatAutomationJobFailureMessage({
        error: { message: 'Supplier import file is missing the SKU column.' },
      })
    ).toBe('Supplier import file is missing the SKU column.');

    expect(
      formatAutomationJobFailureMessage({
        error: 'Report export was cancelled by the operator.',
      })
    ).toBe('Report export was cancelled by the operator.');

    expect(
      formatAutomationJobFailureMessage({
        error: { message: 'duplicate key violates automation_jobs_pkey postgres stack' },
      })
    ).toBe(AUTOMATION_JOB_FAILURE_FALLBACK_MESSAGE);
    expect(
      formatAutomationJobFailureMessage({
        errorMessage: "TypeError: Cannot read properties of undefined (reading 'run')",
      })
    ).toBe(AUTOMATION_JOB_FAILURE_FALLBACK_MESSAGE);
    expect(formatAutomationJobFailureMessage(null)).toBe(AUTOMATION_JOB_FAILURE_FALLBACK_MESSAGE);
  });

  it('keeps job progress failure feedback behind the helper', () => {
    const hook = read('src/hooks/automation-jobs/use-job-progress.ts');
    const notification = read('src/components/shared/notifications/job-progress-notification.tsx');

    expect(hook).toContain('formatAutomationJobFailureMessage(job.metadata)');
    expect(hook).not.toContain('metadata?.error?.message');
    expect(hook).not.toContain('error?: { message?: string }');

    expect(notification).toContain('formatAutomationJobFailureMessage(metadata)');
    expect(notification).not.toContain('metadata.error?.message');
  });
});
