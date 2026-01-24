/**
 * Job Time Entries Server Functions
 *
 * Server-side functions for job time tracking operations.
 * Supports both timer-based entries (start/stop) and manual entries.
 * All functions use withAuth for authentication and filter by organizationId.
 *
 * @see src/lib/schemas/job-time.ts for validation schemas
 * @see drizzle/schema/job-time-entries.ts for database schema
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-003b
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { jobTimeEntries, jobAssignments, users } from '@/../drizzle/schema';
import {
  startTimerSchema,
  stopTimerSchema,
  createManualEntrySchema,
  updateTimeEntrySchema,
  deleteTimeEntrySchema,
  getJobTimeEntriesSchema,
  calculateJobLaborCostSchema,
  getTimeEntrySchema,
  type TimeEntryResponse,
  type JobTimeSummary,
  type JobLaborCostSummary,
} from '@/lib/schemas';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { PERMISSIONS } from '@/lib/auth/permissions';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Verify job belongs to the user's organization.
 * Returns the job if found, throws NotFoundError otherwise.
 */
async function verifyJobAccess(jobId: string, organizationId: string) {
  const [job] = await db
    .select({ id: jobAssignments.id })
    .from(jobAssignments)
    .where(and(eq(jobAssignments.id, jobId), eq(jobAssignments.organizationId, organizationId)))
    .limit(1);

  if (!job) {
    throw new NotFoundError('Job not found');
  }

  return job;
}

/**
 * Verify time entry belongs to the user's organization.
 * Returns the entry if found, throws NotFoundError otherwise.
 */
async function verifyTimeEntryAccess(entryId: string, organizationId: string) {
  const [entry] = await db
    .select({
      id: jobTimeEntries.id,
      jobId: jobTimeEntries.jobId,
      userId: jobTimeEntries.userId,
      startTime: jobTimeEntries.startTime,
      endTime: jobTimeEntries.endTime,
    })
    .from(jobTimeEntries)
    .where(and(eq(jobTimeEntries.id, entryId), eq(jobTimeEntries.organizationId, organizationId)))
    .limit(1);

  if (!entry) {
    throw new NotFoundError('Time entry not found');
  }

  return entry;
}

/**
 * Calculate duration in minutes between two dates.
 * Returns null if endTime is null (timer still running).
 */
function calculateDurationMinutes(startTime: Date, endTime: Date | null): number | null {
  if (!endTime) return null;
  return Math.round((endTime.getTime() - startTime.getTime()) / 60000);
}

/**
 * Transform a raw time entry row to a TimeEntryResponse.
 */
function toTimeEntryResponse(row: {
  id: string;
  jobId: string;
  userId: string;
  startTime: Date;
  endTime: Date | null;
  description: string | null;
  isBillable: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  userName: string | null;
  userEmail: string;
}): TimeEntryResponse {
  return {
    id: row.id,
    jobId: row.jobId,
    userId: row.userId,
    startTime: row.startTime,
    endTime: row.endTime,
    description: row.description,
    isBillable: row.isBillable,
    durationMinutes: calculateDurationMinutes(row.startTime, row.endTime),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    user: {
      id: row.userId,
      fullName: row.userName,
      email: row.userEmail,
    },
  };
}

// ============================================================================
// START TIMER
// ============================================================================

/**
 * Start a timer for a job.
 * Creates a time entry with startTime set to now, endTime null.
 * The current user is recorded as the worker.
 */
export const startTimer = createServerFn({ method: 'POST' })
  .inputValidator(startTimerSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.update ?? 'customer.update',
    });

    // Verify job access
    await verifyJobAccess(data.jobId, ctx.organizationId);

    // Check if user already has a running timer on this job
    const [existingTimer] = await db
      .select({ id: jobTimeEntries.id })
      .from(jobTimeEntries)
      .where(
        and(
          eq(jobTimeEntries.jobId, data.jobId),
          eq(jobTimeEntries.userId, ctx.user.id),
          eq(jobTimeEntries.organizationId, ctx.organizationId),
          isNull(jobTimeEntries.endTime)
        )
      )
      .limit(1);

    if (existingTimer) {
      throw new ValidationError('You already have a running timer on this job');
    }

    // Create the time entry
    const [entry] = await db
      .insert(jobTimeEntries)
      .values({
        organizationId: ctx.organizationId,
        jobId: data.jobId,
        userId: ctx.user.id,
        startTime: new Date(),
        endTime: null,
        description: data.description ?? null,
        isBillable: data.isBillable ?? true,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    // Get user details for response
    const [user] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    return {
      entry: toTimeEntryResponse({
        ...entry,
        userName: user?.name ?? null,
        userEmail: user?.email ?? '',
      }),
    };
  });

