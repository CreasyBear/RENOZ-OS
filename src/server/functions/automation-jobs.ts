/**
 * Automation Job Server Functions
 *
 * Server-side functions for tracking background job progress.
 * Used by Trigger.dev tasks to report progress and by the UI to display status.
 *
 * SECURITY:
 * - User-facing functions use withAuth for authentication
 * - Internal functions (for Trigger.dev) are prefixed with `internal` and
 *   should only be called from server-side Trigger.dev tasks
 *
 * @see drizzle/schema/automation-jobs.ts for database schema
 * @see src/lib/schemas/automation-jobs.ts for validation schemas
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { jobs, notifications, type JobMetadata } from 'drizzle/schema';
import {
  createJobSchema,
  updateJobProgressSchema,
  completeJobSchema,
  jobIdSchema,
  userJobsSchema,
} from '@/lib/schemas/automation-jobs';
import { withAuth, withInternalAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';

// ============================================================================
// INTERNAL FUNCTIONS (For Trigger.dev tasks - server-to-server only)
// ============================================================================

/**
 * Create a new job tracking record
 * INTERNAL: Called by Trigger.dev tasks, not user-facing
 */
export const createJobInternal = createServerFn({ method: 'POST' })
  .inputValidator(createJobSchema)
  .handler(async ({ data }) => {
    // Validate internal API secret (server-to-server only)
    await withInternalAuth();

    const [job] = await db
      .insert(jobs)
      .values({
        userId: data.userId,
        organizationId: data.organizationId,
        type: data.type,
        name: data.name,
        description: data.description,
        externalId: data.externalId,
        status: 'pending',
        progress: 0,
      })
      .returning();

    return job;
  });

/**
 * Update job progress and status
 * INTERNAL: Called by Trigger.dev tasks
 */
export const trackJobProgressInternal = createServerFn({ method: 'POST' })
  .inputValidator(updateJobProgressSchema)
  .handler(async ({ data }) => {
    // Validate internal API secret (server-to-server only)
    await withInternalAuth();

    // Get existing job first
    const existingJob = await db.query.jobs.findFirst({
      where: eq(jobs.id, data.jobId),
    });

    if (!existingJob) {
      throw new Error(`Job not found: ${data.jobId}`);
    }

    const updates: Partial<typeof jobs.$inferInsert> = {
      progress: data.progress,
      updatedAt: new Date(),
    };

    if (data.status) {
      updates.status = data.status;
      if (data.status === 'running' && !existingJob.startedAt) {
        updates.startedAt = new Date();
      }
    }

    // Merge metadata with currentStep
    if (data.currentStep) {
      const existingMetadata = (existingJob.metadata || {}) as JobMetadata;
      updates.metadata = {
        ...existingMetadata,
        currentStep: data.currentStep,
      };
    }

    const [updatedJob] = await db
      .update(jobs)
      .set(updates)
      .where(eq(jobs.id, data.jobId))
      .returning();

    return updatedJob;
  });

/**
 * Mark a job as completed (success or failure) and optionally create notification
 * INTERNAL: Called by Trigger.dev tasks
 */
export const completeJobInternal = createServerFn({ method: 'POST' })
  .inputValidator(completeJobSchema)
  .handler(async ({ data }) => {
    // Validate internal API secret (server-to-server only)
    await withInternalAuth();

    // Get the job first
    const existingJob = await db.query.jobs.findFirst({
      where: eq(jobs.id, data.jobId),
    });

    if (!existingJob) {
      throw new Error(`Job not found: ${data.jobId}`);
    }

    const existingMetadata = (existingJob.metadata || {}) as JobMetadata;
    const newMetadata: JobMetadata = {
      ...existingMetadata,
    };

    if (!data.success && data.errorMessage) {
      newMetadata.error = {
        message: data.errorMessage,
        code: data.errorCode,
      };
    }

    // Update the job
    const [updatedJob] = await db
      .update(jobs)
      .set({
        status: data.success ? 'completed' : 'failed',
        progress: data.success ? 100 : existingJob.progress,
        completedAt: new Date(),
        metadata: newMetadata,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, data.jobId))
      .returning();

    // Create notification if requested
    if (data.createNotification) {
      await db.insert(notifications).values({
        userId: existingJob.userId,
        organizationId: existingJob.organizationId,
        type: 'system',
        title: data.success ? `${existingJob.name} completed` : `${existingJob.name} failed`,
        message: data.success
          ? `Your ${existingJob.type} job has completed successfully.`
          : data.errorMessage || `Your ${existingJob.type} job has failed.`,
        status: 'pending',
        data: {
          entityId: existingJob.id,
          entityType: 'job',
          actionUrl: `/jobs/${existingJob.id}`,
        },
      });
    }

    return updatedJob;
  });

// ============================================================================
// USER-FACING FUNCTIONS (Protected with withAuth)
// ============================================================================

/**
 * Get job status by ID
 * Requires: Authentication + job must belong to user's organization
 */
export const getJobStatus = createServerFn({ method: 'GET' })
  .inputValidator(jobIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    const job = await db.query.jobs.findFirst({
      where: and(eq(jobs.id, data.jobId), eq(jobs.organizationId, ctx.organizationId)),
    });

    if (!job) {
      throw new Error('Job not found');
    }

    return job;
  });

/**
 * Get jobs for the current user (optionally filtered by status)
 * Requires: Authentication
 */
export const getUserJobs = createServerFn({ method: 'GET' })
  .inputValidator(userJobsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    const conditions = [eq(jobs.userId, ctx.user.id), eq(jobs.organizationId, ctx.organizationId)];

    if (data.status) {
      conditions.push(eq(jobs.status, data.status));
    }

    const userJobs = await db.query.jobs.findMany({
      where: and(...conditions),
      orderBy: [desc(jobs.createdAt)],
      limit: data.limit,
    });

    return userJobs;
  });

/**
 * Get active (pending or running) jobs for the current user
 * Requires: Authentication
 */
export const getActiveJobs = createServerFn({ method: 'GET' }).handler(async () => {
  const ctx = await withAuth({ permission: PERMISSIONS.job.read });

  const activeJobs = await db.query.jobs.findMany({
    where: and(
      eq(jobs.userId, ctx.user.id),
      eq(jobs.organizationId, ctx.organizationId),
      inArray(jobs.status, ['pending', 'running'])
    ),
    orderBy: [desc(jobs.createdAt)],
  });

  return activeJobs;
});

// ============================================================================
// BACKWARD COMPATIBILITY ALIASES
// Keep these for existing code, but mark as deprecated
// ============================================================================

/** @deprecated Use createJobInternal for Trigger.dev tasks */
export const createJob = createJobInternal;

/** @deprecated Use trackJobProgressInternal for Trigger.dev tasks */
export const trackJobProgress = trackJobProgressInternal;

/** @deprecated Use completeJobInternal for Trigger.dev tasks */
export const completeJob = completeJobInternal;
