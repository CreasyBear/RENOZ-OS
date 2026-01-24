/**
 * Job Event Templates Hooks
 *
 * React Query hooks for managing job event templates and calendar exports
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
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
} from '@/lib/schemas';
import type {
  ListJobTemplatesInput,
  DeleteJobTemplateInput,
  CreateJobFromTemplateInput,
} from '@/lib/schemas';

// Query keys are now centralized in @/lib/query-keys.ts

// ============================================================================
// TEMPLATES QUERIES
// ============================================================================

/**
 * Get all job templates
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
 * Get a specific job template
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
// TEMPLATES MUTATIONS
// ============================================================================

/**
 * Create a new job template
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
 * Update an existing job template
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
 * Delete a job template
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
 * Create a job from template
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
 * Export calendar data
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
