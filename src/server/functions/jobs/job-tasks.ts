/**
 * Job Tasks Server Functions
 *
 * Server-side functions for job task CRUD operations.
 * All functions use withAuth for authentication and filter by organizationId.
 *
 * @see src/lib/schemas/job-tasks.ts for validation schemas
 * @see drizzle/schema/job-tasks.ts for database schema
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-001b
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { jobTasks, jobAssignments, users } from 'drizzle/schema';
import {
  listJobTasksSchema,
  createTaskSchema,
  updateTaskSchema,
  deleteTaskSchema,
  reorderTasksSchema,
  getTaskSchema,
  type TaskResponse,
} from '@/lib/schemas';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError } from '@/lib/server/errors';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import { computeChanges } from '@/lib/activity-logger';

// ============================================================================
// ACTIVITY LOGGING HELPERS
// ============================================================================

/**
 * Fields to exclude from activity change tracking (system-managed)
 */
const TASK_EXCLUDED_FIELDS: string[] = [
  'updatedAt',
  'updatedBy',
  'createdAt',
  'createdBy',
  'deletedAt',
  'version',
  'organizationId',
  'position',
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Verify job belongs to the user's organization.
 * Returns the job with customerId if found, throws NotFoundError otherwise.
 */
async function verifyJobAccess(jobId: string, organizationId: string) {
  const [job] = await db
    .select({ id: jobAssignments.id, customerId: jobAssignments.customerId })
    .from(jobAssignments)
    .where(and(eq(jobAssignments.id, jobId), eq(jobAssignments.organizationId, organizationId)))
    .limit(1);

  if (!job) {
    throw new NotFoundError('Job not found');
  }

  return job;
}

/**
 * Get the next position for a new task in a job.
 */
async function getNextPosition(jobId: string): Promise<number> {
  // Get all task positions for this job
  const tasks = await db
    .select({ position: jobTasks.position })
    .from(jobTasks)
    .where(eq(jobTasks.jobId, jobId));

  return tasks.length > 0 ? Math.max(...tasks.map((t) => t.position)) + 1 : 0;
}

// ============================================================================
// LIST JOB TASKS
// ============================================================================

/**
 * Get all tasks for a job assignment, ordered by position.
 */
export const listJobTasks = createServerFn({ method: 'GET' })
  .inputValidator(listJobTasksSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.read ?? 'customer.read',
    });

    // Verify job access
    await verifyJobAccess(data.jobId, ctx.organizationId);

    // Build where conditions
    const conditions = [
      eq(jobTasks.organizationId, ctx.organizationId),
      eq(jobTasks.jobId, data.jobId),
    ];

    if (data.status) {
      conditions.push(eq(jobTasks.status, data.status));
    }

    // Query tasks with assignee join
    const results = await db
      .select({
        task: jobTasks,
        assignee: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(jobTasks)
      .leftJoin(users, eq(jobTasks.assigneeId, users.id))
      .where(and(...conditions))
      .orderBy(asc(jobTasks.position));

    // Transform to response format
    const tasks: TaskResponse[] = results.map(({ task, assignee }) => ({
      id: task.id,
      organizationId: task.organizationId,
      jobId: task.jobId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId,
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
      position: task.position,
      version: task.version,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      createdBy: task.createdBy,
      updatedBy: task.updatedBy,
      assignee: assignee?.id
        ? {
            id: assignee.id,
            name: assignee.name,
            email: assignee.email,
          }
        : null,
    }));

    return { tasks };
  });

// ============================================================================
// CREATE TASK
// ============================================================================

/**
 * Create a new task for a job assignment.
 */
