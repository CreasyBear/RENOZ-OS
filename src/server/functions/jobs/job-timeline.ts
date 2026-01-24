/**
 * Jobs Timeline Server Functions
 *
 * Server-side functions for jobs timeline view.
 * Provides timeline-specific data aggregation for project visualization
 * across multiple days/weeks.
 *
 * @see src/lib/schemas/jobs/job-timeline.ts for validation schemas
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-005d
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, gte, lte, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { jobAssignments, users, customers } from '@/../drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import {
  listTimelineJobsSchema,
  type TimelineJobItem,
  type ListTimelineJobsResponse,
} from '@/lib/schemas/jobs/job-timeline';

// ============================================================================
// TIMELINE DATA AGGREGATION
// ============================================================================

/**
 * Calculate timeline span for a job assignment.
 * Determines start and end positions for timeline visualization.
 */
function calculateTimelineSpan(
  job: typeof jobAssignments.$inferSelect,
  weekStart: Date,
  weekEnd: Date
): { startIndex: number; endIndex: number; spanDays: number; isPartial: boolean } {
  const jobStart =
    typeof job.scheduledDate === 'string' ? new Date(job.scheduledDate) : job.scheduledDate;
  const estimatedDuration = job.estimatedDuration ?? 120; // Default 2 hours

  // Calculate job end date based on duration
  const jobEnd = new Date(jobStart);
  jobEnd.setMinutes(jobStart.getMinutes() + estimatedDuration);

  // Calculate timeline positions relative to week
  const weekStartTime = weekStart.getTime();
  // const weekEndTime = weekEnd.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  let startIndex = 0;
  let endIndex = 6; // Default to full week
  let isPartial = false;

  // If job starts before week, start from beginning
  if (jobStart < weekStart) {
    startIndex = 0;
    isPartial = true;
  } else {
    startIndex = Math.floor((jobStart.getTime() - weekStartTime) / dayMs);
    startIndex = Math.max(0, Math.min(6, startIndex));
  }

  // If job ends after week, end at week end
  if (jobEnd > weekEnd) {
    endIndex = 6;
    isPartial = true;
  } else {
    endIndex = Math.floor((jobEnd.getTime() - weekStartTime) / dayMs);
    endIndex = Math.max(0, Math.min(6, endIndex));
  }

  const spanDays = Math.max(1, endIndex - startIndex + 1);

  return {
    startIndex,
    endIndex,
    spanDays,
    isPartial,
  };
}

// ============================================================================
// LIST TIMELINE JOBS
// ============================================================================

/**
 * Get jobs for timeline view within a date range.
 * Returns jobs with timeline span calculations for visualization.
 */
export const listTimelineJobs = createServerFn({ method: 'GET' })
  .inputValidator(listTimelineJobsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Calculate week boundaries
    const weekStart = new Date(data.startDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

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
      .orderBy(jobAssignments.scheduledDate, jobAssignments.scheduledTime);

    // Convert to timeline items with span calculations
    const timelineItems: TimelineJobItem[] = jobs.map((row) => {
      const span = calculateTimelineSpan(row.job, weekStart, weekEnd);

      const startDate =
        typeof row.job.scheduledDate === 'string'
          ? new Date(row.job.scheduledDate)
          : row.job.scheduledDate;
      return {
        id: row.job.id,
        jobNumber: row.job.jobNumber,
        title: row.job.title,
        description: row.job.description,
        startDate: startDate,
        endDate: new Date(startDate.getTime() + (row.job.estimatedDuration ?? 120) * 60 * 1000),
        duration: row.job.estimatedDuration ?? 120,
        status: row.job.status,
        jobType: row.job.jobType,
        priority: 'medium', // TODO: Add priority field to jobAssignments table
        installer: row.installer,
        customer: row.customer,
        timelineSpan: span,
        createdAt: row.job.createdAt,
        updatedAt: row.job.updatedAt,
      };
    });

    return {
      items: timelineItems,
      total: timelineItems.length,
      weekStart: data.startDate,
      weekEnd: data.endDate,
    } satisfies ListTimelineJobsResponse;
  });

// ============================================================================
// TIMELINE STATISTICS
// ============================================================================

/**
 * Get timeline statistics for a date range.
 */
export const getTimelineStats = createServerFn({ method: 'GET' })
  .inputValidator(listTimelineJobsSchema)
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

    // Get statistics
    const stats = await db
      .select({
        status: jobAssignments.status,
        count: sql<number>`count(*)`,
        totalDuration: sql<number>`sum(coalesce(${jobAssignments.estimatedDuration}, 120))`,
      })
      .from(jobAssignments)
      .where(and(...conditions))
      .groupBy(jobAssignments.status);

    return {
      stats: stats.map((stat) => ({
        status: stat.status,
        count: Number(stat.count),
        totalHours: Math.round((Number(stat.totalDuration) / 60) * 100) / 100,
      })),
    };
  });
