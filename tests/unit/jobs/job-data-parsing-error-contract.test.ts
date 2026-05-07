import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  JOB_IMPORT_ERROR_MESSAGES,
  formatBulkJobRowParseError,
  formatJobFieldParseError,
  formatJobImportRowError,
} from '@/lib/jobs/job-import-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('job data parsing error contract', () => {
  it('formats import parsing failures without leaking runtime internals', () => {
    expect(formatJobFieldParseError('date')).toBe(JOB_IMPORT_ERROR_MESSAGES.date);
    expect(formatJobFieldParseError('time')).toBe(JOB_IMPORT_ERROR_MESSAGES.time);
    expect(formatJobFieldParseError('amount')).toBe(JOB_IMPORT_ERROR_MESSAGES.amount);
    expect(formatJobFieldParseError('jobNumber')).toBe(JOB_IMPORT_ERROR_MESSAGES.jobNumber);
    expect(formatBulkJobRowParseError()).toBe(JOB_IMPORT_ERROR_MESSAGES.rowParse);

    expect(
      formatJobImportRowError(
        new Error('duplicate key violates job_assignments_job_number_idx postgres stack')
      )
    ).toBe(JOB_IMPORT_ERROR_MESSAGES.rowImport);

    expect(
      formatJobImportRowError({
        name: 'ValidationError',
        code: 'VALIDATION_ERROR',
        message: 'Select a customer and installer before importing this row.',
      })
    ).toBe(JOB_IMPORT_ERROR_MESSAGES.missingRelations);
  });

  it('keeps job import server results operator-safe and disambiguation-owned', () => {
    const server = read('src/server/functions/jobs/job-data-parsing.ts');

    expect(server).toContain('formatJobFieldParseError');
    expect(server).toContain('formatBulkJobRowParseError');
    expect(server).toContain('formatJobImportRowError(error)');
    expect(server).toContain('lookupCustomerAndInstallerCandidates');
    expect(server).toContain('this mutation never');
    expect(server).toContain('auto-selects ambiguous customer or installer matches');

    expect(server).not.toContain("error instanceof Error ? error.message : 'Date parsing error'");
    expect(server).not.toContain("error instanceof Error ? error.message : 'Time parsing error'");
    expect(server).not.toContain("error instanceof Error ? error.message : 'Amount parsing error'");
    expect(server).not.toContain(
      "error instanceof Error ? error.message : 'Job number parsing error'"
    );
    expect(server).not.toContain("errors.push(error instanceof Error ? error.message");
    expect(server).not.toContain('const errorMessage = error instanceof Error ? error.message');
    expect(server).not.toContain('String(error)');
    expect(server).not.toContain('TODO(PHASE12-008)');
    expect(server).not.toContain('customerId and installerId must be provided');
  });
});
