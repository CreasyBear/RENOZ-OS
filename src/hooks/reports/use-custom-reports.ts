/**
 * Custom Reports Hooks
 *
 * TanStack Query hooks for user-defined reports:
 * - List reports with filtering
 * - Report detail
 * - CRUD operations
 * - Execute report
 *
 * @see src/server/functions/reports/custom-reports.ts
 * @see src/lib/schemas/reports/custom-reports.ts
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  listCustomReports,
  getCustomReport,
  createCustomReport,
  updateCustomReport,
  deleteCustomReport,
  executeCustomReport,
} from '@/server/functions/reports';
import type {
  ListCustomReportsInput,
  CreateCustomReportInput,
  UpdateCustomReportInput,
  ExecuteCustomReportInput,
  ReportResult,
} from '@/lib/schemas/reports/custom-reports';

// ============================================================================
// TYPES
// ============================================================================

export interface UseCustomReportsOptions extends Partial<ListCustomReportsInput> {
  enabled?: boolean;
}

export interface UseCustomReportOptions {
  id: string;
  enabled?: boolean;
}

// ============================================================================
// LIST HOOKS
// ============================================================================

/**
 * List custom reports with filtering and pagination.
 */
export function useCustomReports(options: UseCustomReportsOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.reports.customReports.list(filters),
    queryFn: () => listCustomReports({ data: filters as ListCustomReportsInput }),
    enabled,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// DETAIL HOOKS
// ============================================================================

/**
 * Get a single custom report by ID.
 */
export function useCustomReport({ id, enabled = true }: UseCustomReportOptions) {
  return useQuery({
    queryKey: queryKeys.reports.customReports.detail(id),
    queryFn: () => getCustomReport({ data: { id } }),
    enabled: enabled && !!id,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new custom report.
 */
export function useCreateCustomReport() {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createCustomReport);

  return useMutation({
    mutationFn: (input: CreateCustomReportInput) => createFn({ data: input }),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.reports.customReports.detail(result.id), result);
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.customReports.lists() });
    },
  });
}

/**
 * Update an existing custom report.
 */
export function useUpdateCustomReport() {
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateCustomReport);

  return useMutation({
    mutationFn: (input: UpdateCustomReportInput) => updateFn({ data: input }),
    onSuccess: (result, variables) => {
      queryClient.setQueryData(queryKeys.reports.customReports.detail(variables.id), result);
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.customReports.lists() });
    },
  });
}

/**
 * Delete a custom report.
 */
export function useDeleteCustomReport() {
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteCustomReport);

  return useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.reports.customReports.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.customReports.lists() });
    },
  });
}

/**
 * Execute a custom report.
 */
export function useExecuteCustomReport() {
  const queryClient = useQueryClient();
  const executeFn = useServerFn(executeCustomReport);

  return useMutation({
    mutationFn: (input: ExecuteCustomReportInput) => executeFn({ data: input }),
    onSuccess: (result: ReportResult, variables) => {
      queryClient.setQueryData(
        queryKeys.reports.customReports.results(variables.id, {
          dateFrom: variables.dateFrom,
          dateTo: variables.dateTo,
          limit: variables.limit,
        }),
        result
      );
    },
  });
}

// ============================================================================
// TYPES EXPORT
// ============================================================================

export type {
  ListCustomReportsInput,
  CreateCustomReportInput,
  UpdateCustomReportInput,
  ExecuteCustomReportInput,
};
