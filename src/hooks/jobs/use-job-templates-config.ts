/**
 * Job Templates & Checklists Hooks
 *
 * TanStack Query hooks for job templates, checklist templates, and checklist application.
 * Consolidates template and configuration management for jobs.
 *
 * @see src/server/functions/jobs/job-templates.ts
 * @see src/server/functions/jobs/checklists.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';

// Job templates imports
import {
  listJobTemplates,
  getJobTemplate,
  createJobTemplate,
  updateJobTemplate,
  deleteJobTemplate,
  createJobFromTemplate,
  exportCalendarData,
} from '@/server/functions/jobs/job-templates';
import type {
  CreateJobTemplateInput,
  UpdateJobTemplateInput,
  CalendarExportConfig,
  ListJobTemplatesInput,
  DeleteJobTemplateInput,
  CreateJobFromTemplateInput,
} from '@/lib/schemas';

// Checklists imports
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
} from '@/server/functions/jobs/checklists';
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
// JOB TEMPLATES QUERIES
// ============================================================================

/**
 * Get all job templates.
 */
export function useJobTemplates(options?: ListJobTemplatesInput) {
  const listFn = useServerFn(listJobTemplates);

  return useQuery({
    queryKey: queryKeys.jobTemplates.templates(),
    queryFn: () => listFn({ data: options || {} }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get a specific job template by ID.
 */
export function useJobTemplate(templateId: string | undefined) {
  const getFn = useServerFn(getJobTemplate);

  return useQuery({
    queryKey: queryKeys.jobTemplates.template(templateId || ''),
    queryFn: () => getFn({ data: { templateId: templateId! } }),
    enabled: !!templateId,
  });
}

// ============================================================================
// JOB TEMPLATES MUTATIONS
// ============================================================================

/**
 * Create a new job template.
 */
export function useCreateJobTemplate() {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createJobTemplate);

  return useMutation({
    mutationFn: (input: CreateJobTemplateInput) => createFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobTemplates.templates() });
    },
  });
}

/**
 * Update an existing job template.
 */
export function useUpdateJobTemplate() {
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateJobTemplate);

  return useMutation({
    mutationFn: (input: UpdateJobTemplateInput) => updateFn({ data: input }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobTemplates.templates() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTemplates.template(variables.templateId),
      });
    },
  });
}

/**
 * Delete a job template.
 */
export function useDeleteJobTemplate() {
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteJobTemplate);

  return useMutation({
    mutationFn: (input: DeleteJobTemplateInput) => deleteFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobTemplates.templates() });
    },
  });
}

/**
 * Create a job from a template.
 */
export function useCreateJobFromTemplate() {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createJobFromTemplate);

  return useMutation({
    mutationFn: (input: CreateJobFromTemplateInput) => createFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobAssignments.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.all });
    },
  });
}

// ============================================================================
// CALENDAR EXPORT
// ============================================================================

/**
 * Export calendar data to downloadable file.
 */
export function useExportCalendarData() {
  const exportFn = useServerFn(exportCalendarData);

  return useMutation({
    mutationFn: (config: CalendarExportConfig) => exportFn({ data: config }),
    onSuccess: (data) => {
      // Trigger download
      const blob = new Blob([data.content], { type: data.mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  });
}

// ============================================================================
// CHECKLIST TEMPLATES QUERIES
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
 * Get a single checklist template by ID.
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
// CHECKLIST TEMPLATES MUTATIONS
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
// JOB CHECKLIST APPLICATION
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
