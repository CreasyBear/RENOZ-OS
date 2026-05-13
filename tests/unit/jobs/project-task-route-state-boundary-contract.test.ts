import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project task route state boundary contract', () => {
  it('keeps task URL search parsing and navigation payloads out of the task tab', () => {
    const tab = read('src/components/domain/jobs/projects/project-tasks-tab.tsx');
    const routeState = read('src/components/domain/jobs/projects/project-task-route-state.ts');

    expect(tab).toContain("import { useProjectTaskRouteState } from './project-task-route-state';");
    expect(tab).toContain('useProjectTaskRouteState(projectId)');
    expect(tab).not.toContain('useSearch({ from:');
    expect(tab).not.toContain('useNavigate()');
    expect(tab).not.toContain('search.taskStatus');
    expect(tab).not.toContain('search.taskPriority');
    expect(tab).not.toContain('taskStatus: newFilters.status.length');
    expect(tab).not.toContain("taskSort: newSort !== 'dueDate'");

    expect(routeState).toContain("useSearch({ from: '/_authenticated/projects/$projectId' })");
    expect(routeState).toContain("to: '/projects/$projectId'");
    expect(routeState).toContain('taskStatus: filters.status.length > 0 ? filters.status.join');
    expect(routeState).toContain("taskSort: sort !== 'dueDate' ? sort : undefined");
  });
});
