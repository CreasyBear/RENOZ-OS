import { describe, expect, it } from 'vitest';

import {
  buildProjectTaskTemplateOptions,
  getProjectTaskCreateDialogDefaultValues,
  getProjectTaskCreateMoreResetValues,
  getProjectTaskEditDialogDefaultValues,
  getProjectTaskEditDialogResetValues,
  getProjectTaskEditDueDateValue,
  getProjectTaskEditPriorityValue,
  getProjectTaskEditStatusValue,
  projectTaskCreateDialogFormSchema,
  projectTaskEditDialogFormSchema,
} from '@/components/domain/jobs/projects/project-task-dialog-form-state';

import type { JobTemplateResponse, TaskWithWorkstream } from '@/lib/schemas/jobs';

describe('project task dialog form state', () => {
  it('uses canonical task schemas for create and edit validation', () => {
    expect(
      projectTaskCreateDialogFormSchema.parse({
        title: 'Pack parts',
        priority: 'urgent',
      }).priority
    ).toBe('urgent');

    expect(() =>
      projectTaskEditDialogFormSchema.parse({
        title: 'Pack parts',
        status: 'done',
      })
    ).toThrow();
  });

  it('builds template options from active job templates', () => {
    const templates = [
      {
        id: 'template-1',
        name: 'Install prep',
        defaultTasks: [
          { id: 'task-1', title: 'Pick batteries', description: 'From warehouse', position: 1 },
          { id: 'task-2', title: 'Book installer', position: 2 },
        ],
      },
    ] as JobTemplateResponse[];

    expect(buildProjectTaskTemplateOptions(templates)).toEqual([
      {
        value: 'template-1:task-1',
        label: 'Install prep: Pick batteries',
        title: 'Pick batteries',
        description: 'From warehouse',
      },
      {
        value: 'template-1:task-2',
        label: 'Install prep: Book installer',
        title: 'Book installer',
        description: undefined,
      },
    ]);
  });

  it('preserves sticky fields when create-more resets a task form', () => {
    expect(
      getProjectTaskCreateMoreResetValues({
        assigneeId: 'user-1',
        priority: 'high',
        workstreamId: 'workstream-1',
      })
    ).toEqual({
      ...getProjectTaskCreateDialogDefaultValues(),
      assigneeId: 'user-1',
      priority: 'high',
      workstreamId: 'workstream-1',
    });
  });

  it('normalizes edit task due date, status, and priority fallbacks', () => {
    expect(getProjectTaskEditDueDateValue(new Date('2026-05-17T12:00:00.000Z'))).toBe(
      '2026-05-17'
    );
    expect(getProjectTaskEditDueDateValue('2026-05-18')).toBe('2026-05-18');
    expect(getProjectTaskEditDueDateValue(null)).toBeNull();
    expect(getProjectTaskEditStatusValue('in_progress')).toBe('in_progress');
    expect(getProjectTaskEditStatusValue('unknown')).toBe('pending');
    expect(getProjectTaskEditPriorityValue('urgent')).toBe('urgent');
    expect(getProjectTaskEditPriorityValue(undefined)).toBe('normal');
  });

  it('builds edit dialog reset values from the selected task', () => {
    const task = {
      title: 'Verify serials',
      description: null,
      status: 'blocked',
      estimatedHours: 2,
      assigneeId: null,
      dueDate: '2026-05-18',
      priority: 'urgent',
    } as TaskWithWorkstream;

    expect(getProjectTaskEditDialogResetValues(task)).toEqual({
      ...getProjectTaskEditDialogDefaultValues(),
      title: 'Verify serials',
      description: '',
      status: 'blocked',
      estimatedHours: 2,
      dueDate: '2026-05-18',
      priority: 'urgent',
    });
  });
});
