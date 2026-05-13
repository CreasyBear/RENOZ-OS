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

    expect(tab).toContain("import { ProjectTaskWorkstreamGroup } from './project-task-workstream-group';");
    expect(tab).toContain('<ProjectTaskWorkstreamGroup');
    expect(tab).not.toContain('function WorkstreamGroup');
    expect(tab).not.toContain('function SortableTaskCard');
    expect(tab).not.toContain('function TaskCardContent');
    expect(tab).not.toContain('useSortable');
    expect(tab).not.toContain('DndContext');
    expect(tab).not.toContain('formatDueDate');
    expect(tab).not.toContain('getInitials');

    expect(group).toContain('export interface ProjectTaskWorkstreamGroupProps');
    expect(group).toContain('export function ProjectTaskWorkstreamGroup');
    expect(group).toContain('function SortableTaskCard');
    expect(group).toContain('function TaskCardContent');
    expect(group).toContain('useSortable({ id: task.id })');
    expect(group).toContain('DndContext');
    expect(group).toContain('onReorderTasks(reorderedTasks.map(t => t.id))');
    expect(group).toContain('PROJECT_TASK_PRIORITY_CONFIG');
    expect(group).toContain('PROJECT_TASK_STATUS_CONFIG');
  });
});
