import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project task filter controls boundary contract', () => {
  it('keeps task filter, sort, chip controls, and shared config out of the parent tab', () => {
    const tab = read('src/components/domain/jobs/projects/project-tasks-tab.tsx');
    const controls = read('src/components/domain/jobs/projects/project-task-filter-controls.tsx');
    const config = read('src/components/domain/jobs/projects/project-task-config.ts');

    expect(tab).toContain("from './project-task-filter-controls';");
    expect(tab).toContain("from './project-task-config';");
    expect(tab).toContain('<ProjectTaskFilterPopover');
    expect(tab).toContain('<ProjectTaskSortDropdown');
    expect(tab).toContain('<ProjectTaskActiveFilterChips');
    expect(tab).not.toContain('function TaskFilterPopover');
    expect(tab).not.toContain('function TaskSortDropdown');
    expect(tab).not.toContain('function ActiveFilterChips');
    expect(tab).not.toContain('typedRecordEntries');
    expect(tab).not.toContain('DropdownMenuCheckboxItem');
    expect(tab).not.toContain('PopoverContent');

    expect(controls).toContain('export function ProjectTaskFilterPopover');
    expect(controls).toContain('export function ProjectTaskSortDropdown');
    expect(controls).toContain('export function ProjectTaskActiveFilterChips');
    expect(controls).toContain('typedRecordEntries(PROJECT_TASK_STATUS_CONFIG)');
    expect(controls).toContain('typedRecordEntries(PROJECT_TASK_PRIORITY_CONFIG)');
    expect(controls).toContain('onFiltersChange(DEFAULT_TASK_FILTERS)');

    expect(config).toContain('export const DEFAULT_TASK_FILTERS');
    expect(config).toContain('export function getTaskPriority');
    expect(config).toContain('export const PROJECT_TASK_PRIORITY_CONFIG');
    expect(config).toContain('export const PROJECT_TASK_STATUS_CONFIG');
  });
});
