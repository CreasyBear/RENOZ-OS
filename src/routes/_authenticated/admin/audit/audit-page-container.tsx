/**
 * Audit Log Container Component
 *
 * Handles data fetching for audit log viewer.
 *
 * @source logs from useAuditLogs hook
 * @source stats from useAuditStats hook
 * @source export from useExportAuditLogs hook
 *
 * @see src/routes/_authenticated/admin/audit/audit-page.tsx - Presenter component
 */
import { useState, useCallback } from 'react';
import { subDays } from 'date-fns';
import { useAuditLogs, useAuditStats, useExportAuditLogs } from '@/hooks/_shared';
import { toast } from '@/hooks';
import { format } from 'date-fns';
import type { AuditLog } from '@/lib/schemas/users';
import { AdminTableSkeleton } from '@/components/skeletons/admin';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import AuditLogPagePresenter from './audit-page';

const TIME_RANGES = [
  { value: '24h', label: 'Last 24 hours', days: 1 },
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
  { value: 'all', label: 'All time', days: 0 },
];

export default function AuditLogPageContainer() {
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [entityType, setEntityType] = useState('all');
  const [actionType, setActionType] = useState('all');
  const [timeRange, setTimeRange] = useState('7d');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Calculate date range from time range
  const getDateFrom = useCallback(() => {
    const timeRangeConfig = TIME_RANGES.find((t) => t.value === timeRange);
    return timeRangeConfig?.days ? subDays(new Date(), timeRangeConfig.days) : undefined;
  }, [timeRange]);

  // Data fetching hooks
  const {
    data: logsData,
    isLoading: isLoadingLogs,
    error: logsError,
    refetch: refetchLogs,
  } = useAuditLogs({
    page,
    pageSize,
    entityType: entityType !== 'all' ? entityType : undefined,
    action: actionType !== 'all' ? actionType : undefined,
    dateFrom: getDateFrom(),
  });

  const { data: stats, isLoading: isLoadingStats, error: statsError } = useAuditStats({});

  const exportMutation = useExportAuditLogs();

  // Extract data from query results (typed per SCHEMA-TRACE)
  // Cast: server returns metadata as AuditLogMetadata; schema expects Record<string, unknown>
  const logs: AuditLog[] = (logsData?.items ?? []) as AuditLog[];
  const total = logsData?.pagination?.totalItems || 0;
  const totalPages = Math.ceil(total / pageSize);

  // Handle search/filter application
  const handleSearch = useCallback(() => {
    setPage(1);
    refetchLogs();
  }, [refetchLogs]);

  // Handle export
  const handleExport = useCallback(
    async (exportFormat: 'json' | 'csv') => {
      try {
        const result = await exportMutation.mutateAsync({
          format: exportFormat,
          entityType: entityType !== 'all' ? entityType : undefined,
          action: actionType !== 'all' ? actionType : undefined,
          dateFrom: getDateFrom(),
        });

        // Download file
        const blob = new Blob([result.content], {
          type: exportFormat === 'csv' ? 'text/csv' : 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.${exportFormat}`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success(`Exported ${result.count} audit entries`);
      } catch {
        toast.error('Failed to export audit logs');
      }
    },
    [exportMutation, entityType, actionType, getDateFrom]
  );

  // Handle page changes
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // Loading state
  if (isLoadingLogs || isLoadingStats) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Content>
          <AdminTableSkeleton />
        </PageLayout.Content>
      </PageLayout>
    );
  }

  // Error state
  if (logsError || statsError) {
    return (
      <RouteErrorFallback
        error={logsError || statsError || new Error('Failed to load audit logs')}
        parentRoute="/admin"
      />
    );
  }

  return (
    <AuditLogPagePresenter
      logs={logs}
      total={total}
      totalPages={totalPages}
      page={page}
      pageSize={pageSize}
      stats={stats}
      isLoadingLogs={isLoadingLogs}
      searchQuery={searchQuery}
      entityType={entityType}
      actionType={actionType}
      timeRange={timeRange}
      exportMutation={exportMutation}
      onSearchQueryChange={setSearchQuery}
      onEntityTypeChange={setEntityType}
      onActionTypeChange={setActionType}
      onTimeRangeChange={setTimeRange}
      onSearch={handleSearch}
      onExport={handleExport}
      onPageChange={handlePageChange}
      onRefetch={refetchLogs}
    />
  );
}
