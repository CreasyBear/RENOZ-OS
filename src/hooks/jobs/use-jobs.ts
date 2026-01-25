/**
 * Jobs Core Hooks
 *
 * TanStack Query hooks for core job CRUD operations and batch processing.
 * Provides consistent data fetching, caching, and synchronization across job views.
 *
 * @see src/server/functions/jobs/job-assignments.ts
 * @see src/server/functions/jobs/job-batch-operations.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import {
  listJobAssignments,
  getJobAssignment,
  createJobAssignment,
  updateJobAssignment,
  deleteJobAssignment,
} from '@/server/functions/jobs/job-assignments';
import { processJobBatchOperations } from '@/server/functions/jobs/job-batch-operations';
import type { UpdateJobAssignmentInput } from '@/lib/schemas/jobs/job-assignments';
import type {
  ProcessJobBatchInput,
  ProcessJobBatchResult,
} from '@/server/functions/jobs/job-batch-operations';
import { queryKeys, type JobFilters } from '@/lib/query-keys';
import { useCurrentOrg } from '@/hooks/auth';

// ============================================================================
// JOB LIST HOOKS
// ============================================================================

export interface UseJobsOptions {
  filters?: JobFilters & {
    installerIds?: string[];
    statuses?: string[];
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    limit?: number;
    offset?: number;
  };
  enabled?: boolean;
}

/**
 * Fetch paginated list of jobs with optional filtering.
 */
export function useJobs(options: UseJobsOptions = {}) {
  const { filters, enabled = true } = options;
  const { currentOrg } = useCurrentOrg();
  const organizationId = currentOrg?.id;

  return useQuery({
    queryKey: queryKeys.jobs.list(filters),
    queryFn: async () => {
      if (!organizationId) {
        return { jobs: [], total: 0 };
      }
      const result = await listJobAssignments({
        data: {
          organizationId,
          filters: {
            installerIds: filters?.installerIds,
            statuses: filters?.statuses as UpdateJobAssignmentInput['status'][],
            dateFrom: filters?.dateFrom,
            dateTo: filters?.dateTo,
            search: filters?.search,
            limit: filters?.limit ?? 50,
            offset: filters?.offset ?? 0,
          },
        },
      });
      return result;
    },
    enabled: enabled && !!organizationId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Fetch a single job by ID.
 */
export function useJob(jobId: string, enabled = true) {
  const { currentOrg } = useCurrentOrg();
  const organizationId = currentOrg?.id;

  return useQuery({
    queryKey: queryKeys.jobs.detail(jobId),
    queryFn: () =>
      getJobAssignment({
        data: { id: jobId, organizationId: organizationId! },
      }),
    enabled: enabled && !!jobId && !!organizationId,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// JOB MUTATIONS
// ============================================================================

export interface CreateJobInput {
  title: string;
  description?: string;
  customerId?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  estimatedDuration?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  installerIds?: string[];
}

/**
 * Create a new job assignment.
 */
export function useCreateJob() {
  const queryClient = useQueryClient();
  const { currentOrg } = useCurrentOrg();
  const organizationId = currentOrg?.id;

  return useMutation({
    mutationFn: async (input: CreateJobInput) => {
      if (!organizationId) {
        throw new Error('Organization context is required to create jobs');
      }
      return createJobAssignment({
        data: {
          organizationId,
          data: input,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobAssignments.all });
    },
  });
}

/**
 * Update an existing job assignment.
 */
export function useUpdateJob() {
  const queryClient = useQueryClient();
  const { currentOrg } = useCurrentOrg();
  const organizationId = currentOrg?.id;

  return useMutation({
    mutationFn: async (input: { id: string; data: Partial<UpdateJobAssignmentInput> }) => {
      if (!organizationId) {
        throw new Error('Organization context is required to update jobs');
      }
      return updateJobAssignment({
        data: {
          id: input.id,
          organizationId,
          data: input.data,
        },
      });
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobAssignments.all });
    },
  });
}

/**
 * Delete a job assignment (soft delete).
 */
export function useDeleteJob() {
  const queryClient = useQueryClient();
  const { currentOrg } = useCurrentOrg();
  const organizationId = currentOrg?.id;

  return useMutation({
    mutationFn: async (jobId: string) => {
      if (!organizationId) {
        throw new Error('Organization context is required to delete jobs');
      }
      return deleteJobAssignment({
        data: { id: jobId, organizationId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobAssignments.all });
    },
  });
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Process multiple job operations in a batch.
 * Supports bulk status updates, assignments, and deletions.
 */
export function useBatchJobOperations() {
  const queryClient = useQueryClient();
  const processBatchFn = useServerFn(processJobBatchOperations);

  return useMutation({
    mutationFn: (input: ProcessJobBatchInput) => processBatchFn({ data: input }),
    onSuccess: (_result: ProcessJobBatchResult) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobTasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobAssignments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.all });
    },
  });
}
