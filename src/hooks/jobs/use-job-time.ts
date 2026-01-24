/**
 * Job Time Entries TanStack Query Hooks
 *
 * Provides data fetching and mutation hooks for job time tracking.
 * Uses TanStack Query for caching, invalidation, and optimistic updates.
 *
 * @see src/server/functions/job-time.ts for server functions
 * @see src/lib/schemas/job-time.ts for types
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-003c
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  startTimer,
  stopTimer,
  createManualEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getJobTimeEntries,
  calculateJobLaborCost,
  getTimeEntry,
} from '@/server/functions/jobs/job-time';
import type {
  StartTimerInput,
  StopTimerInput,
  CreateManualEntryInput,
  UpdateTimeEntryInput,
  DeleteTimeEntryInput,
  GetJobTimeEntriesInput,
  CalculateJobLaborCostInput,
  GetTimeEntryInput,
} from '@/lib/schemas';

// Query keys are now centralized in @/lib/query-keys.ts

// ============================================================================
// GET JOB TIME ENTRIES
// ============================================================================

/**
 * Get all time entries for a job with summary.
 */
export function useJobTimeEntries(input: GetJobTimeEntriesInput) {
  const getEntriesFn = useServerFn(getJobTimeEntries);

  return useQuery({
    queryKey: queryKeys.jobTime.list(input.jobId),
    queryFn: () => getEntriesFn({ data: input }),
    enabled: !!input.jobId,
    // Refetch more frequently to keep timer state in sync
    refetchInterval: (query) => {
      // Refetch every 30s if there are active timers
      const data = query.state.data;
      return data?.activeTimers && data.activeTimers > 0 ? 30000 : false;
    },
  });
}

// ============================================================================
// GET TIME ENTRY
// ============================================================================

/**
 * Get a single time entry by ID.
 */
export function useTimeEntry(input: GetTimeEntryInput) {
  const getFn = useServerFn(getTimeEntry);

  return useQuery({
    queryKey: queryKeys.jobTime.detail(input.entryId),
    queryFn: () => getFn({ data: input }),
    enabled: !!input.entryId,
  });
}

// ============================================================================
// CALCULATE JOB LABOR COST
// ============================================================================

/**
 * Calculate labor cost for a job based on hours worked.
 */
export function useJobLaborCost(input: CalculateJobLaborCostInput) {
  const calculateFn = useServerFn(calculateJobLaborCost);

  return useQuery({
    queryKey: queryKeys.jobTime.cost(input.jobId, input.hourlyRate),
    queryFn: () => calculateFn({ data: input }),
    enabled: !!input.jobId && input.hourlyRate >= 0,
  });
}

// ============================================================================
// START TIMER
// ============================================================================

/**
 * Start a timer for a job.
 */
export function useStartTimer() {
  const queryClient = useQueryClient();
  const startFn = useServerFn(startTimer);

  return useMutation({
    mutationFn: (input: StartTimerInput) => startFn({ data: input }),
    onSuccess: (_data, variables) => {
      // Invalidate the job's time entries list
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTime.list(variables.jobId),
      });
    },
  });
}

// ============================================================================
// STOP TIMER
// ============================================================================

/**
 * Stop a running timer.
 */
export function useStopTimer(jobId: string) {
  const queryClient = useQueryClient();
  const stopFn = useServerFn(stopTimer);

  return useMutation({
    mutationFn: (input: StopTimerInput) => stopFn({ data: input }),
    onSuccess: () => {
      // Invalidate the job's time entries list
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTime.list(jobId),
      });
      // Also invalidate any cost calculations
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTime.costs(),
      });
    },
  });
}

// ============================================================================
// CREATE MANUAL ENTRY
// ============================================================================

/**
 * Create a manual time entry.
 */
export function useCreateManualEntry() {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createManualEntry);

  return useMutation({
    mutationFn: (input: CreateManualEntryInput) => createFn({ data: input }),
    onSuccess: (_data, variables) => {
      // Invalidate the job's time entries list
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTime.list(variables.jobId),
      });
      // Also invalidate cost calculations
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTime.costs(),
      });
    },
  });
}

// ============================================================================
// UPDATE TIME ENTRY
// ============================================================================

/**
 * Update a time entry.
 */
export function useUpdateTimeEntry(jobId: string) {
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateTimeEntry);

  return useMutation({
    mutationFn: (input: UpdateTimeEntryInput) => updateFn({ data: input }),
    onSuccess: (_data, variables) => {
      // Invalidate the job's time entries list
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTime.list(jobId),
      });
      // Invalidate the specific entry detail if cached
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTime.detail(variables.entryId),
      });
      // Also invalidate cost calculations
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTime.costs(),
      });
    },
  });
}

// ============================================================================
// DELETE TIME ENTRY
// ============================================================================

/**
 * Delete a time entry.
 */
export function useDeleteTimeEntry(jobId: string) {
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteTimeEntry);

  return useMutation({
    mutationFn: (input: DeleteTimeEntryInput) => deleteFn({ data: input }),
    onSuccess: (_data, variables) => {
      // Invalidate the job's time entries list
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTime.list(jobId),
      });
      // Remove the specific entry from cache
      queryClient.removeQueries({
        queryKey: queryKeys.jobTime.detail(variables.entryId),
      });
      // Also invalidate cost calculations
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTime.costs(),
      });
    },
  });
}
