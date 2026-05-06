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
import { eq, and, isNull, sql, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import { jobAssignments, jobTimeEntries, projects, users } from 'drizzle/schema';
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

interface ProjectTimeTrackingProject {
  id: string;
  customerId: string;
  projectNumber: string;
  title: string;
}

interface TimeTrackingScope {
  jobId: string | null;
  projectId: string | null;
}

const emptyJobTimeSummary: JobTimeSummary = {
  totalMinutes: 0,
  billableMinutes: 0,
  nonBillableMinutes: 0,
  activeTimers: 0,
  entries: [],
};

async function verifyProjectExists(
  projectId: string,
  organizationId: string
): Promise<ProjectTimeTrackingProject> {
  const [project] = await db
    .select({
      id: projects.id,
      customerId: projects.customerId,
      projectNumber: projects.projectNumber,
      title: projects.title,
    })
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.organizationId, organizationId),
        isNull(projects.deletedAt)
      )
    )
    .limit(1);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  return project;
}

async function findProjectTimeTrackingJob(projectId: string, organizationId: string) {
  const [job] = await db
    .select({
      id: jobAssignments.id,
      customerId: jobAssignments.customerId,
      migratedToProjectId: jobAssignments.migratedToProjectId,
    })
    .from(jobAssignments)
    .where(
      and(
        eq(jobAssignments.organizationId, organizationId),
        eq(jobAssignments.migratedToProjectId, projectId)
      )
    )
    .limit(1);

  return job ?? null;
}

async function getOrCreateProjectTimeTrackingJob(
  project: ProjectTimeTrackingProject,
  organizationId: string,
  userId: string
): Promise<string> {
  return db.transaction(async (tx) => {
    const [lockedProject] = await tx
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.id, project.id),
          eq(projects.organizationId, organizationId),
          isNull(projects.deletedAt)
        )
      )
      .limit(1)
      .for('update');

    if (!lockedProject) {
      throw new NotFoundError('Project not found');
    }

    const [existing] = await tx
      .select({ id: jobAssignments.id })
      .from(jobAssignments)
      .where(
        and(
          eq(jobAssignments.organizationId, organizationId),
          eq(jobAssignments.migratedToProjectId, project.id)
        )
      )
      .limit(1);

    if (existing) return existing.id;

    const [newJob] = await tx
      .insert(jobAssignments)
      .values({
        organizationId,
        customerId: project.customerId,
        installerId: userId,
        title: project.title,
        jobNumber: `PRJ-${project.projectNumber}`,
        jobType: 'installation',
        status: 'scheduled',
        scheduledDate: new Date().toISOString().split('T')[0],
        migratedToProjectId: project.id,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning({ id: jobAssignments.id });

    return newJob.id;
  });
}

async function verifyJobTimeTrackingJob(jobId: string, organizationId: string) {
  const [job] = await db
    .select({
      id: jobAssignments.id,
      customerId: jobAssignments.customerId,
      migratedToProjectId: jobAssignments.migratedToProjectId,
    })
    .from(jobAssignments)
    .where(and(eq(jobAssignments.id, jobId), eq(jobAssignments.organizationId, organizationId)))
    .limit(1);

  if (!job) {
    throw new NotFoundError('Job not found');
  }

  return job;
}

async function resolveTimeTrackingScope(
  input: { jobId?: string; projectId?: string },
  organizationId: string,
  userId: string,
  options: { createProjectJob?: boolean } = {}
): Promise<TimeTrackingScope> {
  if (input.jobId) {
    const job = await verifyJobTimeTrackingJob(input.jobId, organizationId);

    if (input.projectId) {
      const project = await verifyProjectExists(input.projectId, organizationId);

      if (project.customerId !== job.customerId) {
        throw new ValidationError('Job customer does not match project customer');
      }

      if (job.migratedToProjectId && job.migratedToProjectId !== project.id) {
        throw new ValidationError('Job is not linked to this project');
      }
    }

    return {
      jobId: job.id,
      projectId: input.projectId ?? job.migratedToProjectId ?? null,
    };
  }

  if (input.projectId) {
    const project = await verifyProjectExists(input.projectId, organizationId);
    const existingJob = await findProjectTimeTrackingJob(project.id, organizationId);

    if (existingJob) {
      return { jobId: existingJob.id, projectId: project.id };
    }

    if (options.createProjectJob) {
      const jobId = await getOrCreateProjectTimeTrackingJob(project, organizationId, userId);
      return { jobId, projectId: project.id };
    }

    return { jobId: null, projectId: project.id };
  }

  throw new ValidationError('A job or project is required for time tracking');
}

function buildTimeEntryAccessPredicate(
  entryId: string,
  organizationId: string,
  scope?: TimeTrackingScope
): SQL | undefined {
  const predicates = [
    eq(jobTimeEntries.id, entryId),
    eq(jobTimeEntries.organizationId, organizationId),
  ];

  if (scope?.jobId) {
    predicates.push(eq(jobTimeEntries.jobId, scope.jobId));
  }

  return and(...predicates);
}

/**
 * Verify time entry belongs to the user's organization.
 * Returns the entry if found, throws NotFoundError otherwise.
 */