// ============================================================================
// STOP TIMER
// ============================================================================

/**
 * Stop a running timer.
 * Sets the endTime on an existing entry.
 */
export const stopTimer = createServerFn({ method: 'POST' })
  .inputValidator(stopTimerSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.update ?? 'customer.update',
    });

    // Verify entry access
    const existingEntry = await verifyTimeEntryAccess(data.entryId, ctx.organizationId);

    // Check if timer is already stopped
    if (existingEntry.endTime) {
      throw new ValidationError('Timer is not running');
    }

    // Update the entry
    const [entry] = await db
      .update(jobTimeEntries)
      .set({
        endTime: new Date(),
        updatedAt: new Date(),
        updatedBy: ctx.user.id,
        version: sql`${jobTimeEntries.version} + 1`,
      })
      .where(eq(jobTimeEntries.id, data.entryId))
      .returning();

    // Get user details for response
    const [user] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, entry.userId))
      .limit(1);

    return {
      entry: toTimeEntryResponse({
        ...entry,
        userName: user?.name ?? null,
        userEmail: user?.email ?? '',
      }),
    };
  });

// ============================================================================
// CREATE MANUAL ENTRY
// ============================================================================

/**
 * Create a manual time entry with both start and end times.
 */
export const createManualEntry = createServerFn({ method: 'POST' })
  .inputValidator(createManualEntrySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.update ?? 'customer.update',
    });

    // Verify job access
    await verifyJobAccess(data.jobId, ctx.organizationId);

    // Create the time entry
    const [entry] = await db
      .insert(jobTimeEntries)
      .values({
        organizationId: ctx.organizationId,
        jobId: data.jobId,
        userId: ctx.user.id,
        startTime: data.startTime,
        endTime: data.endTime,
        description: data.description ?? null,
        isBillable: data.isBillable ?? true,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    // Get user details for response
    const [user] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    return {
      entry: toTimeEntryResponse({
        ...entry,
        userName: user?.name ?? null,
        userEmail: user?.email ?? '',
      }),
    };
  });

// ============================================================================
// UPDATE TIME ENTRY
// ============================================================================

/**
 * Update a time entry.
 * Can update description, billable flag, or times.
 */
export const updateTimeEntry = createServerFn({ method: 'POST' })
  .inputValidator(updateTimeEntrySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.update ?? 'customer.update',
    });

    // Verify entry access
    await verifyTimeEntryAccess(data.entryId, ctx.organizationId);

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: ctx.user.id,
      version: sql`${jobTimeEntries.version} + 1`,
    };

    if (data.startTime !== undefined) {
      updateData.startTime = data.startTime;
    }
    if (data.endTime !== undefined) {
      updateData.endTime = data.endTime;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.isBillable !== undefined) {
      updateData.isBillable = data.isBillable;
    }

    // Update the entry
    const [entry] = await db
      .update(jobTimeEntries)
      .set(updateData)
      .where(eq(jobTimeEntries.id, data.entryId))
      .returning();

    // Get user details for response
    const [user] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, entry.userId))
      .limit(1);

    return {
      entry: toTimeEntryResponse({
        ...entry,
        userName: user?.name ?? null,
        userEmail: user?.email ?? '',
      }),
    };
  });

// ============================================================================
// DELETE TIME ENTRY
// ============================================================================

/**
 * Delete a time entry.
 */
export const deleteTimeEntry = createServerFn({ method: 'POST' })
  .inputValidator(deleteTimeEntrySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.delete ?? 'customer.delete',
    });

    // Verify entry access
    await verifyTimeEntryAccess(data.entryId, ctx.organizationId);

    // Delete the entry
    await db.delete(jobTimeEntries).where(eq(jobTimeEntries.id, data.entryId));

    return { success: true };
  });

// ============================================================================
// GET JOB TIME ENTRIES
// ============================================================================

/**
 * Get all time entries for a job with user details and summary.
 */
