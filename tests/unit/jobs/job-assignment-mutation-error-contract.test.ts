import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatJobAssignmentServerMutationError } from '@/lib/jobs/job-assignment-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('job assignment mutation error contract', () => {
  it('formats job assignment server mutation failures without leaking internals', () => {
    expect(
      formatJobAssignmentServerMutationError(
        new Error('duplicate key violates job_assignments_job_number_idx postgres stack'),
        'create'
      )
    ).toBe('Job creation is temporarily unavailable. Please refresh and try again.');

    expect(
      formatJobAssignmentServerMutationError(
        { statusCode: 404, code: 'NOT_FOUND', message: 'raw job lookup detail' },
        'update'
      )
    ).toBe('The requested job could not be found. Refresh and try again.');

    expect(
      formatJobAssignmentServerMutationError(
        {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          errors: { title: ['Job title is required'] },
        },
        'complete'
      )
    ).toBe('Job title is required');
  });

  it('keeps legacy job assignment server mutation result strings operator-safe', () => {
    const server = read('src/server/functions/jobs/job-assignments.ts');
    const compactServer = compact(server);

    expect(server).toContain('formatJobAssignmentServerMutationError');
    expect(compactServer).toContain(
      "error:formatJobAssignmentServerMutationError(error,'create')"
    );
    expect(compactServer).toContain(
      "error:formatJobAssignmentServerMutationError(error,'update')"
    );
    expect(compactServer).toContain(
      "error:formatJobAssignmentServerMutationError(error,'delete')"
    );
    expect(compactServer).toContain(
      "error:formatJobAssignmentServerMutationError(error,'start')"
    );
    expect(compactServer).toContain(
      "error:formatJobAssignmentServerMutationError(error,'complete')"
    );
    expect(compactServer).toContain(
      "error:formatJobAssignmentServerMutationError(error,'photoCreate')"
    );

    expect(server).not.toContain(
      "error: error instanceof Error ? error.message : 'Failed to create job assignment'"
    );
    expect(server).not.toContain(
      "error: error instanceof Error ? error.message : 'Failed to update job assignment'"
    );
    expect(server).not.toContain(
      "error: error instanceof Error ? error.message : 'Failed to delete job assignment'"
    );
    expect(server).not.toContain(
      "error: error instanceof Error ? error.message : 'Failed to start job assignment'"
    );
    expect(server).not.toContain(
      "error: error instanceof Error ? error.message : 'Failed to complete job assignment'"
    );
    expect(server).not.toContain(
      "error: error instanceof Error ? error.message : 'Failed to create job photo'"
    );
  });
});
