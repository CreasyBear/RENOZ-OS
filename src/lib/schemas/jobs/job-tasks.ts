/**
 * Job Task Zod Schemas
 *
 * Validation schemas for job task management operations.
 * Used by server functions in src/server/functions/job-tasks.ts
 *
 * @see drizzle/schema/job-tasks.ts for database schema
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-001b
 */

import { z } from 'zod';

// ============================================================================
// ENUMS (must match drizzle/schema/job-tasks.ts)
// ============================================================================

export const jobTaskStatusValues = ['pending', 'in_progress', 'completed', 'blocked'] as const;

export const jobTaskStatusSchema = z.enum(jobTaskStatusValues);

export type JobTaskStatus = z.infer<typeof jobTaskStatusSchema>;

export const jobTaskPriorityValues = ['low', 'normal', 'high', 'urgent'] as const;

export const jobTaskPrioritySchema = z.enum(jobTaskPriorityValues);

export type JobTaskPriority = z.infer<typeof jobTaskPrioritySchema>;

// ============================================================================
// LIST JOB TASKS
// ============================================================================

/**
 * Schema for listing tasks for a job.
 */
export const listJobTasksSchema = z.object({
  jobId: z.string().uuid('Invalid job ID format'),
  status: jobTaskStatusSchema.optional(),
});

export type ListJobTasksInput = z.infer<typeof listJobTasksSchema>;

// ============================================================================
// CREATE TASK
// ============================================================================

/**
 * Schema for creating a new task within a job, site visit, or project.
 * Supports legacy job model, site visit model, and project-level (workstream-first) tasks.
 */
