/**
 * Job Materials TanStack Query Hooks
 *
 * Provides data fetching and mutation hooks for job BOM management.
 * Uses TanStack Query for caching, invalidation, and optimistic updates.
 *
 * @see src/server/functions/job-materials.ts for server functions
 * @see src/lib/schemas/job-materials.ts for types
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-002c
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  listJobMaterials,
  addJobMaterial,
  updateJobMaterial,
  removeJobMaterial,
  reserveJobStock,
  calculateJobMaterialCost,
  getJobMaterial,
} from '@/server/functions/jobs/job-materials';
import type {
  ListJobMaterialsInput,
  AddJobMaterialInput,
  UpdateJobMaterialInput,
  RemoveJobMaterialInput,
  ReserveJobStockInput,
  CalculateJobMaterialCostInput,
  GetJobMaterialInput,
} from '@/lib/schemas';

// Query keys are now centralized in @/lib/query-keys.ts

// ============================================================================
// LIST JOB MATERIALS
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

// ============================================================================
// GET JOB MATERIAL
// ============================================================================

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

// ============================================================================
// CALCULATE JOB MATERIAL COST
// ============================================================================

/**
 * Calculate total material cost for a job.
 */
export function useJobMaterialCost(input: CalculateJobMaterialCostInput) {
  const calculateFn = useServerFn(calculateJobMaterialCost);

  return useQuery({
    queryKey: queryKeys.jobMaterials.cost(input.jobId),
    queryFn: () => calculateFn({ data: input }),
    enabled: !!input.jobId,
  });
}

// ============================================================================
// ADD JOB MATERIAL
// ============================================================================

/**
 * Add a material to a job's BOM.
 */
export function useAddJobMaterial() {
  const queryClient = useQueryClient();
  const addFn = useServerFn(addJobMaterial);

  return useMutation({
    mutationFn: (input: AddJobMaterialInput) => addFn({ data: input }),
    onSuccess: (_data, variables) => {
      // Invalidate the material list for this job
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobMaterials.list(variables.jobId),
      });
      // Also invalidate cost calculation
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobMaterials.cost(variables.jobId),
      });
    },
  });
}

// ============================================================================
// UPDATE JOB MATERIAL
// ============================================================================

/**
 * Update a job material entry.
 */
export function useUpdateJobMaterial() {
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateJobMaterial);

  return useMutation({
    mutationFn: (input: UpdateJobMaterialInput) => updateFn({ data: input }),
    onSuccess: (data) => {
      // Invalidate both the detail and list queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobMaterials.detail(data.material.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobMaterials.list(data.material.jobId),
      });
      // Also invalidate cost calculation
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobMaterials.cost(data.material.jobId),
      });
    },
  });
}

// ============================================================================
// REMOVE JOB MATERIAL
// ============================================================================

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
      // Invalidate the material list for this job
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobMaterials.list(variables.jobId),
      });
      // Also invalidate cost calculation
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobMaterials.cost(variables.jobId),
      });
    },
  });
}

// ============================================================================
// RESERVE JOB STOCK
// ============================================================================

/**
 * Reserve inventory for a job's materials.
 */
export function useReserveJobStock() {
  const queryClient = useQueryClient();
  const reserveFn = useServerFn(reserveJobStock);

  return useMutation({
    mutationFn: (input: ReserveJobStockInput) => reserveFn({ data: input }),
    onSuccess: (_data, variables) => {
      // Invalidate the material list to refresh any reservation status
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobMaterials.list(variables.jobId),
      });
    },
  });
}
