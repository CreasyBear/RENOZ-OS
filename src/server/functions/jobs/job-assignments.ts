/**
 * Job Assignment Server Functions
 *
 * Server-side functions for job assignment CRUD operations.
 * Provides complete lifecycle management for field work assignments.
 *
 * @see drizzle/schema/jobs/job-assignments.ts for database schema
 * @see src/lib/schemas/jobs/job-assignments.ts for validation schemas
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-001a/b
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, gte, lte, sql, desc, asc, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { jobAssignments, jobPhotos, users, customers } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError, AuthError } from '@/lib/server/errors';
import {
  createJobAssignmentSchema,
  listJobAssignmentsSchema,
  jobAssignmentFiltersSchema,
  getJobAssignmentSchema,
  deleteJobAssignmentSchema,
  startJobAssignmentSchema,
  completeJobAssignmentSchema,
  createJobPhotoSchema,
  listJobPhotosSchema,
  type CreateJobAssignmentInput,
  type UpdateJobAssignmentInput,
  type ListJobAssignmentsInput,
  type JobAssignmentFilters,
  type GetJobAssignmentInput,
  type DeleteJobAssignmentInput,
  type StartJobAssignmentInput,
  type CompleteJobAssignmentInput,
  type CreateJobPhotoInput,
  type ListJobPhotosInput,
  type JobAssignmentResponse,
  type JobPhotoResponse,
  type ListJobAssignmentsResponse,
  type CreateJobAssignmentResponse,
  type UpdateJobAssignmentResponse,
  type DeleteJobAssignmentResponse,
  type CreateJobPhotoResponse,
} from '@/lib/schemas/jobs/job-assignments';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert database row to API response format
 */
