/**
 * Job Calendar Server Functions
 *
 * Server-side functions for job scheduling calendar.
 * Provides listing, filtering, and rescheduling of job assignments.
 *
 * @see drizzle/schema/job-assignments.ts for database schema
 * @see src/lib/schemas/job-calendar.ts for validation schemas
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-005a/b
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, gte, lte, isNull, inArray, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { jobAssignments, users, customers } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import {
  listCalendarJobsSchema,
  rescheduleJobSchema,
  listUnscheduledJobsSchema,
  type CalendarJobEvent,
  type ListCalendarJobsResponse,
  type UnscheduledJob,
  type ListUnscheduledJobsResponse,
  type RescheduleJobResponse,
  type CalendarInstaller,
  type CalendarKanbanTask,
  type ListCalendarTasksForKanbanResponse,
} from '@/lib/schemas';
import { NotFoundError, ConflictError } from '@/lib/server/errors';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convert a job assignment row to a calendar event.
 */
function toCalendarEvent(
  job: typeof jobAssignments.$inferSelect,
  installer: { id: string; name: string | null; email: string },
  customer: { id: string; name: string }
): CalendarJobEvent {
  // Parse scheduled date and time
  const startDate = new Date(job.scheduledDate);
  if (job.scheduledTime) {
    const [hours, minutes] = job.scheduledTime.split(':').map(Number);
    startDate.setHours(hours, minutes, 0, 0);
  } else {
    // Default to 8 AM if no time specified
    startDate.setHours(8, 0, 0, 0);
  }

  // Calculate end time based on duration
  const durationMinutes = job.estimatedDuration ?? 120; // Default 2 hours
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  return {
    id: job.id,
    title: job.title,
    jobNumber: job.jobNumber,
    start: startDate,
    end: endDate,
    allDay: !job.scheduledTime,
    status: job.status,
    jobType: job.jobType,
    installer,
    customer,
    estimatedDuration: job.estimatedDuration,
  };
}

// ============================================================================
// LIST CALENDAR JOBS
// ============================================================================

/**
 * Get jobs for calendar view within a date range.
 */
export const listCalendarJobs = createServerFn({ method: 'GET' })
  .inputValidator(listCalendarJobsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Build where conditions
    const conditions = [
      eq(jobAssignments.organizationId, ctx.organizationId),
      gte(jobAssignments.scheduledDate, data.startDate),
      lte(jobAssignments.scheduledDate, data.endDate),
    ];

    // Filter by installers if specified
    if (data.installerIds && data.installerIds.length > 0) {
      conditions.push(inArray(jobAssignments.installerId, data.installerIds));
    }

    // Filter by statuses if specified
    if (data.statuses && data.statuses.length > 0) {
      conditions.push(inArray(jobAssignments.status, data.statuses));
    }

    // Query jobs with relations
    const jobs = await db
      .select({
        job: jobAssignments,
        installer: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        customer: {
          id: customers.id,
          name: customers.name,
        },
      })
      .from(jobAssignments)
      .innerJoin(users, eq(jobAssignments.installerId, users.id))
      .innerJoin(customers, eq(jobAssignments.customerId, customers.id))
      .where(and(...conditions))
      .limit(500);

    // Convert to calendar events
    const events: CalendarJobEvent[] = jobs.map((row) =>
      toCalendarEvent(row.job, row.installer, row.customer)
    );

    return {
      events,
      total: events.length,
    } satisfies ListCalendarJobsResponse;
  });

// ============================================================================
// LIST UNSCHEDULED JOBS
// ============================================================================

/**
 * Get unscheduled jobs for the sidebar.
 * These are jobs without a scheduledDate that can be dragged to the calendar.
 */
export const listUnscheduledJobs = createServerFn({ method: 'GET' })
  .inputValidator(listUnscheduledJobsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Get total count first
    const [countRow] = await db
      .select({ count: count() })
      .from(jobAssignments)
      .where(
        and(
          eq(jobAssignments.organizationId, ctx.organizationId),
          isNull(jobAssignments.scheduledDate)
        )
      );

    const total = countRow?.count ?? 0;

    // Query unscheduled jobs with pagination
    const jobs = await db
      .select({
        job: jobAssignments,
        customer: {
          id: customers.id,
          name: customers.name,
        },
      })
      .from(jobAssignments)
      .innerJoin(customers, eq(jobAssignments.customerId, customers.id))
      .where(
        and(
          eq(jobAssignments.organizationId, ctx.organizationId),
          isNull(jobAssignments.scheduledDate)
        )
      )
      .orderBy(jobAssignments.createdAt)
      .limit(data.limit)
      .offset(data.offset);

    const unscheduledJobs: UnscheduledJob[] = jobs.map((row) => ({
      id: row.job.id,
      jobNumber: row.job.jobNumber,
      title: row.job.title,
      jobType: row.job.jobType,
      customer: row.customer,
      estimatedDuration: row.job.estimatedDuration,
      createdAt: row.job.createdAt,
    }));

    return {
      jobs: unscheduledJobs,
      total,
      hasMore: data.offset + data.limit < total,
    } satisfies ListUnscheduledJobsResponse;
  });

