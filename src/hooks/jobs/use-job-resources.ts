/**
 * Job Resources Hooks
 *
 * TanStack Query hooks for job materials, time tracking, and cost analysis.
 * Consolidates resource management hooks for job assignments.
 *
 * @see src/server/functions/jobs/job-materials.ts
 * @see src/server/functions/jobs/job-time.ts
 * @see src/server/functions/jobs/job-costing.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';

// Materials imports
import {
  listJobMaterials,
  addJobMaterial,
  updateJobMaterial,
  removeJobMaterial,
  reserveJobStock,
  calculateJobMaterialCost,
  getJobMaterial,
  recordMaterialInstallation,
} from '@/server/functions/jobs/job-materials';
import type {
  ListJobMaterialsInput,
  AddJobMaterialInput,
  UpdateJobMaterialInput,
  RemoveJobMaterialInput,
  ReserveJobStockInput,
  CalculateJobMaterialCostInput,
  GetJobMaterialInput,
  RecordMaterialInstallationInput,
} from '@/lib/schemas';

// Time tracking imports
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

// Costing imports
import {
  calculateJobCost,
  getJobProfitability,
  getJobCostingReport,
} from '@/server/functions/jobs/job-costing';
import type {
  CalculateJobCostInput,
  GetJobProfitabilityInput,
  GetJobCostingReportInput,
} from '@/lib/schemas';

// ============================================================================
// MATERIALS HOOKS
// ============================================================================

/**
 * Get all materials for a job assignment.
 */
export function useJobMaterials(input: ListJobMaterialsInput) {
  const listFn = useServerFn(listJobMaterials);

  return useQuery({
    queryKey: queryKeys.jobMaterials.list(input.jobId),
    queryFn: () => listFn({ data: input }),
    enabled: !!input.jobId,
  });
}

/**
 * Get a single material by ID.
 */
export function useJobMaterial(input: GetJobMaterialInput) {
  const getFn = useServerFn(getJobMaterial);

  return useQuery({
    queryKey: queryKeys.jobMaterials.detail(input.materialId),
    queryFn: () => getFn({ data: input }),
    enabled: !!input.materialId,
  });
}

/**
 * Calculate total material cost for a job.
 */
export function useJobMaterialCost(input: CalculateJobMaterialCostInput) {
  const calculateFn = useServerFn(calculateJobMaterialCost);

  return useQuery({
    queryKey: queryKeys.jobMaterials.cost.byJob(input.jobId),
    queryFn: () => calculateFn({ data: input }),
    enabled: !!input.jobId,
  });
}

/**
 * Add a material to a job's BOM.
 */
export function useAddJobMaterial() {
  const queryClient = useQueryClient();
  const addFn = useServerFn(addJobMaterial);

  return useMutation({
    mutationFn: (input: AddJobMaterialInput) => addFn({ data: input }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobMaterials.list(variables.jobId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobMaterials.cost.byJob(variables.jobId),
      });
    },
  });
}

/**
 * Update a job material entry.
 */
export function useUpdateJobMaterial() {
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateJobMaterial);

  return useMutation({
    mutationFn: (input: UpdateJobMaterialInput) => updateFn({ data: input }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobMaterials.detail(data.material.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobMaterials.list(data.material.jobId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobMaterials.cost.byJob(data.material.jobId),
      });
    },
  });
}

/**
 * Remove a material from a job's BOM.
 */
export function useRemoveJobMaterial() {
  const queryClient = useQueryClient();
  const removeFn = useServerFn(removeJobMaterial);

  return useMutation({
    mutationFn: ({ materialId, jobId: _jobId }: RemoveJobMaterialInput & { jobId: string }) =>
      removeFn({ data: { materialId } }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobMaterials.list(variables.jobId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobMaterials.cost.byJob(variables.jobId),
      });
    },
  });
}

/**
 * Reserve inventory for a job's materials.
 */
export function useReserveJobStock() {
  const queryClient = useQueryClient();
  const reserveFn = useServerFn(reserveJobStock);

  return useMutation({
    mutationFn: (input: ReserveJobStockInput) => reserveFn({ data: input }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobMaterials.list(variables.jobId),
      });
    },
  });
}

// ============================================================================
// TIME TRACKING HOOKS
// ============================================================================

/**
 * Get all time entries for a job with summary.
 */
