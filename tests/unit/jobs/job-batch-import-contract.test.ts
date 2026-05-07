import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatBulkJobImportRowError } from '@/lib/jobs/job-batch-errors';
import { ConflictError, ValidationError } from '@/lib/server/errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('job batch import contract', () => {
  it('formats bulk job import row failures without leaking internals', () => {
    expect(
      formatBulkJobImportRowError(
        new Error('duplicate key violates job_assignments_job_number_idx postgres stack')
      )
    ).toBe('Job import failed for this row. Please check the row data and try again.');

    expect(formatBulkJobImportRowError(new ConflictError('Job already exists'))).toBe(
      'Job already exists. Enable duplicate skipping or update existing jobs.'
    );

    expect(
      formatBulkJobImportRowError(
        new ValidationError('Customer not found', {
          customerId: ['Customer does not exist or is not accessible'],
        })
      )
    ).toBe('Customer does not exist or is not accessible');
  });

  it('keeps bulk job imports tenant-scoped and row errors operator-safe', () => {
    const server = read('src/server/functions/jobs/job-batch-operations.ts');
    const compactServer = compact(server);

    expect(server).toContain('customers');
    expect(server).toContain('assertBulkJobImportRelations');
    expect(server).toContain('formatBulkJobImportRowError(error)');
    expect(compactServer).toContain(
      'eq(customers.organizationId,ctx.organizationId),isNull(customers.deletedAt),inArray(customers.id,customerIds)'
    );
    expect(compactServer).toContain(
      'eq(users.organizationId,ctx.organizationId),isNull(users.deletedAt),inArray(users.id,installerIds)'
    );
    expect(compactServer).toContain(
      "thrownewValidationError('Customernotfound',{customerId:['Customerdoesnotexistorisnotaccessible'],})"
    );
    expect(compactServer).toContain(
      "thrownewValidationError('Installernotfound',{installerId:['Installerdoesnotexistorisnotaccessible'],})"
    );
    expect(compactServer).toContain(
      'assertBulkJobImportRelations(jobData,scopedCustomerIds,scopedInstallerIds);'
    );
    expect(compactServer).toContain('allJobNumbers.length>0?awaitdb');
    expect(server).not.toContain(
      'const errorMessage = error instanceof Error ? error.message : String(error);'
    );
  });
});
