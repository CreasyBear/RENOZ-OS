/**
 * Job Batch Operations Server Functions
 *
 * Batch processing for job operations with error recovery and rollback support.
 * Integrates with existing job infrastructure.
 */

import { createServerFn } from '@tanstack/react-start';
import { db } from '@/lib/db';
import { jobAssignments, users } from 'drizzle/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { withAuth } from '@/lib/server/protected';
import { z } from 'zod';
import { processJobOperations } from '@/lib/job-batch-processing';

// ============================================================================
// SCHEMAS
// ============================================================================

export const jobBatchOperationSchema = z.object({
  id: z.string(),
  type: z.enum(['create', 'update', 'delete', 'reschedule', 'assign']),
  data: z.any(),
});

export const processJobBatchSchema = z.object({
  operations: z.array(jobBatchOperationSchema),
  options: z
    .object({
      batchSize: z.number().min(1).max(100).default(10),
      continueOnError: z.boolean().default(true),
      enableRollback: z.boolean().default(false),
    })
    .default(() => ({ batchSize: 10, continueOnError: true, enableRollback: false })),
});

export type ProcessJobBatchInput = z.infer<typeof processJobBatchSchema>;
export type ProcessJobBatchResult = {
  success: boolean;
  results: Array<{
    operationId: string;
    success: boolean;
    error?: string;
    data?: any;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    skipped?: number;
    duration: number;
  };
  rollbackData?: any[];
};

// ============================================================================
// BATCH PROCESSING FUNCTIONS
// ============================================================================

/**
 * Process multiple job operations in batches with error recovery.
 */
export const processJobBatchOperations = createServerFn({ method: 'POST' })
  .inputValidator(processJobBatchSchema)
  .handler(async ({ data }) => {
    await withAuth();

    // Validate that user has permission to perform these operations
    // This is a simplified check - in production, you'd want more granular permissions

    const results = await processJobOperations(data.operations, {
      batchSize: data.options.batchSize,
      enableRollback: data.options.enableRollback,
      onProgress: (completed, total) => {
        // Could emit progress events here
        console.log(`Batch progress: ${completed}/${total}`);
      },
      onError: (error, operation) => {
        console.error(`Batch operation failed: ${operation.id}`, error);
      },
    });

    return {
      success: true,
      results: results.results,
      summary: results.summary,
      rollbackData: results.rollbackData,
    };
  });

// ============================================================================
// BULK JOB OPERATIONS
// ============================================================================

/**
 * Bulk update job statuses.
 */
export const bulkUpdateJobStatuses = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      jobIds: z.array(z.string().uuid()),
      status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold']),
      internalNotes: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Validate permissions and that jobs belong to organization
    const existingJobs = await db
      .select({ id: jobAssignments.id })
      .from(jobAssignments)
      .where(
        and(
          eq(jobAssignments.organizationId, ctx.organizationId),
          inArray(jobAssignments.id, data.jobIds)
        )
      );

    if (existingJobs.length !== data.jobIds.length) {
      throw new Error('Some jobs not found or access denied');
    }

    // Perform bulk update
    const result = await db
      .update(jobAssignments)
      .set({
        status: data.status,
        internalNotes: data.internalNotes,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(jobAssignments.organizationId, ctx.organizationId),
          inArray(jobAssignments.id, data.jobIds)
        )
      )
      .returning({ id: jobAssignments.id });

    return {
      success: true,
      updatedCount: result.length,
      jobIds: result.map((r) => r.id),
    };
  });

/**
 * Bulk reschedule jobs.
 */
export const bulkRescheduleJobs = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      jobIds: z.array(z.string().uuid()),
      newScheduledDate: z.string(), // YYYY-MM-DD
      newScheduledTime: z.string().optional(), // HH:MM
      reason: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Validate permissions and that jobs belong to organization
    const existingJobs = await db
      .select({ id: jobAssignments.id })
      .from(jobAssignments)
      .where(
        and(
          eq(jobAssignments.organizationId, ctx.organizationId),
          inArray(jobAssignments.id, data.jobIds)
        )
      );

    if (existingJobs.length !== data.jobIds.length) {
      throw new Error('Some jobs not found or access denied');
    }

    // Perform bulk reschedule
    const result = await db
      .update(jobAssignments)
      .set({
        scheduledDate: data.newScheduledDate,
        scheduledTime: data.newScheduledTime,
        internalNotes: data.reason ? `Rescheduled: ${data.reason}` : 'Rescheduled',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(jobAssignments.organizationId, ctx.organizationId),
          inArray(jobAssignments.id, data.jobIds)
        )
      )
      .returning({ id: jobAssignments.id });

    return {
      success: true,
      rescheduledCount: result.length,
      jobIds: result.map((r) => r.id),
    };
  });

/**
 * Bulk assign jobs to installer.
 */
export const bulkAssignJobs = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      jobIds: z.array(z.string().uuid()),
      installerId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Validate that installer belongs to organization
    const installer = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.organizationId, ctx.organizationId), eq(users.id, data.installerId)));

    if (!installer.length) {
      throw new Error('Installer not found or access denied');
    }

    // Validate permissions and that jobs belong to organization
    const existingJobs = await db
      .select({ id: jobAssignments.id })
      .from(jobAssignments)
      .where(
        and(
          eq(jobAssignments.organizationId, ctx.organizationId),
          inArray(jobAssignments.id, data.jobIds)
        )
      );

    if (existingJobs.length !== data.jobIds.length) {
      throw new Error('Some jobs not found or access denied');
    }

    // Perform bulk assignment
    const result = await db
      .update(jobAssignments)
      .set({
        installerId: data.installerId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(jobAssignments.organizationId, ctx.organizationId),
          inArray(jobAssignments.id, data.jobIds)
        )
      )
      .returning({ id: jobAssignments.id });

    return {
      success: true,
      assignedCount: result.length,
      jobIds: result.map((r) => r.id),
      installerId: data.installerId,
    };
  });

