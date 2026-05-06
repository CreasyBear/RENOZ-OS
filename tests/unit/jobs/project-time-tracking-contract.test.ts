import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  calculateJobLaborCostSchema,
  createManualEntrySchema,
  deleteTimeEntrySchema,
  getJobTimeEntriesSchema,
  startTimerSchema,
  stopTimerSchema,
  updateTimeEntrySchema,
} from '@/lib/schemas/jobs/job-time';
import { formatJobTimeMutationError } from '@/hooks/jobs/_mutation-errors';

const root = process.cwd();
const projectId = '11111111-1111-4111-8111-111111111111';
const entryId = '22222222-2222-4222-8222-222222222222';

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('project time tracking contract', () => {
  it('accepts project-scoped time tracking without pretending the project is a job', () => {
    expect(startTimerSchema.parse({ projectId, isBillable: true }).projectId).toBe(projectId);
    expect(
      createManualEntrySchema.parse({
        projectId,
        startTime: new Date('2026-05-06T08:00:00Z'),
        endTime: new Date('2026-05-06T09:00:00Z'),
        isBillable: true,
      }).projectId
    ).toBe(projectId);
    expect(getJobTimeEntriesSchema.parse({ projectId }).projectId).toBe(projectId);
    expect(calculateJobLaborCostSchema.parse({ projectId, hourlyRate: 120 }).projectId).toBe(
      projectId
    );
    expect(stopTimerSchema.parse({ entryId, projectId }).projectId).toBe(projectId);
    expect(updateTimeEntrySchema.parse({ entryId, projectId, isBillable: false }).projectId).toBe(
      projectId
    );
    expect(deleteTimeEntrySchema.parse({ entryId, projectId }).projectId).toBe(projectId);

    expect(() => startTimerSchema.parse({ isBillable: true })).toThrow(
      'A job or project is required for time tracking'
    );
  });

  it('keeps the active project sidebar, hooks, and server resolver project-scoped', () => {
    const sidebar = read('src/components/domain/jobs/projects/sidebar/time-card.tsx');
    const hooks = read('src/hooks/jobs/use-job-resources.ts');
    const queryKeys = read('src/lib/query-keys.ts');
    const server = read('src/server/functions/jobs/job-time.ts');
    const compactSidebar = compact(sidebar);
    const compactHooks = compact(hooks);
    const compactServer = compact(server);

    expect(sidebar).toContain('useJobTimeEntries({\n    projectId,');
    expect(sidebar).toContain('useStopTimer({ projectId })');
    expect(sidebar).toContain("formatJobTimeMutationError(error, 'start')");
    expect(sidebar).toContain("formatJobTimeMutationError(error, 'stop')");
    expect(sidebar).toContain("formatJobTimeMutationError(error, 'createManual')");
    expect(compactSidebar).not.toContain('jobId:projectId');

    expect(queryKeys).toContain('entriesByScope');
    expect(queryKeys).toContain('byScope');
    expect(hooks).toContain('queryKeys.jobTime.entriesByScope(input)');
    expect(hooks).toContain('enabled: hasJobTimeScope(input)');
    expect(compactHooks).toContain('invalidateJobTimeScope(queryClient,data.entry)');

    expect(server).toContain('resolveTimeTrackingScope');
    expect(server).toContain('getOrCreateProjectTimeTrackingJob');
    expect(server).toContain(".for('update')");
    expect(compactServer).toContain('eq(jobAssignments.migratedToProjectId,projectId)');
    expect(compactServer).toContain('migratedToProjectId:project.id');
    expect(compactServer).toContain('constprojectId=scope.projectId');
    expect(compactServer).toContain('jobId,projectId');
    expect(compactServer).toContain(
      'buildTimeEntryAccessPredicate(data.entryId,ctx.organizationId,scope)'
    );
    expect(compactServer).toContain('eq(jobTimeEntries.organizationId,organizationId)');
    expect(compactServer).toContain('eq(jobTimeEntries.jobId,scope.jobId)');
    expect(compactServer).not.toContain('verifyJobExists(data.jobId');
  });

  it('formats project time tracking mutation failures without leaking unsafe internals', () => {
    expect(
      formatJobTimeMutationError(
        new Error('duplicate key violates job_time_entries postgres stack'),
        'createManual'
      )
    ).toBe('Manual time entry creation is temporarily unavailable. Please refresh and try again.');

    expect(
      formatJobTimeMutationError(
        { statusCode: 403, code: 'PERMISSION_DENIED', message: 'raw auth detail' },
        'start'
      )
    ).toBe('You do not have permission to track time.');
  });
});