export const getJobTimeEntries = createServerFn({ method: 'GET' })
  .inputValidator(getJobTimeEntriesSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.read ?? 'customer.read',
    });

    // Verify job access
    await verifyJobAccess(data.jobId, ctx.organizationId);

    // Get entries with user details
    const entries = await db
      .select({
        id: jobTimeEntries.id,
        jobId: jobTimeEntries.jobId,
        userId: jobTimeEntries.userId,
        startTime: jobTimeEntries.startTime,
        endTime: jobTimeEntries.endTime,
        description: jobTimeEntries.description,
        isBillable: jobTimeEntries.isBillable,
        createdAt: jobTimeEntries.createdAt,
        updatedAt: jobTimeEntries.updatedAt,
        createdBy: jobTimeEntries.createdBy,
        updatedBy: jobTimeEntries.updatedBy,
        userName: users.name,
        userEmail: users.email,
      })
      .from(jobTimeEntries)
      .leftJoin(users, eq(jobTimeEntries.userId, users.id))
      .where(
        and(
          eq(jobTimeEntries.jobId, data.jobId),
          eq(jobTimeEntries.organizationId, ctx.organizationId)
        )
      )
      .orderBy(jobTimeEntries.startTime);

    // Calculate summary
    let totalMinutes = 0;
    let billableMinutes = 0;
    let nonBillableMinutes = 0;
    let activeTimers = 0;

    const responseEntries: TimeEntryResponse[] = entries.map((e) => {
      const duration = calculateDurationMinutes(e.startTime, e.endTime);

      if (e.endTime === null) {
        activeTimers++;
      } else if (duration !== null) {
        totalMinutes += duration;
        if (e.isBillable) {
          billableMinutes += duration;
        } else {
          nonBillableMinutes += duration;
        }
      }

      return toTimeEntryResponse({
        ...e,
        userName: e.userName,
        userEmail: e.userEmail ?? '',
      });
    });

    const summary: JobTimeSummary = {
      totalMinutes,
      billableMinutes,
      nonBillableMinutes,
      activeTimers,
      entries: responseEntries,
    };

    return summary;
  });

// ============================================================================
// CALCULATE JOB LABOR COST
// ============================================================================

/**
 * Calculate total labor cost for a job based on hours worked and hourly rate.
 */
export const calculateJobLaborCost = createServerFn({ method: 'GET' })
  .inputValidator(calculateJobLaborCostSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.read ?? 'customer.read',
    });

    // Verify job access
    await verifyJobAccess(data.jobId, ctx.organizationId);

    // Get completed entries (with endTime)
    const entries = await db
      .select({
        startTime: jobTimeEntries.startTime,
        endTime: jobTimeEntries.endTime,
        isBillable: jobTimeEntries.isBillable,
      })
      .from(jobTimeEntries)
      .where(
        and(
          eq(jobTimeEntries.jobId, data.jobId),
          eq(jobTimeEntries.organizationId, ctx.organizationId)
        )
      );

    let totalMinutes = 0;
    let billableMinutes = 0;

    for (const entry of entries) {
      const duration = calculateDurationMinutes(entry.startTime, entry.endTime);
      if (duration !== null) {
        totalMinutes += duration;
        if (entry.isBillable) {
          billableMinutes += duration;
        }
      }
    }

    const totalHours = totalMinutes / 60;
    const billableHours = billableMinutes / 60;
    const nonBillableHours = (totalMinutes - billableMinutes) / 60;

    const summary: JobLaborCostSummary = {
      totalHours: Number(totalHours.toFixed(2)),
      billableHours: Number(billableHours.toFixed(2)),
      nonBillableHours: Number(nonBillableHours.toFixed(2)),
      hourlyRate: data.hourlyRate,
      totalCost: Number((totalHours * data.hourlyRate).toFixed(2)),
      billableCost: Number((billableHours * data.hourlyRate).toFixed(2)),
    };

    return summary;
  });

// ============================================================================
// GET TIME ENTRY
// ============================================================================

/**
 * Get a single time entry by ID.
 */
export const getTimeEntry = createServerFn({ method: 'GET' })
  .inputValidator(getTimeEntrySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.read ?? 'customer.read',
    });

    // Get entry with user details
    const [entry] = await db
      .select({
        id: jobTimeEntries.id,
        jobId: jobTimeEntries.jobId,
        userId: jobTimeEntries.userId,
        startTime: jobTimeEntries.startTime,
        endTime: jobTimeEntries.endTime,
        description: jobTimeEntries.description,
        isBillable: jobTimeEntries.isBillable,
        createdAt: jobTimeEntries.createdAt,
        updatedAt: jobTimeEntries.updatedAt,
        createdBy: jobTimeEntries.createdBy,
        updatedBy: jobTimeEntries.updatedBy,
        userName: users.name,
        userEmail: users.email,
      })
      .from(jobTimeEntries)
      .leftJoin(users, eq(jobTimeEntries.userId, users.id))
      .where(
        and(
          eq(jobTimeEntries.id, data.entryId),
          eq(jobTimeEntries.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!entry) {
      throw new NotFoundError('Time entry not found');
    }

    return {
      entry: toTimeEntryResponse({
        ...entry,
        userName: entry.userName,
        userEmail: entry.userEmail ?? '',
      }),
    };
  });
