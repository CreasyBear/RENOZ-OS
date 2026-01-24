/**
 * Scheduled Reports Hooks
 *
 * TanStack Query hooks for scheduled reports:
 * - List reports with filtering
 * - Report detail and status
 * - CRUD operations
 * - Execute/run reports
 * - Bulk operations
 *
 * @see src/server/functions/dashboard/scheduled-reports.ts
 * @see src/lib/schemas/dashboard/scheduled-reports.ts
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  listScheduledReports,
  getScheduledReport,
  getScheduledReportStatus,
  createScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
  executeScheduledReport,
  bulkUpdateScheduledReports,
  bulkDeleteScheduledReports,
} from '@/server/functions/dashboard';
import type {
  ListScheduledReportsInput,
  CreateScheduledReportInput,
  UpdateScheduledReportInput,
  BulkUpdateScheduledReportsInput,
  BulkDeleteScheduledReportsInput,
} from '@/lib/schemas/dashboard/scheduled-reports';

// ============================================================================
// TYPES
// ============================================================================

export interface UseScheduledReportsOptions extends Partial<ListScheduledReportsInput> {
  enabled?: boolean;
}

export interface UseScheduledReportOptions {
  id: string;
  enabled?: boolean;
}

// ============================================================================
// LIST HOOKS
// ============================================================================

/**
 * List scheduled reports with filtering and pagination.
 */
export function useScheduledReports(options: UseScheduledReportsOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.dashboard.scheduledReports.list(filters),
    queryFn: () => listScheduledReports({ data: filters as ListScheduledReportsInput }),
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// DETAIL HOOKS
// ============================================================================

/**
 * Get a single scheduled report by ID.
 */
export function useScheduledReport({ id, enabled = true }: UseScheduledReportOptions) {
  return useQuery({
    queryKey: queryKeys.dashboard.scheduledReports.detail(id),
    queryFn: () => getScheduledReport({ data: { id } }),
    enabled: enabled && !!id,
    staleTime: 60 * 1000,
  });
}

/**
 * Get scheduled report status (last run, next run, etc.).
 */
export function useScheduledReportStatus({ id, enabled = true }: UseScheduledReportOptions) {
  return useQuery({
    queryKey: queryKeys.dashboard.scheduledReports.status(id),
    queryFn: () => getScheduledReportStatus({ data: { id } }),
    enabled: enabled && !!id,
    staleTime: 30 * 1000, // 30 seconds - status can change frequently
    refetchOnWindowFocus: true,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new scheduled report.
 */
export function useCreateScheduledReport() {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createScheduledReport);

  return useMutation({
    mutationFn: (input: CreateScheduledReportInput) => createFn({ data: input }),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.dashboard.scheduledReports.detail(result.id), result);
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.scheduledReports.lists() });
    },
  });
}

/**
 * Update an existing scheduled report.
 */
export function useUpdateScheduledReport() {
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateScheduledReport);

  return useMutation({
    mutationFn: (input: UpdateScheduledReportInput) => updateFn({ data: input }),
    onSuccess: (result, variables) => {
      queryClient.setQueryData(queryKeys.dashboard.scheduledReports.detail(variables.id), result);
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.scheduledReports.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.scheduledReports.status(variables.id),
      });
    },
  });
}

/**
 * Delete a scheduled report.
 */
export function useDeleteScheduledReport() {
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteScheduledReport);

  return useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.dashboard.scheduledReports.detail(id) });
      queryClient.removeQueries({ queryKey: queryKeys.dashboard.scheduledReports.status(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.scheduledReports.lists() });
    },
  });
}

/**
 * Manually execute/run a scheduled report.
 */
export function useExecuteScheduledReport() {
  const queryClient = useQueryClient();
  const executeFn = useServerFn(executeScheduledReport);

  return useMutation({
    mutationFn: (id: string) => executeFn({ data: { id } }),
    onSuccess: (_, id) => {
      // Refresh status to show updated lastRunAt and nextRunAt
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.scheduledReports.status(id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.scheduledReports.detail(id),
      });
    },
  });
}

// ============================================================================
// BULK MUTATION HOOKS
// ============================================================================

/**
 * Bulk update scheduled reports.
 */
export function useBulkUpdateScheduledReports() {
  const queryClient = useQueryClient();
  const bulkUpdateFn = useServerFn(bulkUpdateScheduledReports);

  return useMutation({
    mutationFn: (input: BulkUpdateScheduledReportsInput) => bulkUpdateFn({ data: input }),
    onSuccess: (_, variables) => {
      // Invalidate each affected report
      variables.ids.forEach((id) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard.scheduledReports.detail(id),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard.scheduledReports.status(id),
        });
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.scheduledReports.lists() });
    },
  });
}

/**
 * Bulk delete scheduled reports.
 */
export function useBulkDeleteScheduledReports() {
  const queryClient = useQueryClient();
  const bulkDeleteFn = useServerFn(bulkDeleteScheduledReports);

  return useMutation({
    mutationFn: (input: BulkDeleteScheduledReportsInput) => bulkDeleteFn({ data: input }),
    onSuccess: (_, variables) => {
      // Remove each from cache
      variables.ids.forEach((id) => {
        queryClient.removeQueries({
          queryKey: queryKeys.dashboard.scheduledReports.detail(id),
        });
        queryClient.removeQueries({
          queryKey: queryKeys.dashboard.scheduledReports.status(id),
        });
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.scheduledReports.lists() });
    },
  });
}

// ============================================================================
// TYPES EXPORT
// ============================================================================

export type {
  ListScheduledReportsInput,
  CreateScheduledReportInput,
  UpdateScheduledReportInput,
  BulkUpdateScheduledReportsInput,
  BulkDeleteScheduledReportsInput,
};
