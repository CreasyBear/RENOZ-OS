/**
 * Checklists TanStack Query Hooks
 *
 * Provides data fetching and mutation hooks for checklist management.
 * Uses TanStack Query for caching, invalidation, and optimistic updates.
 *
 * @see src/server/functions/checklists.ts for server functions
 * @see src/lib/schemas/checklists.ts for types
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-004c
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  listChecklistTemplates,
  getChecklistTemplate,
  createChecklistTemplate,
  updateChecklistTemplate,
  deleteChecklistTemplate,
  applyChecklistToJob,
  updateChecklistItem,
  getJobChecklist,
  getChecklistItem,
} from '@/server/functions/support/checklists';
import type {
  ListChecklistTemplatesInput,
  GetChecklistTemplateInput,
  CreateChecklistTemplateInput,
  UpdateChecklistTemplateInput,
  DeleteChecklistTemplateInput,
  ApplyChecklistToJobInput,
  UpdateChecklistItemInput,
  GetJobChecklistInput,
  GetChecklistItemInput,
} from '@/lib/schemas';

// ============================================================================
// TEMPLATE QUERIES
// ============================================================================

/**
 * Get all checklist templates.
 */
export function useChecklistTemplates(
  input: ListChecklistTemplatesInput = { includeInactive: false }
) {
  const listFn = useServerFn(listChecklistTemplates);

  return useQuery({
    queryKey: queryKeys.checklists.templateList(input.includeInactive),
    queryFn: () => listFn({ data: input }),
  });
}

/**
 * Get a single template by ID.
 */
export function useChecklistTemplate(input: GetChecklistTemplateInput) {
  const getFn = useServerFn(getChecklistTemplate);

  return useQuery({
    queryKey: queryKeys.checklists.templateDetail(input.templateId),
    queryFn: () => getFn({ data: input }),
    enabled: !!input.templateId,
  });
}

// ============================================================================
// TEMPLATE MUTATIONS
// ============================================================================

/**
 * Create a new checklist template.
 */
export function useCreateChecklistTemplate() {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createChecklistTemplate);

  return useMutation({
    mutationFn: (input: CreateChecklistTemplateInput) => createFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.checklists.templates(),
      });
    },
  });
}

/**
 * Update a checklist template.
 */
export function useUpdateChecklistTemplate() {
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateChecklistTemplate);

  return useMutation({
    mutationFn: (input: UpdateChecklistTemplateInput) => updateFn({ data: input }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.checklists.templates(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.checklists.templateDetail(variables.templateId),
      });
    },
  });
}

/**
 * Delete (soft-delete) a checklist template.
 */
export function useDeleteChecklistTemplate() {
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteChecklistTemplate);

  return useMutation({
    mutationFn: (input: DeleteChecklistTemplateInput) => deleteFn({ data: input }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.checklists.templates(),
      });
      queryClient.removeQueries({
        queryKey: queryKeys.checklists.templateDetail(variables.templateId),
      });
    },
  });
}

// ============================================================================
// JOB CHECKLIST QUERIES
// ============================================================================

/**
 * Get a job's checklist with all items.
 */
export function useJobChecklist(input: GetJobChecklistInput) {
  const getFn = useServerFn(getJobChecklist);

  return useQuery({
    queryKey: queryKeys.checklists.jobChecklist(input.jobId),
    queryFn: () => getFn({ data: input }),
    enabled: !!input.jobId,
  });
}

/**
 * Get a single checklist item.
 */
export function useChecklistItem(input: GetChecklistItemInput) {
  const getFn = useServerFn(getChecklistItem);

  return useQuery({
    queryKey: queryKeys.checklists.item(input.itemId),
    queryFn: () => getFn({ data: input }),
    enabled: !!input.itemId,
  });
}

// ============================================================================
// JOB CHECKLIST MUTATIONS
// ============================================================================

/**
 * Apply a checklist template to a job.
 */
export function useApplyChecklistToJob() {
  const queryClient = useQueryClient();
  const applyFn = useServerFn(applyChecklistToJob);

  return useMutation({
    mutationFn: (input: ApplyChecklistToJobInput) => applyFn({ data: input }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.checklists.jobChecklist(variables.jobId),
      });
    },
  });
}

/**
 * Update a checklist item (mark complete, add notes/photo).
 */
export function useUpdateChecklistItem(jobId: string) {
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateChecklistItem);

  return useMutation({
    mutationFn: (input: UpdateChecklistItemInput) => updateFn({ data: input }),
    onSuccess: (_data, variables) => {
      // Invalidate the job checklist to refresh stats
      queryClient.invalidateQueries({
        queryKey: queryKeys.checklists.jobChecklist(jobId),
      });
      // Invalidate the specific item
      queryClient.invalidateQueries({
        queryKey: queryKeys.checklists.item(variables.itemId),
      });
    },
  });
}
