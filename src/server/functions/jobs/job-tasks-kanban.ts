/**
 * Job Tasks Kanban Server Functions
 *
 * Server-side functions for job tasks kanban board.
 * Aggregates tasks across all job assignments for high-level workflow visibility.
 *
 * @see src/server/functions/jobs/job-tasks.ts for individual job task functions
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-005c
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, inArray, asc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { jobTasks, jobAssignments, customers } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { MyTaskKanban } from '@/lib/schemas/jobs/job-tasks';
import {
  listJobTasksForKanbanSchema,
  getMyTasksForKanbanSchema,
  type KanbanTask,
} from '@/lib/schemas/jobs/job-tasks-kanban';

// Re-export for hook consumers
export type { KanbanTask, ListJobTasksForKanbanInput, GetMyTasksForKanbanInput } from '@/lib/schemas/jobs/job-tasks-kanban';

// ============================================================================
// LIST JOB TASKS FOR KANBAN
// ============================================================================

/**
 * Get all job tasks across all job assignments for kanban board.
 * Aggregates tasks with job assignment and customer context for overview.
 */
export const listJobTasksForKanban = createServerFn({ method: 'GET' })
  .inputValidator(listJobTasksForKanbanSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.read ?? 'customer.read',
    });

    // Build where conditions
    const conditions = [eq(jobTasks.organizationId, ctx.organizationId)];

    if (data.status) {
      conditions.push(eq(jobTasks.status, data.status));
    }

    if (data.priority) {
      conditions.push(eq(jobTasks.priority, data.priority));
    }

    if (data.assigneeId) {
      conditions.push(eq(jobTasks.assigneeId, data.assigneeId));
    }

    // Query tasks with all necessary joins
    const tasks = await db
      .select({
        // Task fields
        id: jobTasks.id,
        title: jobTasks.title,
        description: jobTasks.description,
        status: jobTasks.status,
        priority: jobTasks.priority,
        position: jobTasks.position,
        estimatedHours: jobTasks.estimatedHours,
        actualHours: jobTasks.actualHours,
        dueDate: jobTasks.dueDate,
        createdAt: jobTasks.createdAt,
        updatedAt: jobTasks.updatedAt,

        // Job assignment fields
        jobId: jobTasks.jobId,
        jobNumber: jobAssignments.jobNumber,
        jobType: jobAssignments.jobType,
        scheduledDate: jobAssignments.scheduledDate,

        // Customer fields
        customerId: customers.id,
        customerName: customers.name,

        // Assignee fields (users table)
        assigneeId: jobTasks.assigneeId,
      })
      .from(jobTasks)
      .innerJoin(jobAssignments, eq(jobTasks.jobId, jobAssignments.id))
      .leftJoin(customers, eq(jobAssignments.customerId, customers.id))
      .where(and(...conditions))
      .orderBy(asc(jobTasks.position))
      .limit(data.limit);

    // Get assignee information separately (we need to join with users table)
    const assigneeIds = tasks.map((t) => t.assigneeId).filter((id): id is string => id !== null);

    let assignees: Record<string, { id: string; name: string; avatar?: string }> = {};
    if (assigneeIds.length > 0) {
      const { users } = await import('drizzle/schema');
      const assigneeData = await db
        .select({
          id: users.id,
          name: users.name,
          // Extract avatarUrl from JSONB profile field
          avatarUrl: sql<string | null>`${users.profile}->>'avatarUrl'`,
        })
        .from(users)
        .where(inArray(users.id, assigneeIds));

      assignees = Object.fromEntries(
        assigneeData.map((a) => [
          a.id,
          {
            id: a.id,
            name: a.name || '',
            ...(a.avatarUrl ? { avatar: a.avatarUrl } : {})
          }
        ])
      );
    }

    // Transform to kanban format (converting date strings to Date objects)
    const kanbanTasks: KanbanTask[] = tasks.map((task) => ({
      id: task.id as string,
      title: task.title as string,
      description: task.description as string | null,
      status: task.status as KanbanTask['status'],
      priority: task.priority as KanbanTask['priority'],
      position: task.position as number,
      estimatedHours: task.estimatedHours as number | null,
      actualHours: task.actualHours as number | null,
      dueDate: task.dueDate ? (typeof task.dueDate === 'string' ? new Date(task.dueDate) : task.dueDate) : null,
      createdAt: new Date(task.createdAt as string | Date),
      updatedAt: new Date(task.updatedAt as string | Date),

      jobAssignment: {
        id: task.jobId as string,
        jobNumber: task.jobNumber as string,
        type: task.jobType as string,
        scheduledDate: task.scheduledDate ? new Date(task.scheduledDate as string) : null,
      },

      customer: task.customerId
        ? {
            id: task.customerId as string,
            name: task.customerName as string,
          }
        : null,

      assignee: task.assigneeId ? assignees[task.assigneeId as string] || null : null,
    }));

    return {
      tasks: kanbanTasks,
      total: kanbanTasks.length,
    };
  });

