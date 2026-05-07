import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createJobAssignmentSchema } from '@/lib/schemas/jobs/job-assignments';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

const baseJob = {
  organizationId: '11111111-1111-4111-8111-111111111111',
  customerId: '22222222-2222-4222-8222-222222222222',
  installerId: '33333333-3333-4333-8333-333333333333',
  title: 'Battery warehouse commissioning',
  scheduledDate: '2026-05-07',
};

describe('job assignment create auto-number contract', () => {
  it('lets the server generate job numbers when create callers omit or blank the field', () => {
    expect(createJobAssignmentSchema.parse(baseJob).jobNumber).toBeUndefined();
    expect(createJobAssignmentSchema.parse({ ...baseJob, jobNumber: '' }).jobNumber).toBeUndefined();
    expect(createJobAssignmentSchema.parse({ ...baseJob, jobNumber: '  ' }).jobNumber).toBeUndefined();
    expect(createJobAssignmentSchema.parse({ ...baseJob, jobNumber: ' JOB-42 ' }).jobNumber).toBe(
      'JOB-42'
    );
  });

  it('keeps the hook, schema, and server generation contract aligned', () => {
    const schema = read('src/lib/schemas/jobs/job-assignments.ts');
    const hook = read('src/hooks/jobs/use-jobs.ts');
    const server = read('src/server/functions/jobs/job-assignments.ts');
    const compactSchema = compact(schema);
    const compactHook = compact(hook);
    const compactServer = compact(server);

    expect(compactSchema).toContain('constoptionalGeneratedJobNumberSchema=z.preprocess(');
    expect(compactSchema).toContain('jobNumber:optionalGeneratedJobNumberSchema');
    expect(compactHook).toContain('jobNumber:input.jobNumber');
    expect(hook).not.toContain("jobNumber: input.jobNumber ?? ''");
    expect(compactServer).toContain(
      'constjobNumber=data.jobNumber||(awaitgenerateJobNumber(ctx.organizationId));'
    );
  });
});
