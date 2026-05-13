import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project task states boundary contract', () => {
  it('keeps loading, empty, filtered-empty, and read-warning presentation behind focused state presenters', () => {
    const tab = read('src/components/domain/jobs/projects/project-tasks-tab.tsx');
    const states = read('src/components/domain/jobs/projects/project-task-states.tsx');

    expect(tab).toContain("from './project-task-states';");
    expect(tab).toContain('<ProjectTasksLoadingState />');
    expect(tab).toContain('<ProjectTasksUnavailableState');
    expect(tab).toContain('<ProjectTasksCachedWarning');
    expect(tab).toContain('<ProjectTasksEmptyState');
    expect(tab).toContain('<ProjectTasksFilteredEmptyState');
    expect(tab).not.toContain('function EmptyTasksState');
    expect(tab).not.toContain('Tasks unavailable</AlertTitle>');
    expect(tab).not.toContain('Showing cached tasks</AlertTitle>');
    expect(tab).not.toContain('No tasks yet</h3>');
    expect(tab).not.toContain('No tasks match your filters</h3>');

    expect(states).toContain('export function ProjectTasksLoadingState');
    expect(states).toContain('export function ProjectTasksUnavailableState');
    expect(states).toContain('export function ProjectTasksCachedWarning');
    expect(states).toContain('export function ProjectTasksEmptyState');
    expect(states).toContain('export function ProjectTasksFilteredEmptyState');
    expect(states).toContain("import { getProjectTasksReadErrorMessage } from './project-read-error-messages';");
    expect(states).toContain('Tasks unavailable</AlertTitle>');
    expect(states).toContain('Showing cached tasks</AlertTitle>');
    expect(states).toContain('No tasks yet</h3>');
    expect(states).toContain('No tasks match your filters</h3>');
  });
});
