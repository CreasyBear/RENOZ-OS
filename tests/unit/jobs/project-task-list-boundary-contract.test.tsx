import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TaskList } from '@/components/domain/jobs/projects/task-list';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project task list boundary contract', () => {
  it('uses canonical task config and shared display helpers', () => {
    const taskList = read('src/components/domain/jobs/projects/task-list.tsx');
    const config = read('src/components/domain/jobs/projects/project-task-config.ts');
    const displayUtils = read('src/components/domain/jobs/projects/project-task-display-utils.ts');

    expect(taskList).toContain("from './project-task-config';");
    expect(taskList).toContain('PROJECT_TASK_STATUS_CONFIG[task.status]');
    expect(taskList).toContain('PROJECT_TASK_PRIORITY_CONFIG[getTaskPriority(task.priority)]');
    expect(taskList).toContain("from './project-task-display-utils';");
    expect(taskList).toContain('formatProjectTaskDueDate(task.dueDate)');
    expect(taskList).toContain('getProjectTaskInitials(task.assigneeName)');
    expect(taskList).not.toContain('const STATUS_CONFIG');
    expect(taskList).not.toContain('const PRIORITY_CONFIG');
    expect(taskList).not.toContain('function formatDueDate');
    expect(taskList).not.toContain('function getInitials');

    expect(config).toContain('export const PROJECT_TASK_PRIORITY_CONFIG');
    expect(config).toContain('export const PROJECT_TASK_STATUS_CONFIG');
    expect(displayUtils).toContain('export function formatProjectTaskDueDate');
    expect(displayUtils).toContain('export function getProjectTaskInitials');
  });

  it('renders canonical project task status labels in the site visit task list', () => {
    render(
      <TaskList
        tasks={[
          {
            id: 'task-1',
            title: 'Inspect battery pack',
            status: 'pending',
            priority: 'urgent',
          },
          {
            id: 'task-2',
            title: 'Close service visit',
            status: 'completed',
            priority: 'normal',
          },
        ]}
      />
    );

    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.queryByText('Pending')).not.toBeInTheDocument();
    expect(screen.queryByText('Completed')).not.toBeInTheDocument();
  });
});