// ============================================================================
// RESCHEDULE JOB
// ============================================================================

/**
 * Reschedule a job to a new date/time.
 */
export const rescheduleJob = createServerFn({ method: 'POST' })
  .inputValidator(rescheduleJobSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Wrap reschedule in transaction with optimistic locking
    const result = await db.transaction(async (tx) => {
      // Verify job exists and belongs to organization (with lock)
      const [existingJob] = await tx
        .select()
        .from(jobAssignments)
        .where(
          and(
            eq(jobAssignments.id, data.jobId),
            eq(jobAssignments.organizationId, ctx.organizationId)
          )
        )
        .for('update')
        .limit(1);

      if (!existingJob) {
        throw new NotFoundError('Job not found', 'jobAssignment');
      }

      // Update the job with new date/time (optimistic lock via version check)
      const [updatedJob] = await tx
        .update(jobAssignments)
        .set({
          scheduledDate: data.newDate,
          scheduledTime: data.newTime ?? null,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
          version: existingJob.version + 1,
        })
        .where(
          and(
            eq(jobAssignments.id, data.jobId),
            eq(jobAssignments.version, existingJob.version)
          )
        )
        .returning();

      if (!updatedJob) {
        throw new ConflictError('Job was modified by another user. Please refresh and try again.');
      }

      // Fetch installer and customer for response
      const [installer] = await tx
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, updatedJob.installerId))
        .limit(1);

      const [customer] = await tx
        .select({ id: customers.id, name: customers.name })
        .from(customers)
        .where(eq(customers.id, updatedJob.customerId))
        .limit(1);

      if (!installer || !customer) {
        throw new NotFoundError('Installer or customer not found', 'user');
      }

      return { updatedJob, installer, customer };
    });

    const event = toCalendarEvent(result.updatedJob, result.installer, result.customer);

    return {
      success: true,
      event,
    } satisfies RescheduleJobResponse;
  });

// ============================================================================
// LIST CALENDAR TASKS FOR KANBAN VIEW (Weekly)
// ============================================================================

/**
 * Get job tasks aggregated for weekly calendar kanban view.
 * Returns tasks grouped by time slots for calendar display.
 */
export const listCalendarTasksForKanban = createServerFn({ method: 'GET' })
  .inputValidator(listCalendarJobsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Build where conditions
    const conditions = [
      eq(jobAssignments.organizationId, ctx.organizationId),
      gte(jobAssignments.scheduledDate, data.startDate),
      lte(jobAssignments.scheduledDate, data.endDate),
    ];

    // Filter by installers if specified
    if (data.installerIds && data.installerIds.length > 0) {
      conditions.push(inArray(jobAssignments.installerId, data.installerIds));
    }

    // Filter by statuses if specified
    if (data.statuses && data.statuses.length > 0) {
      conditions.push(inArray(jobAssignments.status, data.statuses));
    }

    // Query job assignments with task details
    const jobs = await db
      .select({
        job: jobAssignments,
        installer: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        customer: {
          id: customers.id,
          name: customers.name,
        },
      })
      .from(jobAssignments)
      .innerJoin(users, eq(jobAssignments.installerId, users.id))
      .innerJoin(customers, eq(jobAssignments.customerId, customers.id))
      .where(and(...conditions))
      .orderBy(jobAssignments.scheduledDate, jobAssignments.scheduledTime)
      .limit(500);

    // Convert to calendar kanban tasks with time slot positioning
    const tasks: CalendarKanbanTask[] = jobs.map((row) => {
      const startDate = new Date(row.job.scheduledDate);
      if (row.job.scheduledTime) {
        const [hours, minutes] = row.job.scheduledTime.split(':').map(Number);
        startDate.setHours(hours, minutes, 0, 0);
      } else {
        // Default to 8 AM if no time specified
        startDate.setHours(8, 0, 0, 0);
      }

      const durationMinutes = row.job.estimatedDuration ?? 120; // Default 2 hours
      const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

      return {
        id: row.job.id,
        jobNumber: row.job.jobNumber,
        title: row.job.title,
        description: row.job.description,
        startTime: startDate,
        endTime: endDate,
        duration: durationMinutes,
        status: row.job.status,
        jobType: row.job.jobType,
        installer: row.installer,
        customer: row.customer,
        priority: 'medium', // Default priority - field doesn't exist on jobAssignments
        createdAt: row.job.createdAt,
        updatedAt: row.job.updatedAt,
      };
    });

    return {
      tasks,
      total: tasks.length,
    } satisfies ListCalendarTasksForKanbanResponse;
  });

// ============================================================================
// LIST INSTALLERS FOR FILTER
// ============================================================================

/**
 * Get all installers/technicians for the filter dropdown.
 */
export const listCalendarInstallers = createServerFn({ method: 'GET' }).handler(async () => {
  const ctx = await withAuth();

  // Get users who have been assigned jobs (technicians)
  const installers = await db
    .selectDistinct({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .innerJoin(
      jobAssignments,
      and(
        eq(users.id, jobAssignments.installerId),
        eq(jobAssignments.organizationId, ctx.organizationId)
      )
    )
    .orderBy(users.name);

  return {
    installers: installers as CalendarInstaller[],
  };
});
