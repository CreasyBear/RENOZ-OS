/**
 * Audit Logs Hooks
 *
 * TanStack Query hooks for audit trail functionality.
 * Used by admin audit route for viewing and exporting audit logs.
 *
 * @see src/server/functions/_shared/audit-logs.ts for server functions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  listAuditLogs,
  getAuditStats,
  exportAuditLogs,
} from '@/server/functions/_shared/audit-logs';

// ============================================================================
// LIST AUDIT LOGS
// ============================================================================

export interface UseAuditLogsOptions {
  page?: number;
  pageSize?: number;
  sortOrder?: 'asc' | 'desc';
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  enabled?: boolean;
}

/**
 * Hook to fetch paginated audit logs with filters.
 */
export function useAuditLogs(options: UseAuditLogsOptions = {}) {
  const { enabled = true, ...filters } = options;

  const listFilters = {
    ...filters,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 50,
    sortOrder: filters.sortOrder ?? 'desc',
  };
  return useQuery({
    queryKey: queryKeys.auditLogs.list(listFilters),
    queryFn: async () => {
      const result = await listAuditLogs({
        data: {
          page: listFilters.page,
          pageSize: listFilters.pageSize,
          sortOrder: listFilters.sortOrder,
          userId: listFilters.userId,
          action: listFilters.action,
          entityType: listFilters.entityType,
          entityId: listFilters.entityId,
          dateFrom: listFilters.dateFrom,
          dateTo: listFilters.dateTo,
        },
      
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================================================
// AUDIT STATS
// ============================================================================

export interface UseAuditStatsOptions {
  dateFrom?: Date;
  dateTo?: Date;
  enabled?: boolean;
}

/**
 * Hook to fetch audit log statistics for dashboard.
 */
export function useAuditStats(options: UseAuditStatsOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.auditLogs.stats(filters),
    queryFn: async () => {
      const result = await getAuditStats({
        data: {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        },
      
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// EXPORT AUDIT LOGS
// ============================================================================

export interface ExportAuditLogsInput {
  format: 'json' | 'csv';
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Hook for exporting audit logs.
 * Returns a mutation that triggers the export.
 */
export function useExportAuditLogs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ExportAuditLogsInput) =>
      exportAuditLogs({
        data: {
          format: input.format,
          userId: input.userId,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
          page: 1,
          pageSize: 10000, // Max export size
        },
      }),
    onSuccess: () => {
      // Optionally invalidate stats as export is logged
      queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs.stats() });
    },
  });
}