export function useJobTimeEntries(input: GetJobTimeEntriesInput) {
  const getEntriesFn = useServerFn(getJobTimeEntries);

  return useQuery({
    queryKey: queryKeys.jobTime.entries(input.jobId),
    queryFn: () => getEntriesFn({ data: input }),
    enabled: !!input.jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.activeTimers && data.activeTimers > 0 ? 30000 : false;
    },
  });
}

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

/**
 * Calculate labor cost for a job based on hours worked.
 */
export function useJobLaborCost(input: CalculateJobLaborCostInput) {
  const calculateFn = useServerFn(calculateJobLaborCost);

  return useQuery({
    queryKey: queryKeys.jobTime.costs.byJob(input.jobId),
    queryFn: () => calculateFn({ data: input }),
    enabled: !!input.jobId && input.hourlyRate >= 0,
  });
}

/**
 * Start a timer for a job.
 */
export function useStartTimer() {
  const queryClient = useQueryClient();
  const startFn = useServerFn(startTimer);

  return useMutation({
    mutationFn: (input: StartTimerInput) => startFn({ data: input }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTime.entries(variables.jobId),
      });
    },
  });
}

/**
 * Stop a running timer.
 */
export function useStopTimer(jobId: string) {
  const queryClient = useQueryClient();
  const stopFn = useServerFn(stopTimer);

  return useMutation({
    mutationFn: (input: StopTimerInput) => stopFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTime.entries(jobId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTime.costs.all(),
      });
    },
  });
}

/**
 * Create a manual time entry.
 */
export function useCreateManualEntry() {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createManualEntry);

  return useMutation({
    mutationFn: (input: CreateManualEntryInput) => createFn({ data: input }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTime.entries(variables.jobId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTime.costs.all(),
      });
    },
  });
}

/**
 * Update a time entry.
 */
export function useUpdateTimeEntry(jobId: string) {
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateTimeEntry);

  return useMutation({
    mutationFn: (input: UpdateTimeEntryInput) => updateFn({ data: input }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTime.entries(jobId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTime.detail(variables.entryId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTime.costs.all(),
      });
    },
  });
}

/**
 * Delete a time entry.
 */
export function useDeleteTimeEntry(jobId: string) {
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteTimeEntry);

  return useMutation({
    mutationFn: (input: DeleteTimeEntryInput) => deleteFn({ data: input }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTime.entries(jobId),
      });
      queryClient.removeQueries({
        queryKey: queryKeys.jobTime.detail(variables.entryId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTime.costs.all(),
      });
    },
  });
}

// ============================================================================
// COSTING ANALYSIS HOOKS
// ============================================================================

/**
 * Calculate a job's total cost.
 */
export function useJobCost(options: CalculateJobCostInput | undefined) {
  const calculateFn = useServerFn(calculateJobCost);

  return useQuery({
    queryKey: queryKeys.jobCosting.cost(options?.jobId ?? ''),
    queryFn: () => calculateFn({ data: options! }),
    enabled: !!options?.jobId,
  });
}

/**
 * Fetch a job's profitability analysis.
 */
export function useJobProfitability(options: GetJobProfitabilityInput | undefined) {
  const profitabilityFn = useServerFn(getJobProfitability);

  return useQuery({
    queryKey: queryKeys.jobCosting.job(options?.jobId ?? ''),
    queryFn: () => profitabilityFn({ data: options! }),
    enabled: !!options?.jobId,
  });
}

/**
 * Fetch the job costing report.
 */
export function useJobCostingReport(options: GetJobCostingReportInput) {
  const reportFn = useServerFn(getJobCostingReport);

  return useQuery({
    queryKey: queryKeys.jobCosting.list(options as unknown as Record<string, unknown>),
    queryFn: () => reportFn({ data: options }),
  });
}

// ============================================================================
// ENHANCED MATERIAL TRACKING HOOKS (Story 029)
// ============================================================================

/**
 * Record material installation with serial numbers, location, and photos.
 */
export function useRecordMaterialInstallation(jobId: string) {
  const queryClient = useQueryClient();
  const installFn = useServerFn(recordMaterialInstallation);

  return useMutation({
    mutationFn: async (input: RecordMaterialInstallationInput) => {
      return await installFn({ data: input });
    },
    onSuccess: () => {
      // Invalidate job materials list
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobs.materials(jobId),
      });
    },
  });
}