export const createTaskSchema = z.object({
  // One of: jobId (legacy), siteVisitId (visit-linked), or projectId (project-level)
  jobId: z.string().uuid('Invalid job ID format').optional(),
  siteVisitId: z.string().uuid('Invalid site visit ID format').optional(),
  projectId: z.string().uuid('Invalid project ID format').optional(),
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less'),
  description: z.string().optional(),
  assigneeId: z.string().uuid('Invalid assignee ID format').optional().nullable(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(), // YYYY-MM-DD format
  priority: jobTaskPrioritySchema.optional().default('normal'),
  estimatedHours: z.number().min(0).optional().nullable(),
  status: jobTaskStatusSchema.optional().default('pending'),
  workstreamId: z.string().uuid('Invalid workstream ID format').optional().nullable(),
}).refine((data) => data.jobId || data.siteVisitId || data.projectId, {
  message: 'Either jobId, siteVisitId, or projectId is required',
  path: ['jobId'],
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

// ============================================================================
// UPDATE TASK
// ============================================================================

/**
 * Schema for updating an existing task.
 */
export const updateTaskSchema = z.object({
  taskId: z.string().uuid('Invalid task ID format'),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be 255 characters or less')
    .optional(),
  description: z.string().optional().nullable(),
  assigneeId: z.string().uuid('Invalid assignee ID format').optional().nullable(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(), // YYYY-MM-DD format
  priority: jobTaskPrioritySchema.optional(),
  status: jobTaskStatusSchema.optional(),
  estimatedHours: z.number().min(0).optional().nullable(),
  workstreamId: z.string().uuid('Invalid workstream ID format').optional().nullable(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

// ============================================================================
// DELETE TASK
// ============================================================================

/**
 * Schema for deleting a task.
 */
export const deleteTaskSchema = z.object({
  taskId: z.string().uuid('Invalid task ID format'),
});

export type DeleteTaskInput = z.infer<typeof deleteTaskSchema>;

// ============================================================================
// REORDER TASKS
// ============================================================================

/**
 * Schema for reordering tasks within a job.
 * Used for drag-drop reordering in the UI.
 */
export const reorderTasksSchema = z.object({
  jobId: z.string().uuid('Invalid job ID format'),
  /** Array of task IDs in the new order */
  taskIds: z.array(z.string().uuid('Invalid task ID format')).min(1),
});

export type ReorderTasksInput = z.infer<typeof reorderTasksSchema>;

// ============================================================================
// GET TASK BY ID
// ============================================================================

/**
 * Schema for fetching a single task by ID.
 */
export const getTaskSchema = z.object({
  taskId: z.string().uuid('Invalid task ID format'),
});

export type GetTaskInput = z.infer<typeof getTaskSchema>;

// ============================================================================
// TASK RESPONSE TYPES
// ============================================================================

/**
 * Task response with assignee details.
 */
export const taskResponseSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  jobId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: jobTaskStatusSchema,
  priority: jobTaskPrioritySchema,
  assigneeId: z.string().uuid().nullable(),
  dueDate: z.coerce.date().nullable(),
  position: z.number(),
  version: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
  assignee: z
    .object({
      id: z.string().uuid(),
      name: z.string().nullable(),
      email: z.string(),
    })
    .nullable()
    .optional(),
});

export type TaskResponse = z.infer<typeof taskResponseSchema>;

/**
 * Project task response - getProjectTasks returns full job_tasks table shape.
 * Extends TaskResponse with siteVisitId, projectId, workstreamId, estimatedHours, actualHours.
 * dueDate is string | Date | null for formatDueDate compatibility.
 */
export const projectTaskResponseSchema = taskResponseSchema.extend({
  siteVisitId: z.string().uuid().nullable(),
  projectId: z.string().uuid().nullable(),
  workstreamId: z.string().uuid().nullable(),
  estimatedHours: z.number().nullable(),
  actualHours: z.number().nullable(),
  dueDate: z.union([z.string(), z.coerce.date()]).nullable(),
});

export type ProjectTaskResponse = z.infer<typeof projectTaskResponseSchema>;

// ============================================================================
// ENTITY INTERFACE (client-safe, mirrors drizzle type)
// ============================================================================

/**
 * Job task entity.
 * Mirrors drizzle/schema/jobs/job-tasks.ts JobTask.
 */
export interface JobTask {
  id: string;
  organizationId: string;
  jobId: string;
  siteVisitId: string | null;
  projectId: string | null;
  workstreamId: string | null;
  title: string;
  description: string | null;
  status: JobTaskStatus;
  assigneeId: string | null;
  dueDate: string | null;
  priority: JobTaskPriority;
  estimatedHours: number | null;
  actualHours: number | null;
  position: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}

// ============================================================================
// KANBAN TYPES
// ============================================================================

/**
 * My Tasks Kanban type for cross-project task view.
 * Used by /my-tasks route for kanban board display.
 */
export interface MyTaskKanban {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  position: number;
  estimatedHours: number | null;
  actualHours: number | null;
  dueDate: Date | null;
  workstreamId: string | null;
  workstreamName: string | null;

  // Project context (cross-project view)
  project: {
    id: string;
    projectNumber: string;
    title: string;
    status: string;
  };

  // Site visit context
  siteVisit: {
    id: string;
    scheduledDate: Date | null;
    visitNumber: string;
    visitType: string;
  } | null;

  // Customer context
  customer: {
    id: string;
    name: string;
  } | null;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// UI TYPES
// ============================================================================

/**
 * Task with workstream and assignee information for UI display.
 * Extends ProjectTaskResponse (getProjectTasks API shape).
 */
export interface TaskWithWorkstream extends ProjectTaskResponse {
  workstreamName?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  /** For link display when task is linked to a site visit */
  siteVisitNumber?: string;
}

/**
 * Task filter options for UI
 */
export interface TaskFilters {
  status: JobTaskStatus[];
  priority: JobTaskPriority[];
  assignee: 'all' | 'me' | 'unassigned';
}

/**
 * Task sort options
 */
export type TaskSortOption = 'dueDate' | 'priority' | 'created' | 'title';

/**
 * Return typed entries for Record<K, V>.
 * Use when iterating over status/priority configs to avoid component-level type assertions.
 * @see SCHEMA-TRACE.md - types in schema files, no assertions in components
 */
export function typedRecordEntries<K extends string, V>(record: Record<K, V>): [K, V][] {
  return Object.entries(record) as [K, V][];
}

/**
 * Response from getProjectTasks API
 */
export interface GetProjectTasksResponse {
  tasks: ProjectTaskResponse[];
}
