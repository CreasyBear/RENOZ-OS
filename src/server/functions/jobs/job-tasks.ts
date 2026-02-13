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
import { eq, and, asc, or, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { jobTasks, jobAssignments, users, siteVisits, projects, customers } from 'drizzle/schema';
import {
  verifyJobExists,
  verifyProjectExists,
  verifySiteVisitExists,
} from '@/server/functions/_shared/entity-verification';
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
import { NotFoundError, ValidationError } from '@/lib/server/errors';
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
 * Get the next position for a new task in a job.
 */
async function getNextPosition(jobId: string, organizationId: string): Promise<number> {
  // Get all task positions for this job (with orgId filter)
  const tasks = await db
    .select({ position: jobTasks.position })
    .from(jobTasks)
    .where(
      and(
        eq(jobTasks.jobId, jobId),
        eq(jobTasks.organizationId, organizationId)
      )
    );

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
    await verifyJobExists(data.jobId, ctx.organizationId);

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

/**
 * Get or create project placeholder job for project-level tasks.
 * Uses migratedToProjectId to link job to project.
 */
async function getOrCreateProjectPlaceholderJob(
  projectId: string,
  organizationId: string,
  project: { customerId: string; projectNumber: string; title: string },
  userId: string
): Promise<string> {
  // Look for existing job linked to this project
  const [existing] = await db
    .select({ id: jobAssignments.id })
    .from(jobAssignments)
    .where(
      and(
        eq(jobAssignments.organizationId, organizationId),
        eq(jobAssignments.migratedToProjectId, projectId)
      )
    )
    .limit(1);

  if (existing) return existing.id;

  // Create placeholder job for project-level tasks
  const [newJob] = await db
    .insert(jobAssignments)
    .values({
      organizationId,
      customerId: project.customerId,
      installerId: userId, // Placeholder: current user
      title: project.title,
      jobNumber: `PRJ-${project.projectNumber}`,
      jobType: 'installation',
      status: 'scheduled',
      scheduledDate: new Date().toISOString().split('T')[0],
      migratedToProjectId: projectId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning({ id: jobAssignments.id });

  return newJob.id;
}

// ============================================================================
// CREATE TASK
// ============================================================================

/**
 * Create a new task for a job assignment or site visit.
 * Supports both legacy job model and new project-centric model.
 */
export const createTask = createServerFn({ method: 'POST' })
  .inputValidator(createTaskSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.create ?? 'customer.create',
    });
    const logger = createActivityLoggerWithContext(ctx);

    // Determine jobId and verify access
    let jobId: string;
    let siteVisitId: string | undefined;
    let customerId: string | undefined;

    if (data.siteVisitId) {
      // New model: Site visit
      siteVisitId = data.siteVisitId;
      const siteVisit = await verifySiteVisitExists(siteVisitId, ctx.organizationId);

      if (!siteVisit.projectId) {
        throw new ValidationError('Site visit must have a project to create tasks');
      }
      if (!siteVisit.installerId) {
        throw new ValidationError('Site visit must have an installer to create tasks');
      }

      // For site visits, we need to find or create a job assignment
      // First, check if there's an existing job assignment linked to this site visit
      // For now, we'll create a placeholder job assignment
      const [existingJob] = await db
        .select({ id: jobAssignments.id })
        .from(jobAssignments)
        .where(
          and(
            eq(jobAssignments.organizationId, ctx.organizationId),
            // Link by customer - this is a temporary workaround
            // In the future, site visits should have a direct jobId column
            eq(jobAssignments.installerId, siteVisit.installerId)
          )
        )
        .limit(1);

      if (existingJob) {
        jobId = existingJob.id;
      } else {
        // Create a minimal job assignment for this site visit
        // Get project and customer info
        const [projectWithCustomer] = await db
          .select({
            customerId: projects.customerId,
            customerName: customers.name,
          })
          .from(projects)
          .leftJoin(customers, eq(projects.customerId, customers.id))
          .where(and(eq(projects.id, siteVisit.projectId), eq(projects.organizationId, ctx.organizationId)))
          .limit(1);

        // Generate a job number
        const jobNumber = `SV-${siteVisit.visitNumber}-${Date.now()}`;
        const title = `Site Visit ${siteVisit.visitNumber}${projectWithCustomer?.customerName ? ` - ${projectWithCustomer.customerName}` : ''}`;

        const customerIdForJob = projectWithCustomer?.customerId;
        if (!customerIdForJob) {
          throw new ValidationError('Project must have a customer to create tasks');
        }
        const [newJob] = await db
          .insert(jobAssignments)
          .values({
            organizationId: ctx.organizationId,
            customerId: customerIdForJob,
            installerId: siteVisit.installerId,
            title,
            jobNumber,
            jobType: 'installation',
            status: 'scheduled',
            scheduledDate: new Date().toISOString().split('T')[0],
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          })
          .returning();

        jobId = newJob.id;
        customerId = projectWithCustomer?.customerId;
      }
    } else if (data.jobId) {
      // Legacy model: Job assignment
      jobId = data.jobId;
      const job = await verifyJobExists(jobId, ctx.organizationId);
      customerId = job.customerId ?? undefined;
    } else if (data.projectId) {
      // Project-level task (no site visit)
      const project = await verifyProjectExists(data.projectId, ctx.organizationId);
      if (!project.customerId) {
        throw new ValidationError('Project must have a customer to create tasks');
      }
      jobId = await getOrCreateProjectPlaceholderJob(
        data.projectId,
        ctx.organizationId,
        {
          customerId: project.customerId,
          projectNumber: project.projectNumber ?? String(project.id.slice(0, 8)),
          title: project.title ?? 'Project',
        },
        ctx.user.id
      );
      siteVisitId = undefined;
      customerId = project.customerId;
    } else {
      throw new Error('Either jobId, siteVisitId, or projectId is required');
    }

    // Get next position
    const position = await getNextPosition(jobId, ctx.organizationId);

    // Verify jobId exists before insert
    const [jobCheck] = await db
      .select({ id: jobAssignments.id })
      .from(jobAssignments)
      .where(and(eq(jobAssignments.id, jobId), eq(jobAssignments.organizationId, ctx.organizationId)))
      .limit(1);

    if (!jobCheck) {
      throw new NotFoundError(`Job assignment not found: ${jobId}`);
    }

    // Insert task
    const [task] = await db
      .insert(jobTasks)
      .values({
        organizationId: ctx.organizationId,
        jobId,
        projectId: data.projectId ?? null,
        siteVisitId,
        title: data.title,
        description: data.description ?? null,
        assigneeId: data.assigneeId ?? null,
        dueDate: data.dueDate ?? null,
        estimatedHours: data.estimatedHours ?? null,
        status: data.status ?? 'pending',
        priority: data.priority ?? 'normal',
        workstreamId: data.workstreamId ?? null,
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
        customerId,
        taskId: task.id,
        taskTitle: task.title,
        jobAssignmentId: task.jobId,
        siteVisitId: task.siteVisitId ?? undefined,
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
    const job = await verifyJobExists(existingTask.jobId, ctx.organizationId);

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
    if (data.estimatedHours !== undefined) updateValues.estimatedHours = data.estimatedHours;
    if (data.workstreamId !== undefined) updateValues.workstreamId = data.workstreamId;

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
    const job = await verifyJobExists(existingTask.jobId, ctx.organizationId);

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
    await verifyJobExists(data.jobId, ctx.organizationId);

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

// ============================================================================
// GET PROJECT TASKS
// ============================================================================

import { z } from 'zod';

/**
 * Get tasks for a project (project-level tasks + tasks linked to site visits).
 */
export const getProjectTasks = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      projectId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    // Get all site visits for this project
    const visits = await db
      .select({ id: siteVisits.id })
      .from(siteVisits)
      .where(
        and(
          eq(siteVisits.projectId, data.projectId),
          eq(siteVisits.organizationId, ctx.organizationId)
        )
      );

    const visitIds = visits.map((v) => v.id);

    // Include tasks where projectId matches OR siteVisitId is in project's visits
    const rows = await db
      .select()
      .from(jobTasks)
      .where(
        and(
          eq(jobTasks.organizationId, ctx.organizationId),
          visitIds.length > 0
            ? or(
                eq(jobTasks.projectId, data.projectId),
                inArray(jobTasks.siteVisitId, visitIds)
              )
            : eq(jobTasks.projectId, data.projectId)
        )
      )
      .orderBy(asc(jobTasks.position));

    const toDateString = (d: Date | string): string =>
      d instanceof Date ? d.toISOString() : String(d);

    const tasks = rows.map((t) => ({
      ...t,
      createdAt: toDateString(t.createdAt),
      updatedAt: toDateString(t.updatedAt),
      dueDate: t.dueDate != null ? toDateString(t.dueDate) : null,
    }));

    return { tasks };
  });