// ============================================================================
// BATCH IMPORT OPERATIONS
// ============================================================================

/**
 * Bulk import jobs from external data source.
 */
export const bulkImportJobs = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      jobs: z.array(
        z.object({
          jobNumber: z.string(),
          title: z.string(),
          description: z.string().optional(),
          customerId: z.string().uuid(),
          installerId: z.string().uuid(),
          scheduledDate: z.string(), // YYYY-MM-DD
          scheduledTime: z.string().optional(), // HH:MM
          estimatedDuration: z.number().optional(), // minutes
          jobType: z.enum(['installation', 'service', 'warranty', 'inspection', 'commissioning']).default('installation'),
          status: z
            .enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold'])
            .default('scheduled'),
        })
      ),
      options: z
        .object({
          skipDuplicates: z.boolean().default(true),
          updateExisting: z.boolean().default(false),
        })
        .default(() => ({ skipDuplicates: true, updateExisting: false })),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const results = {
      imported: [] as string[],
      skipped: [] as string[],
      errors: [] as Array<{ jobNumber: string; error: string }>,
    };

    // Process jobs in batches
    const batchSize = 10;
    for (let i = 0; i < data.jobs.length; i += batchSize) {
      const batch = data.jobs.slice(i, i + batchSize);

      for (const jobData of batch) {
        try {
          // Check for existing job
          const existingJob = await db
            .select({ id: jobAssignments.id })
            .from(jobAssignments)
            .where(
              and(
                eq(jobAssignments.organizationId, ctx.organizationId),
                eq(jobAssignments.jobNumber, jobData.jobNumber)
              )
            );

          if (existingJob.length > 0) {
            if (data.options.skipDuplicates) {
              results.skipped.push(jobData.jobNumber);
              continue;
            } else if (data.options.updateExisting) {
              // Update existing job
              await db
                .update(jobAssignments)
                .set({
                  title: jobData.title,
                  description: jobData.description,
                  customerId: jobData.customerId,
                  installerId: jobData.installerId,
                  scheduledDate: jobData.scheduledDate,
                  scheduledTime: jobData.scheduledTime,
                  estimatedDuration: jobData.estimatedDuration,
                  jobType: jobData.jobType,
                  status: jobData.status,
                  updatedAt: new Date(),
                })
                .where(
                  and(
                    eq(jobAssignments.organizationId, ctx.organizationId),
                    eq(jobAssignments.id, existingJob[0].id)
                  )
                );

              results.imported.push(jobData.jobNumber);
              continue;
            } else {
              throw new Error('Job already exists');
            }
          }

          // Create new job
          const newJob = await db
            .insert(jobAssignments)
            .values({
              id: crypto.randomUUID(),
              organizationId: ctx.organizationId,
              jobNumber: jobData.jobNumber,
              title: jobData.title,
              description: jobData.description,
              customerId: jobData.customerId,
              installerId: jobData.installerId,
              scheduledDate: jobData.scheduledDate,
              scheduledTime: jobData.scheduledTime,
              estimatedDuration: jobData.estimatedDuration,
              jobType: jobData.jobType,
              status: jobData.status,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning({ id: jobAssignments.id, jobNumber: jobAssignments.jobNumber });

          results.imported.push(newJob[0].jobNumber);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          results.errors.push({
            jobNumber: jobData.jobNumber,
            error: errorMessage,
          });
        }
      }
    }

    return {
      success: true,
      summary: {
        total: data.jobs.length,
        imported: results.imported.length,
        skipped: results.skipped.length,
        errors: results.errors.length,
      },
      results,
    };
  });

// ============================================================================
// BATCH CLEANUP OPERATIONS
// ============================================================================

/**
 * Bulk delete cancelled/on-hold jobs older than specified days.
 */
export const bulkCleanupOldJobs = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      olderThanDays: z.number().min(1).max(365),
      statuses: z.array(z.enum(['cancelled', 'on_hold'])).default(['cancelled', 'on_hold']),
      dryRun: z.boolean().default(true), // Preview mode by default
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - data.olderThanDays);

    // Find jobs to cleanup
    const jobsToDelete = await db
      .select({
        id: jobAssignments.id,
        jobNumber: jobAssignments.jobNumber,
        status: jobAssignments.status,
        scheduledDate: jobAssignments.scheduledDate,
        createdAt: jobAssignments.createdAt,
      })
      .from(jobAssignments)
      .where(
        and(
          eq(jobAssignments.organizationId, ctx.organizationId),
          inArray(jobAssignments.status, data.statuses),
          sql`${jobAssignments.createdAt} < ${cutoffDate}`
        )
      );

    if (data.dryRun) {
      return {
        success: true,
        dryRun: true,
        jobsToDelete: jobsToDelete.map((job) => ({
          id: job.id,
          jobNumber: job.jobNumber,
          status: job.status,
          scheduledDate: job.scheduledDate,
          createdAt: job.createdAt,
        })),
        count: jobsToDelete.length,
      };
    }

    // Perform actual deletion
    await db.delete(jobAssignments).where(
      and(
        eq(jobAssignments.organizationId, ctx.organizationId),
        inArray(
          jobAssignments.id,
          jobsToDelete.map((j) => j.id)
        )
      )
    );

    return {
      success: true,
      dryRun: false,
      deletedCount: jobsToDelete.length,
      jobNumbers: jobsToDelete.map((j) => j.jobNumber),
    };
  });