// ============================================================================
// MY TASKS FOR KANBAN (CROSS-PROJECT)
// ============================================================================

/**
 * Get current user's tasks across all projects for kanban board.
 * Used by /my-tasks route for cross-project task view.
 */
export const getMyTasksForKanban = createServerFn({ method: 'GET' })
  .inputValidator(getMyTasksForKanbanSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.read ?? 'customer.read',
    });

    const { siteVisits, projects, projectWorkstreams } = await import('drizzle/schema');

    // Build where conditions - always filter by current user
    const conditions = [
      eq(jobTasks.organizationId, ctx.organizationId),
      eq(jobTasks.assigneeId, ctx.user.id),
    ];

    if (data.status) {
      conditions.push(eq(jobTasks.status, data.status));
    }

    if (data.priority) {
      conditions.push(eq(jobTasks.priority, data.priority));
    }

    // If projectId filter provided, add it
    if (data.projectId) {
      conditions.push(eq(siteVisits.projectId, data.projectId));
    }

    // Query tasks with project and site visit context
    const tasks = await db
      .select({
        // Task fields
        id: jobTasks.id,
        title: jobTasks.title,
        description: jobTasks.description,
        status: jobTasks.status,
        priority: jobTasks.priority,
        position: jobTasks.position,
        estimatedHours: jobTasks.estimatedHours,
        actualHours: jobTasks.actualHours,
        dueDate: jobTasks.dueDate,
        workstreamId: jobTasks.workstreamId,
        createdAt: jobTasks.createdAt,
        updatedAt: jobTasks.updatedAt,
        siteVisitId: jobTasks.siteVisitId,

        // Project fields
        projectId: projects.id,
        projectNumber: projects.projectNumber,
        projectTitle: projects.title,
        projectStatus: projects.status,

        // Site visit fields
        siteVisitNumber: siteVisits.visitNumber,
        siteVisitType: siteVisits.visitType,
        scheduledDate: siteVisits.scheduledDate,

        // Customer fields
        customerId: projects.customerId,
        customerName: customers.name,
      })
      .from(jobTasks)
      .innerJoin(siteVisits, eq(jobTasks.siteVisitId, siteVisits.id))
      .innerJoin(projects, eq(siteVisits.projectId, projects.id))
      .leftJoin(customers, eq(projects.customerId, customers.id))
      .where(and(...conditions))
      .orderBy(asc(jobTasks.dueDate), asc(jobTasks.position))
      .limit(data.limit);

    // Get workstream names
    const workstreamIds = tasks.map((t) => t.workstreamId).filter((id): id is string => id !== null);
    let workstreamMap: Record<string, string> = {};
    if (workstreamIds.length > 0) {
      const workstreamData = await db
        .select({
          id: projectWorkstreams.id,
          name: projectWorkstreams.name,
        })
        .from(projectWorkstreams)
        .where(inArray(projectWorkstreams.id, workstreamIds));

      workstreamMap = Object.fromEntries(workstreamData.map((w) => [w.id, w.name]));
    }

    // Transform to MyTaskKanban format
    const myTasks: MyTaskKanban[] = tasks.map((task) => ({
      id: task.id as string,
      title: task.title as string,
      description: task.description as string | null,
      status: task.status as MyTaskKanban['status'],
      priority: task.priority as MyTaskKanban['priority'],
      position: task.position as number,
      estimatedHours: task.estimatedHours as number | null,
      actualHours: task.actualHours as number | null,
      dueDate: task.dueDate ? new Date(task.dueDate as string | Date) : null,
      workstreamId: task.workstreamId as string | null,
      workstreamName: task.workstreamId ? (workstreamMap[task.workstreamId as string] ?? null) : null,
      createdAt: new Date(task.createdAt as string | Date),
      updatedAt: new Date(task.updatedAt as string | Date),

      project: {
        id: task.projectId as string,
        projectNumber: task.projectNumber as string,
        title: task.projectTitle as string,
        status: task.projectStatus as string,
      },

      siteVisit: task.siteVisitId
        ? {
            id: task.siteVisitId as string,
            scheduledDate: task.scheduledDate ? new Date(task.scheduledDate as string | Date) : null,
            visitNumber: task.siteVisitNumber as string,
            visitType: task.siteVisitType as string,
          }
        : null,

      customer: task.customerId
        ? {
            id: task.customerId as string,
            name: task.customerName as string,
          }
        : null,
    }));

    return {
      tasks: myTasks,
      total: myTasks.length,
    };
  });