export const createTask = createServerFn({ method: 'POST' })
  .inputValidator(createTaskSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.create ?? 'customer.create',
    });
    const logger = createActivityLoggerWithContext(ctx);

    // Verify job access and get customerId for activity logging
    const job = await verifyJobAccess(data.jobId, ctx.organizationId);

    // Get next position
    const position = await getNextPosition(data.jobId);

    // Insert task
    const [task] = await db
      .insert(jobTasks)
      .values({
        organizationId: ctx.organizationId,
        jobId: data.jobId,
        title: data.title,
        description: data.description ?? null,
        assigneeId: data.assigneeId ?? null,
        dueDate: data.dueDate ?? null,
        estimatedHours: data.estimatedHours ?? null,
        status: data.status ?? 'pending',
        priority: data.priority ?? 'normal',
        position,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    // Log task creation
    logger.logAsync({
      entityType: 'task',
      entityId: task.id,
      action: 'created',
      description: `Created task: ${task.title}`,
      changes: computeChanges({
        before: null,
        after: task,
        excludeFields: TASK_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        customerId: job.customerId ?? undefined,
        taskId: task.id,
        taskTitle: task.title,
        jobAssignmentId: task.jobId,
        status: task.status,
        priority: task.priority ?? undefined,
        assignedTo: task.assigneeId ?? undefined,
      },
    });

    return { task };
  });

// ============================================================================
// UPDATE TASK
// ============================================================================

/**
 * Update an existing task.
 */
export const updateTask = createServerFn({ method: 'POST' })
  .inputValidator(updateTaskSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.update ?? 'customer.update',
    });
    const logger = createActivityLoggerWithContext(ctx);

    // Get existing task for change tracking
    const [existingTask] = await db
      .select()
      .from(jobTasks)
      .where(and(eq(jobTasks.id, data.taskId), eq(jobTasks.organizationId, ctx.organizationId)))
      .limit(1);

    if (!existingTask) {
      throw new NotFoundError('Task not found');
    }

    const before = existingTask;

    // Get customerId from job for activity logging
    const job = await verifyJobAccess(existingTask.jobId, ctx.organizationId);

    // Build update values (only include provided fields)
    const updateValues: Record<string, unknown> = {
      updatedBy: ctx.user.id,
    };

    if (data.title !== undefined) updateValues.title = data.title;
    if (data.description !== undefined) updateValues.description = data.description;
    if (data.assigneeId !== undefined) updateValues.assigneeId = data.assigneeId;
    if (data.dueDate !== undefined) updateValues.dueDate = data.dueDate;
    if (data.status !== undefined) updateValues.status = data.status;
    if (data.priority !== undefined) updateValues.priority = data.priority;

    // Update task
    const [task] = await db
      .update(jobTasks)
      .set(updateValues)
      .where(and(eq(jobTasks.id, data.taskId), eq(jobTasks.organizationId, ctx.organizationId)))
      .returning();

    // Log task update
    const changes = computeChanges({
      before,
      after: task,
      excludeFields: TASK_EXCLUDED_FIELDS as never[],
    });

    if (changes.fields && changes.fields.length > 0) {
      logger.logAsync({
        entityType: 'task',
        entityId: task.id,
        action: 'updated',
        description: `Updated task: ${task.title}`,
        changes,
        metadata: {
          customerId: job.customerId ?? undefined,
          taskId: task.id,
          taskTitle: task.title,
          jobAssignmentId: task.jobId,
          changedFields: changes.fields,
          ...(before.status !== task.status && {
            previousStatus: before.status,
            newStatus: task.status,
          }),
          ...(before.assigneeId !== task.assigneeId && {
            assignedTo: task.assigneeId ?? undefined,
          }),
        },
      });
    }

    return { task };
  });

// ============================================================================
// DELETE TASK
// ============================================================================

/**
 * Delete a task from a job assignment.
 */
export const deleteTask = createServerFn({ method: 'POST' })
  .inputValidator(deleteTaskSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.delete ?? 'customer.delete',
    });
    const logger = createActivityLoggerWithContext(ctx);

    // Get existing task for activity logging
    const [existingTask] = await db
      .select()
      .from(jobTasks)
      .where(and(eq(jobTasks.id, data.taskId), eq(jobTasks.organizationId, ctx.organizationId)))
      .limit(1);

    if (!existingTask) {
      throw new NotFoundError('Task not found');
    }

    // Get customerId from job for activity logging
    const job = await verifyJobAccess(existingTask.jobId, ctx.organizationId);

    // Delete task
    await db
      .delete(jobTasks)
      .where(and(eq(jobTasks.id, data.taskId), eq(jobTasks.organizationId, ctx.organizationId)));

    // Log task deletion
    logger.logAsync({
      entityType: 'task',
      entityId: existingTask.id,
      action: 'deleted',
      description: `Deleted task: ${existingTask.title}`,
      changes: computeChanges({
        before: existingTask,
        after: null,
        excludeFields: TASK_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        customerId: job.customerId ?? undefined,
        taskId: existingTask.id,
        taskTitle: existingTask.title,
        jobAssignmentId: existingTask.jobId,
        status: existingTask.status,
      },
    });

    return { success: true };
  });

// ============================================================================
// REORDER TASKS
// ============================================================================

/**
 * Reorder tasks within a job assignment.
 * Updates the position field for each task based on the provided order.
 */
export const reorderTasks = createServerFn({ method: 'POST' })
  .inputValidator(reorderTasksSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.update ?? 'customer.update',
    });

    // Verify job access
    await verifyJobAccess(data.jobId, ctx.organizationId);

    // Update positions in a transaction
    await db.transaction(async (tx) => {
      for (let i = 0; i < data.taskIds.length; i++) {
        await tx
          .update(jobTasks)
          .set({
            position: i,
            updatedBy: ctx.user.id,
          })
          .where(
            and(
              eq(jobTasks.id, data.taskIds[i]),
              eq(jobTasks.organizationId, ctx.organizationId),
              eq(jobTasks.jobId, data.jobId)
            )
          );
      }
    });

    return { success: true };
  });

// ============================================================================
// GET TASK BY ID
// ============================================================================

/**
 * Get a single task by ID with assignee details.
 */
export const getTask = createServerFn({ method: 'GET' })
  .inputValidator(getTaskSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.read ?? 'customer.read',
    });

    // Query task with assignee
    const [result] = await db
      .select({
        task: jobTasks,
        assignee: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(jobTasks)
      .leftJoin(users, eq(jobTasks.assigneeId, users.id))
      .where(and(eq(jobTasks.id, data.taskId), eq(jobTasks.organizationId, ctx.organizationId)))
      .limit(1);

    if (!result) {
      throw new NotFoundError('Task not found');
    }

    const { task, assignee } = result;

    const taskResponse: TaskResponse = {
      id: task.id,
      organizationId: task.organizationId,
      jobId: task.jobId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId,
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
      position: task.position,
      version: task.version,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      createdBy: task.createdBy,
      updatedBy: task.updatedBy,
      assignee: assignee?.id
        ? {
            id: assignee.id,
            name: assignee.name,
            email: assignee.email,
          }
        : null,
    };

    return { task: taskResponse };
  });