function toJobAssignmentResponse(
  job: typeof jobAssignments.$inferSelect,
  installer: { id: string; name: string | null; email: string },
  customer: { id: string; name: string }
): JobAssignmentResponse {
  return {
    id: job.id,
    organizationId: job.organizationId,
    orderId: job.orderId,
    customerId: job.customerId,
    customer: {
      id: customer.id,
      name: customer.name,
    },
    installerId: job.installerId,
    installer: {
      id: installer.id,
      name: installer.name,
      email: installer.email,
    },
    jobType: job.jobType,
    jobNumber: job.jobNumber,
    title: job.title,
    description: job.description,
    scheduledDate:
      typeof job.scheduledDate === 'string' ? new Date(job.scheduledDate) : job.scheduledDate,
    scheduledTime: job.scheduledTime,
    estimatedDuration: job.estimatedDuration,
    status: job.status,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    startLocation: job.startLocation as any,
    completeLocation: job.completeLocation as any,
    signatureUrl: job.signatureUrl,
    signedByName: job.signedByName,
    confirmationStatus: job.confirmationStatus,
    internalNotes: job.internalNotes,
    metadata: job.metadata as any,
    slaTrackingId: job.slaTrackingId,
    version: job.version,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

/**
 * Convert database row to job photo response
 */
function toJobPhotoResponse(photo: typeof jobPhotos.$inferSelect): JobPhotoResponse {
  return {
    id: photo.id,
    organizationId: photo.organizationId,
    jobAssignmentId: photo.jobAssignmentId,
    type: photo.type,
    photoUrl: photo.photoUrl,
    caption: photo.caption,
    location: photo.location as any,
    createdAt: photo.createdAt.toISOString(),
    updatedAt: photo.updatedAt.toISOString(),
  };
}

// ============================================================================
// CREATE JOB ASSIGNMENT
// ============================================================================

export const createJobAssignment = createServerFn({ method: 'POST' })
  .inputValidator(createJobAssignmentSchema)
  .handler(async ({ data }: { data: CreateJobAssignmentInput }) => {
    const ctx = await withAuth();

    try {
      // Generate job number if not provided
      const jobNumber = data.jobNumber || (await generateJobNumber(data.organizationId));

      // Create job assignment
      const [newJob] = await db
        .insert(jobAssignments)
        .values({
          organizationId: data.organizationId,
          orderId: data.orderId,
          customerId: data.customerId,
          installerId: data.installerId,
          jobType: data.jobType,
          jobNumber,
          title: data.title,
          description: data.description,
          scheduledDate: data.scheduledDate,
          scheduledTime: data.scheduledTime,
          estimatedDuration: data.estimatedDuration,
          internalNotes: data.internalNotes,
          metadata: data.metadata,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();

      // Fetch with related data for response
      const [jobWithRelations] = await db
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
        .where(eq(jobAssignments.id, newJob.id))
        .innerJoin(users, eq(jobAssignments.installerId, users.id))
        .innerJoin(customers, eq(jobAssignments.customerId, customers.id))
        .limit(1);

      const response: CreateJobAssignmentResponse = {
        success: true,
        job: toJobAssignmentResponse(
          jobWithRelations.job,
          jobWithRelations.installer,
          jobWithRelations.customer
        ),
      };

      return response;
    } catch (error) {
      console.error('Failed to create job assignment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create job assignment',
      };
    }
  });

// ============================================================================
// GET JOB ASSIGNMENT
// ============================================================================

export const getJobAssignment = createServerFn({ method: 'GET' })
  .inputValidator(getJobAssignmentSchema)
  .handler(async ({ data }: { data: GetJobAssignmentInput }) => {
    try {
      const [jobWithRelations] = await db
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
        .where(
          and(
            eq(jobAssignments.id, data.id),
            eq(jobAssignments.organizationId, data.organizationId)
          )
        )
        .innerJoin(users, eq(jobAssignments.installerId, users.id))
        .innerJoin(customers, eq(jobAssignments.customerId, customers.id))
        .limit(1);

      if (!jobWithRelations) {
        throw new NotFoundError('Job assignment not found', 'jobAssignment');
      }

      return toJobAssignmentResponse(
        jobWithRelations.job,
        jobWithRelations.installer,
        jobWithRelations.customer
      );
    } catch (error) {
      console.error('Failed to get job assignment:', error);
      throw error;
    }
  });

// ============================================================================
// LIST JOB ASSIGNMENTS
// ============================================================================

export const listJobAssignments = createServerFn({ method: 'GET' })
  .inputValidator(listJobAssignmentsSchema)
  .handler(async ({ data }: { data: ListJobAssignmentsInput }) => {
    const ctx = await withAuth();

    try {
      if (data.organizationId !== ctx.organizationId) {
        throw new AuthError('Access denied to job assignments');
      }

      const filters: JobAssignmentFilters = jobAssignmentFiltersSchema.parse(data.filters ?? {});
      const conditions = [eq(jobAssignments.organizationId, ctx.organizationId)];

      // Apply filters
      if (filters.status) {
        conditions.push(eq(jobAssignments.status, filters.status));
      }
      if (filters.statuses && filters.statuses.length > 0) {
        conditions.push(inArray(jobAssignments.status, filters.statuses));
      }
      if (filters.jobType) {
        conditions.push(eq(jobAssignments.jobType, filters.jobType));
      }
      if (filters.jobTypes && filters.jobTypes.length > 0) {
        conditions.push(inArray(jobAssignments.jobType, filters.jobTypes));
      }
      if (filters.installerId) {
        conditions.push(eq(jobAssignments.installerId, filters.installerId));
      }
      if (filters.installerIds && filters.installerIds.length > 0) {
        conditions.push(inArray(jobAssignments.installerId, filters.installerIds));
      }
      if (filters.customerId) {
        conditions.push(eq(jobAssignments.customerId, filters.customerId));
      }
      if (filters.customerIds && filters.customerIds.length > 0) {
        conditions.push(inArray(jobAssignments.customerId, filters.customerIds));
      }
      if (filters.orderId) {
        conditions.push(eq(jobAssignments.orderId, filters.orderId));
      }
      if (filters.dateFrom) {
        conditions.push(gte(jobAssignments.scheduledDate, filters.dateFrom));
      }
      if (filters.dateTo) {
        conditions.push(lte(jobAssignments.scheduledDate, filters.dateTo));
      }
      if (filters.scheduledDate) {
        conditions.push(eq(jobAssignments.scheduledDate, filters.scheduledDate));
      }
      if (filters.search) {
        // Search in title, description, job number, or customer name
        conditions.push(sql`(
          ${jobAssignments.title} ILIKE ${`%${filters.search}%`} OR
          ${jobAssignments.description} ILIKE ${`%${filters.search}%`} OR
          ${jobAssignments.jobNumber} ILIKE ${`%${filters.search}%`}
        )`);
      }

      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(jobAssignments)
        .where(and(...conditions));

      // Build sort order
      const sortColumn =
        filters.sortBy === 'scheduledDate'
          ? jobAssignments.scheduledDate
          : filters.sortBy === 'createdAt'
            ? jobAssignments.createdAt
            : filters.sortBy === 'updatedAt'
              ? jobAssignments.updatedAt
              : jobAssignments.jobNumber;

      const sortOrder = filters.sortOrder === 'desc' ? desc : asc;

      // Get jobs with relations
      const jobsWithRelations = await db
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
        .where(and(...conditions))
        .innerJoin(users, eq(jobAssignments.installerId, users.id))
        .innerJoin(customers, eq(jobAssignments.customerId, customers.id))
        .orderBy(sortOrder(sortColumn))
        .limit(filters.limit)
        .offset(filters.offset);

      const response: ListJobAssignmentsResponse = {
        jobs: jobsWithRelations.map(({ job, installer, customer }) =>
          toJobAssignmentResponse(job, installer, customer)
        ),
        total: count,
        hasMore: filters.offset + filters.limit < count,
        nextOffset:
          filters.offset + filters.limit < count ? filters.offset + filters.limit : undefined,
      };

      return response;
    } catch (error) {
      console.error('Failed to list job assignments:', error);
      throw error;
    }
  });

// ============================================================================
// UPDATE JOB ASSIGNMENT
// ============================================================================

export const updateJobAssignment = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: { id: string; organizationId: string; data: UpdateJobAssignmentInput }) => {
      return {
        id: input.id,
        organizationId: input.organizationId,
        ...input.data,
      };
    }
  )
  .handler(
    async ({
      data,
    }: {
      data: { id: string; organizationId: string } & UpdateJobAssignmentInput;
    }) => {
      const ctx = await withAuth();
      const { id, organizationId, ...updateData } = data;

      try {
        // Update job assignment
        const [updatedJob] = await db
          .update(jobAssignments)
          .set({
            ...updateData,
            updatedBy: ctx.user.id,
            updatedAt: new Date(),
          })
          .where(and(eq(jobAssignments.id, id), eq(jobAssignments.organizationId, organizationId)))
          .returning();

        if (!updatedJob) {
          throw new NotFoundError('Job assignment not found', 'jobAssignment');
        }

        // Fetch with related data for response
        const [jobWithRelations] = await db
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
          .where(eq(jobAssignments.id, updatedJob.id))
          .innerJoin(users, eq(jobAssignments.installerId, users.id))
          .innerJoin(customers, eq(jobAssignments.customerId, customers.id))
          .limit(1);

        const response: UpdateJobAssignmentResponse = {
          success: true,
          job: toJobAssignmentResponse(
            jobWithRelations.job,
            jobWithRelations.installer,
            jobWithRelations.customer
          ),
        };

        return response;
      } catch (error) {
        console.error('Failed to update job assignment:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update job assignment',
        };
      }
    }
  );

// ============================================================================
// DELETE JOB ASSIGNMENT
// ============================================================================

export const deleteJobAssignment = createServerFn({ method: 'POST' })
  .inputValidator(deleteJobAssignmentSchema)
  .handler(async ({ data }: { data: DeleteJobAssignmentInput }) => {
    const ctx = await withAuth();

    try {
      // Soft delete by setting status to cancelled
      const [deletedJob] = await db
        .update(jobAssignments)
        .set({
          status: 'cancelled',
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(jobAssignments.id, data.id),
            eq(jobAssignments.organizationId, data.organizationId)
          )
        )
        .returning();

      if (!deletedJob) {
        throw new NotFoundError('Job assignment not found', 'jobAssignment');
      }

      const response: DeleteJobAssignmentResponse = {
        success: true,
      };

      return response;
    } catch (error) {
      console.error('Failed to delete job assignment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete job assignment',
      };
    }
  });

// ============================================================================
// START JOB ASSIGNMENT
// ============================================================================

export const startJobAssignment = createServerFn({ method: 'POST' })
  .inputValidator(startJobAssignmentSchema)
  .handler(async ({ data }: { data: StartJobAssignmentInput }) => {
    const ctx = await withAuth();

    try {
      const now = new Date().toISOString();

      const [startedJob] = await db
        .update(jobAssignments)
        .set({
          status: 'in_progress',
          startedAt: now,
          startLocation: data.startLocation as any,
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(jobAssignments.id, data.id),
            eq(jobAssignments.organizationId, data.organizationId)
          )
        )
        .returning();

      if (!startedJob) {
        throw new NotFoundError('Job assignment not found', 'jobAssignment');
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to start job assignment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start job assignment',
      };
    }
  });

// ============================================================================
// COMPLETE JOB ASSIGNMENT
// ============================================================================

export const completeJobAssignment = createServerFn({ method: 'POST' })
  .inputValidator(completeJobAssignmentSchema)
  .handler(async ({ data }: { data: CompleteJobAssignmentInput }) => {
    const ctx = await withAuth();

    try {
      const now = new Date().toISOString();

      const [completedJob] = await db
        .update(jobAssignments)
        .set({
          status: 'completed',
          completedAt: now,
          completeLocation: data.completeLocation as any,
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(jobAssignments.id, data.id),
            eq(jobAssignments.organizationId, data.organizationId)
          )
        )
        .returning();

      if (!completedJob) {
        throw new NotFoundError('Job assignment not found', 'jobAssignment');
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to complete job assignment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete job assignment',
      };
    }
  });

// ============================================================================
// JOB PHOTO OPERATIONS
// ============================================================================

export const createJobPhoto = createServerFn({ method: 'POST' })
  .inputValidator(createJobPhotoSchema)
  .handler(async ({ data }: { data: CreateJobPhotoInput }) => {
    const ctx = await withAuth();

    try {
      const [newPhoto] = await db
        .insert(jobPhotos)
        .values({
          organizationId: data.organizationId,
          jobAssignmentId: data.jobAssignmentId,
          type: data.type,
          photoUrl: data.photoUrl,
          caption: data.caption,
          location: data.location as any,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();

      const response: CreateJobPhotoResponse = {
        success: true,
        photo: toJobPhotoResponse(newPhoto),
      };

      return response;
    } catch (error) {
      console.error('Failed to create job photo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create job photo',
      };
    }
  });

export const getJobPhotos = createServerFn({ method: 'GET' })
  .inputValidator(listJobPhotosSchema)
  .handler(async ({ data }: { data: ListJobPhotosInput }) => {
    const ctx = await withAuth();

    try {
      if (data.organizationId !== ctx.organizationId) {
        throw new AuthError('Access denied to job photos');
      }

      const photos = await db
        .select()
        .from(jobPhotos)
        .where(
          and(
            eq(jobPhotos.jobAssignmentId, data.jobAssignmentId),
            eq(jobPhotos.organizationId, data.organizationId)
          )
        )
        .orderBy(desc(jobPhotos.createdAt));

      return photos.map(toJobPhotoResponse);
    } catch (error) {
      console.error('Failed to get job photos:', error);
      throw error;
    }
  });

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique job number
 */
async function generateJobNumber(organizationId: string): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

  // Get the next sequence number for today
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(jobAssignments)
    .where(
      and(
        eq(jobAssignments.organizationId, organizationId),
        sql`${jobAssignments.createdAt}::date = CURRENT_DATE`
      )
    );

  const sequence = (count + 1).toString().padStart(4, '0');
  return `JOB-${dateStr}-${sequence}`;
}
