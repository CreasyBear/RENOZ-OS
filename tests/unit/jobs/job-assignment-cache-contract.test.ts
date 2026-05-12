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

describe('job assignment cache contract', () => {
  it('keeps core job assignment mutations off broad root invalidations', () => {
    const queryKeys = read('src/lib/query-keys.ts');
    const hooks = read('src/hooks/jobs/use-jobs.ts');
    const compactQueryKeys = compact(queryKeys);
    const compactHooks = compact(hooks);

    expect(compactQueryKeys).toContain(
      "activeProjectsAll:()=>[...queryKeys.jobs.all,'activeProjects']asconst"
    );
    expect(compactQueryKeys).toContain(
      "eventsAll:()=>[...queryKeys.jobCalendar.all,'events']asconst"
    );
    expect(compactQueryKeys).toContain(
      "eventsRanges:()=>[...queryKeys.jobCalendar.all,'eventsRange']asconst"
    );
    expect(compactQueryKeys).toContain(
      "unscheduledLists:()=>[...queryKeys.jobCalendar.all,'unscheduled']asconst"
    );
    expect(compactQueryKeys).toContain(
      "kanbanSelectors:()=>[...queryKeys.jobAssignments.all,'kanbanSelector']asconst"
    );

    expect(hooks).toContain('function invalidateJobAssignmentCollectionViews');
    expect(hooks).toContain('function invalidateJobCalendarAssignmentViews');
    expect(hooks).toContain('function invalidateJobTaskAssignmentContext');
    expect(hooks).toContain('function getBatchOperationJobIds');
    expect(compactHooks).toContain('queryKeys.jobs.lists()');
    expect(compactHooks).toContain('queryKeys.jobs.activeProjectsAll()');
    expect(compactHooks).toContain('queryKeys.jobAssignments.kanbanSelectors()');
    expect(compactHooks).toContain('queryKeys.jobCalendar.eventsRanges()');
    expect(compactHooks).toContain('queryKeys.jobCalendar.timelineStatsAll()');
    expect(compactHooks).toContain('queryKeys.jobTasks.lists()');
    expect(compactHooks).toContain('queryKeys.jobTasks.kanban.all');
    expect(compactHooks).toContain('queryKeys.jobTasks.myTasks.all');

    expect(hooks).not.toContain('queryKey: queryKeys.jobs.all');
    expect(hooks).not.toContain('queryKey: queryKeys.jobCalendar.all');
    expect(hooks).not.toContain('queryKey: queryKeys.jobAssignments.all');
    expect(hooks).not.toContain('queryKey: queryKeys.jobTasks.all');
  });
});
