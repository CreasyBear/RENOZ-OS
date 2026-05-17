import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project task workstream group boundary contract', () => {
  it('keeps task card and workstream board rendering behind a focused presenter', () => {
    const tab = read('src/components/domain/jobs/projects/project-tasks-tab.tsx');
    const group = read('src/components/domain/jobs/projects/project-task-workstream-group.tsx');
    const card = read('src/components/domain/jobs/projects/project-task-sortable-card.tsx');
    const taskList = read('src/components/domain/jobs/projects/task-list.tsx');
    const displayUtils = read('src/components/domain/jobs/projects/project-task-display-utils.ts');

    expect(tab).toContain("import { ProjectTaskWorkstreamGroup } from './project-task-workstream-group';");
    expect(tab).toContain('<ProjectTaskWorkstreamGroup');
    expect(tab).not.toContain('function WorkstreamGroup');
    expect(tab).not.toContain('function SortableTaskCard');
    expect(tab).not.toContain('function TaskCardContent');
    expect(tab).not.toContain('ProjectTaskSortableCard');
    expect(tab).not.toContain('useSortable');
    expect(tab).not.toContain('DndContext');
    expect(tab).not.toContain('formatDueDate');
    expect(tab).not.toContain('getInitials');

    expect(group).toContain('export interface ProjectTaskWorkstreamGroupProps');
    expect(group).toContain('export function ProjectTaskWorkstreamGroup');
    expect(group).toContain("import { ProjectTaskSortableCard } from './project-task-sortable-card';");
    expect(group).toContain('<ProjectTaskSortableCard');
    expect(group).toContain('DndContext');
    expect(group).toContain('SortableContext');
    expect(group).toContain('onReorderTasks(reorderedTasks.map(t => t.id))');
    expect(group).not.toContain('function ProjectTaskSortableCard');
    expect(group).not.toContain('function ProjectTaskCardContent');
    expect(group).not.toContain('useSortable({ id: task.id })');
    expect(group).not.toContain('formatDueDate');
    expect(group).not.toContain('getInitials');
    expect(group).not.toContain('PROJECT_TASK_PRIORITY_CONFIG');
    expect(group).not.toContain('PROJECT_TASK_STATUS_CONFIG');

    expect(card).toContain('export interface ProjectTaskSortableCardProps');
    expect(card).toContain('export function ProjectTaskSortableCard');
    expect(card).toContain('function ProjectTaskCardContent');
    expect(card).toContain('useSortable({ id: task.id })');
    expect(card).toContain("from './project-task-display-utils';");
    expect(card).toContain('formatProjectTaskDueDate(task.dueDate)');
    expect(card).toContain('getProjectTaskInitials(task.assigneeName)');
    expect(card).not.toContain('function formatDueDate');
    expect(card).not.toContain('function getInitials');
    expect(card).toContain('PROJECT_TASK_PRIORITY_CONFIG');
    expect(card).toContain('PROJECT_TASK_STATUS_CONFIG');
    expect(card).toContain('Link');
    expect(card).toContain('DropdownMenu');
    expect(card).not.toContain('DndContext');

    expect(taskList).toContain("from './project-task-display-utils';");
    expect(taskList).toContain('formatProjectTaskDueDate(task.dueDate)');
    expect(taskList).toContain('getProjectTaskInitials(task.assigneeName)');
    expect(taskList).not.toContain('function formatDueDate');
    expect(taskList).not.toContain('function getInitials');

    expect(displayUtils).toContain('export function formatProjectTaskDueDate');
    expect(displayUtils).toContain('export function getProjectTaskInitials');
  });
});