async function verifyTimeEntryAccess(
  entryId: string,
  organizationId: string,
  scope?: TimeTrackingScope
) {
  const [entry] = await db
    .select({
      id: jobTimeEntries.id,
      jobId: jobTimeEntries.jobId,
      projectId: jobTimeEntries.projectId,
      siteVisitId: jobTimeEntries.siteVisitId,
      userId: jobTimeEntries.userId,
      startTime: jobTimeEntries.startTime,
      endTime: jobTimeEntries.endTime,
    })
    .from(jobTimeEntries)
    .where(buildTimeEntryAccessPredicate(entryId, organizationId, scope))
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
  projectId: string | null;
  siteVisitId: string | null;
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
    projectId: row.projectId,
    siteVisitId: row.siteVisitId,
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

    const scope = await resolveTimeTrackingScope(data, ctx.organizationId, ctx.user.id, {
      createProjectJob: true,
    });

    if (!scope.jobId) {
      throw new NotFoundError('Time tracking job not found');
    }
    const jobId = scope.jobId;
    const projectId = scope.projectId;

    // Wrap check-then-insert in transaction with row lock to prevent duplicate timers
    const result = await db.transaction(async (tx) => {
      // Check if user already has a running timer on this job (with row lock)
      const [existingTimer] = await tx
        .select({ id: jobTimeEntries.id })
        .from(jobTimeEntries)
        .where(
          and(
            eq(jobTimeEntries.jobId, jobId),
            eq(jobTimeEntries.userId, ctx.user.id),
            eq(jobTimeEntries.organizationId, ctx.organizationId),
            isNull(jobTimeEntries.endTime)
          )
        )
        .limit(1)
        .for('update');

      if (existingTimer) {
        throw new ValidationError('You already have a running timer on this job');
      }

      // Create the time entry
      const [entry] = await tx
        .insert(jobTimeEntries)
        .values({
          organizationId: ctx.organizationId,
          jobId,
          projectId,
          userId: ctx.user.id,
          startTime: new Date(),
          endTime: null,
          description: data.description ?? null,
          isBillable: data.isBillable ?? true,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();

      return entry;
    });

    // Get user details for response
    const [user] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    return {
      entry: toTimeEntryResponse({
        ...result,
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

    const scope =
      data.jobId || data.projectId
        ? await resolveTimeTrackingScope(data, ctx.organizationId, ctx.user.id)
        : undefined;

    if (data.projectId && scope?.jobId === null) {
      throw new NotFoundError('Time entry not found');
    }

    // Verify entry access
    const existingEntry = await verifyTimeEntryAccess(data.entryId, ctx.organizationId, scope);

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
      .where(buildTimeEntryAccessPredicate(data.entryId, ctx.organizationId, scope))
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

    const scope = await resolveTimeTrackingScope(data, ctx.organizationId, ctx.user.id, {
      createProjectJob: true,
    });

    if (!scope.jobId) {
      throw new NotFoundError('Time tracking job not found');
    }
    const jobId = scope.jobId;
    const projectId = scope.projectId;

    // Create the time entry
    const [entry] = await db
      .insert(jobTimeEntries)
      .values({
        organizationId: ctx.organizationId,
        jobId,
        projectId,
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

    const scope =
      data.jobId || data.projectId
        ? await resolveTimeTrackingScope(data, ctx.organizationId, ctx.user.id)
        : undefined;

    if (data.projectId && scope?.jobId === null) {
      throw new NotFoundError('Time entry not found');
    }

    // Verify entry access
    await verifyTimeEntryAccess(data.entryId, ctx.organizationId, scope);

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
      .where(buildTimeEntryAccessPredicate(data.entryId, ctx.organizationId, scope))
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

    const scope =
      data.jobId || data.projectId
        ? await resolveTimeTrackingScope(data, ctx.organizationId, ctx.user.id)
        : undefined;

    if (data.projectId && scope?.jobId === null) {
      throw new NotFoundError('Time entry not found');
    }

    // Verify entry access
    await verifyTimeEntryAccess(data.entryId, ctx.organizationId, scope);

    // Delete the entry
    await db
      .delete(jobTimeEntries)
      .where(buildTimeEntryAccessPredicate(data.entryId, ctx.organizationId, scope));

    return { success: true };
  });

// ============================================================================
// GET JOB TIME ENTRIES
// ============================================================================

/**
 * Get all time entries for a job with user details and summary.
 */
export const getJobTimeEntries = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(getJobTimeEntriesSchema))
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.read ?? 'customer.read',
    });

    const scope = await resolveTimeTrackingScope(data, ctx.organizationId, ctx.user.id);

    if (!scope.jobId) {
      return emptyJobTimeSummary;
    }

    // Get entries with user details
    const entries = await db
      .select({
        id: jobTimeEntries.id,
        jobId: jobTimeEntries.jobId,
        projectId: jobTimeEntries.projectId,
        siteVisitId: jobTimeEntries.siteVisitId,
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
          eq(jobTimeEntries.jobId, scope.jobId),
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
  .inputValidator(normalizeObjectInput(calculateJobLaborCostSchema))
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.read ?? 'customer.read',
    });

    const scope = await resolveTimeTrackingScope(data, ctx.organizationId, ctx.user.id);

    if (!scope.jobId) {
      return {
        totalHours: 0,
        billableHours: 0,
        nonBillableHours: 0,
        hourlyRate: data.hourlyRate,
        totalCost: 0,
        billableCost: 0,
      } satisfies JobLaborCostSummary;
    }

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
          eq(jobTimeEntries.jobId, scope.jobId),
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
  .inputValidator(normalizeObjectInput(getTimeEntrySchema))
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.read ?? 'customer.read',
    });

    const scope =
      data.jobId || data.projectId
        ? await resolveTimeTrackingScope(data, ctx.organizationId, ctx.user.id)
        : undefined;

    if (data.projectId && scope?.jobId === null) {
      throw new NotFoundError('Time entry not found');
    }

    // Get entry with user details
    const [entry] = await db
      .select({
        id: jobTimeEntries.id,
        jobId: jobTimeEntries.jobId,
        projectId: jobTimeEntries.projectId,
        siteVisitId: jobTimeEntries.siteVisitId,
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
        buildTimeEntryAccessPredicate(data.entryId, ctx.organizationId, scope)
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
