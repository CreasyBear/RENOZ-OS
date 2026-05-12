import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('jobs view sync cache contract', () => {
  it('keeps cross-view synchronization on explicit view families', () => {
    const hook = read('src/hooks/jobs/use-jobs-view-sync.ts');
    const compactHook = compact(hook);

    expect(hook).toContain('function invalidateJobAssignmentViewFamilies');
    expect(hook).toContain('function invalidateJobCalendarViewFamilies');
    expect(hook).toContain('function invalidateJobTaskViewFamilies');
    expect(compactHook).toContain('queryKeys.jobs.lists()');
    expect(compactHook).toContain('queryKeys.jobs.activeProjectsAll()');
    expect(compactHook).toContain('queryKeys.jobAssignments.kanbanSelectors()');
    expect(compactHook).toContain('queryKeys.jobCalendar.eventsRanges()');
    expect(compactHook).toContain('queryKeys.jobCalendar.timelineStatsAll()');
    expect(compactHook).toContain('queryKeys.jobTasks.kanban.all');
    expect(compactHook).toContain('queryKeys.jobTasks.myTasks.all');

    expect(hook).not.toContain('queryKey: queryKeys.jobs.all');
    expect(hook).not.toContain('queryKey: queryKeys.jobAssignments.all');
    expect(hook).not.toContain('queryKey: queryKeys.jobTasks.all');
    expect(hook).not.toContain('queryKey: queryKeys.jobCalendar.all');
  });
});
