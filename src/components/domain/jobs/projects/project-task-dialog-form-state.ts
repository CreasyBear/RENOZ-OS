import { z } from 'zod';

import {
  jobTaskPrioritySchema,
  jobTaskPriorityValues,
  jobTaskStatusSchema,
  jobTaskStatusValues,
} from '@/lib/schemas/jobs';

import type {
  JobTaskPriority,
  JobTaskStatus,
  JobTemplateResponse,
  TaskWithWorkstream,
} from '@/lib/schemas/jobs';

const taskDialogBaseFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  status: jobTaskStatusSchema,
  estimatedHours: z.number().min(0).optional().nullable(),
});

export const projectTaskCreateDialogFormSchema = taskDialogBaseFormSchema
  .omit({ status: true })
  .extend({
    assigneeId: z.string().optional(),
    dueDate: z.string().optional(),
    priority: jobTaskPrioritySchema.optional().default('normal'),
    workstreamId: z.string().optional(),
  });

export const projectTaskEditDialogFormSchema = taskDialogBaseFormSchema.extend({
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  priority: jobTaskPrioritySchema.optional(),
});

export type ProjectTaskCreateDialogFormValues = z.infer<
  typeof projectTaskCreateDialogFormSchema
>;

export type ProjectTaskEditDialogFormValues = z.infer<
  typeof projectTaskEditDialogFormSchema
>;

export interface ProjectTaskTemplateOption {
  value: string;
  label: string;
  title: string;
  description?: string;
}

export function getProjectTaskCreateDialogDefaultValues(): ProjectTaskCreateDialogFormValues {
  return {
    title: '',
    description: '',
    assigneeId: '',
    dueDate: '',
    priority: 'normal',
    estimatedHours: null,
    workstreamId: '',
  };
}

export function getProjectTaskEditDialogDefaultValues(): ProjectTaskEditDialogFormValues {
  return {
    title: '',
    description: '',
    status: 'pending',
    estimatedHours: null,
    assigneeId: null,
    dueDate: null,
    priority: 'normal',
  };
}

export function buildProjectTaskTemplateOptions(
  templates: readonly Pick<JobTemplateResponse, 'id' | 'name' | 'defaultTasks'>[]
): ProjectTaskTemplateOption[] {
  return templates.flatMap((template) =>
    (template.defaultTasks ?? []).map((task) => ({
      value: `${template.id}:${task.id}`,
      label: `${template.name}: ${task.title}`,
      title: task.title,
      description: task.description,
    }))
  );
}

export function getProjectTaskCreateMoreResetValues(
  values: Pick<
    ProjectTaskCreateDialogFormValues,
    'assigneeId' | 'priority' | 'workstreamId'
  >
): ProjectTaskCreateDialogFormValues {
  return {
    ...getProjectTaskCreateDialogDefaultValues(),
    assigneeId: values.assigneeId ? String(values.assigneeId) : '',
    priority: values.priority || 'normal',
    workstreamId: values.workstreamId ? String(values.workstreamId) : '',
  };
}

export function getProjectTaskEditDueDateValue(
  dueDate: TaskWithWorkstream['dueDate']
): string | null {
  if (dueDate instanceof Date) {
    return dueDate.toISOString().slice(0, 10);
  }

  return dueDate ?? null;
}

export function getProjectTaskEditStatusValue(status: string): JobTaskStatus {
  return jobTaskStatusValues.includes(status as JobTaskStatus)
    ? (status as JobTaskStatus)
    : 'pending';
}

export function getProjectTaskEditPriorityValue(
  priority: string | null | undefined
): JobTaskPriority {
  return jobTaskPriorityValues.includes(priority as JobTaskPriority)
    ? (priority as JobTaskPriority)
    : 'normal';
}

export function getProjectTaskEditDialogResetValues(
  task: TaskWithWorkstream
): ProjectTaskEditDialogFormValues {
  return {
    title: task.title,
    description: task.description || '',
    status: getProjectTaskEditStatusValue(task.status),
    estimatedHours: task.estimatedHours ?? null,
    assigneeId: task.assigneeId,
    dueDate: getProjectTaskEditDueDateValue(task.dueDate),
    priority: getProjectTaskEditPriorityValue(task.priority),
  };
}
