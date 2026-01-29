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
 * Schema for creating a new task within a job.
 */
export const createTaskSchema = z.object({
  jobId: z.string().uuid('Invalid job ID format'),
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
