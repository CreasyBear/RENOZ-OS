/**
 * Jobs Core Hooks
 *
 * TanStack Query hooks for core job CRUD operations and batch processing.
 * Provides consistent data fetching, caching, and synchronization across job views.
 *
 * @see src/server/functions/jobs/job-assignments.ts
 * @see src/server/functions/jobs/job-batch-operations.ts
 */

import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
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
import {
  isReadQueryError,
  normalizeReadQueryError,
  requireReadResult,
} from '@/lib/read-path-policy';

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
      try {
        if (!organizationId) {
          return { jobs: [], total: 0 };
        }
        const result = await listJobAssignments({
          data: {
            organizationId,
            filters: {
              installerIds: filters?.installerIds,
              statuses: filters?.statuses as (
                | 'scheduled'
                | 'in_progress'
                | 'on_hold'
                | 'completed'
                | 'cancelled'
              )[]
                | undefined,
              dateFrom: filters?.dateFrom,
              dateTo: filters?.dateTo,
              search: filters?.search,
              limit: filters?.limit ?? 50,
              offset: filters?.offset ?? 0,
            },
          },
        });
        return requireReadResult(result, {
          message: 'Jobs list returned no data',
          contractType: 'always-shaped',
          fallbackMessage: 'Jobs are temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Jobs are temporarily unavailable. Please refresh and try again.',
        });
      }
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
    queryFn: async () => {
      try {
        const result = await getJobAssignment({
          data: { id: jobId, organizationId: organizationId! },
        });
        return requireReadResult(result, {
          message: 'Job not found',
          contractType: 'detail-not-found',
          fallbackMessage: 'Job details are temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested job could not be found.',
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'detail-not-found',
          fallbackMessage: 'Job details are temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested job could not be found.',
        });
      }
    },
    enabled: enabled && !!jobId && !!organizationId,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// JOB MUTATIONS
// ============================================================================

function invalidateJobCalendarAssignmentViews(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.eventsAll() });
  queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.eventDetails() });
  queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.eventsRanges() });
  queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.unscheduledLists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.installerLists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.kanbanRanges() });
  queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.timelineRanges() });
  queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.timelineStatsAll() });
}

function invalidateJobAssignmentCollectionViews(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.jobs.lists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.jobs.active() });
  queryClient.invalidateQueries({ queryKey: queryKeys.jobs.activeProjectsAll() });
  queryClient.invalidateQueries({ queryKey: queryKeys.jobAssignments.lists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.jobAssignments.kanbanSelectors() });
  invalidateJobCalendarAssignmentViews(queryClient);
}

function invalidateJobAssignmentDetails(queryClient: QueryClient, jobId?: string | null) {
  if (!jobId) return;
  queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.jobAssignments.detail(jobId) });
}

function invalidateJobTaskAssignmentContext(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.jobTasks.lists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.jobTasks.kanban.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.jobTasks.myTasks.all });
}

function getBatchOperationJobIds(input: ProcessJobBatchInput): string[] {
  return input.operations.flatMap((operation) => {
    const data = operation.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return [];
    }
    const id = (data as { id?: unknown }).id;
    return typeof id === 'string' ? [id] : [];
  });
}

export interface CreateJobInput {
  title: string;
  description?: string;
  customerId: string;
  installerId: string;
  jobNumber?: string;
  scheduledDate: string;
  scheduledTime?: string;
  estimatedDuration?: number;
  jobType?: 'installation' | 'service' | 'warranty' | 'inspection' | 'commissioning';
  orderId?: string;
  internalNotes?: string;
  metadata?: Record<string, unknown>;
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
          customerId: input.customerId,
          installerId: input.installerId,
          jobNumber: input.jobNumber,
          title: input.title,
          description: input.description,
          scheduledDate: input.scheduledDate,
          scheduledTime: input.scheduledTime,
          estimatedDuration: input.estimatedDuration,
          jobType: input.jobType,
          orderId: input.orderId,
          internalNotes: input.internalNotes,
          metadata: input.metadata as { notes?: string; weatherConditions?: string; accessInstructions?: string; equipmentRequired?: string[] },
        },
      });
    },
    onSuccess: (result) => {
      invalidateJobAssignmentCollectionViews(queryClient);
      invalidateJobAssignmentDetails(queryClient, result.job?.id);
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
      invalidateJobAssignmentCollectionViews(queryClient);
      invalidateJobAssignmentDetails(queryClient, variables.id);
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
    onSuccess: (_result, jobId) => {
      invalidateJobAssignmentCollectionViews(queryClient);
      invalidateJobAssignmentDetails(queryClient, jobId);
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
    onSuccess: (_result: ProcessJobBatchResult, variables) => {
      invalidateJobAssignmentCollectionViews(queryClient);
      invalidateJobTaskAssignmentContext(queryClient);
      getBatchOperationJobIds(variables).forEach((jobId) => {
        invalidateJobAssignmentDetails(queryClient, jobId);
      });
    },
  });
}

// ============================================================================
// JOB ASSIGNMENTS FOR KANBAN SELECTOR
// ============================================================================

export interface UseJobAssignmentsForKanbanOptions {
  enabled?: boolean;
  limit?: number;
}

/**
 * Fetch job assignments for kanban job selector dropdown.
 * Returns a simplified list suitable for dropdown selection.
 */
export function useJobAssignmentsForKanban(options: UseJobAssignmentsForKanbanOptions = {}) {
  const { enabled = true, limit = 200 } = options;
  const { currentOrg } = useCurrentOrg();
  const organizationId = currentOrg?.id;
  const listAssignmentsFn = useServerFn(listJobAssignments);

  return useQuery({
    queryKey: queryKeys.jobAssignments.kanbanSelector({ organizationId }),
    queryFn: async () => {
      try {
        if (!organizationId) {
          return { jobs: [] as Array<{ id: string; jobNumber: string; title: string }> };
        }
        const result = await listAssignmentsFn({
          data: {
            organizationId,
            filters: {
              limit,
              offset: 0,
              sortBy: 'scheduledDate',
              sortOrder: 'asc',
            },
          },
        });
        return requireReadResult(result, {
          message: 'Jobs list returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Job assignments are temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Job assignments are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: enabled && !!organizationId,
    staleTime: 60 * 1000, // 1 minute
  });
}
