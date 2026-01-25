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
import { jobTasks, jobAssignments, customers, orders } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { z } from 'zod';

// ============================================================================
// SCHEMAS
// ============================================================================

export const listJobTasksForKanbanSchema = z.object({
  /** Optional status filter */
  status: z.enum(['pending', 'in_progress', 'completed', 'blocked']).optional(),
  /** Optional assignee filter */
  assigneeId: z.string().optional(),
  /** Optional priority filter */
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  /** Limit for performance (default 200) */
  limit: z.number().min(1).max(1000).default(200),
});

export type ListJobTasksForKanbanInput = z.infer<typeof listJobTasksForKanbanSchema>;

// ============================================================================
// TYPES
// ============================================================================

export interface KanbanTask {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  position: number;
  estimatedHours: number | null;
  actualHours: number | null;
  dueDate: Date | null;

  // Job assignment context
  jobAssignment: {
    id: string;
    jobNumber: string;
    type: string;
    scheduledDate: Date | null;
  };

  // Customer context
  customer: {
    id: string;
    name: string;
  } | null;

  // Assignee context
  assignee: {
    id: string;
    name: string;
    avatar?: string;
  } | null;

  // Metadata for UI enhancements
  metadata?: {
    comments: number;
    attachments: number;
    subtasks: number;
  };

  createdAt: Date;
  updatedAt: Date;
}

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
      .leftJoin(orders, eq(jobAssignments.orderId, orders.id))
      .leftJoin(customers, eq(orders.customerId, customers.id))
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
