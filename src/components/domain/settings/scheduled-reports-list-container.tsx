/**
 * Scheduled Reports List Container
 *
 * Handles data fetching, selection state, bulk actions, and mutations
 * for the scheduled reports list.
 *
 * @source reports from useScheduledReports hook
 * @source selection from useTableSelection hook
 */

import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useConfirmation } from '@/hooks';
import { confirmations } from '@/hooks/_shared/use-confirmation';
import { toast } from '@/hooks';
import { Plus, RefreshCw, Play, Pause, Trash2 } from 'lucide-react';
import { MetricCard } from '@/components/shared/metric-card';
import { FileText, CheckCircle2, PauseCircle, Clock } from 'lucide-react';
import {
  useScheduledReports,
  useCreateScheduledReport,
  useUpdateScheduledReport,
  useDeleteScheduledReport,
  useExecuteScheduledReport,
  useBulkDeleteScheduledReports,
  useBulkUpdateScheduledReports,
} from '@/hooks/reports';
import { useTableSelection, BulkActionsBar } from '@/components/shared/data-table';
import { DomainFilterBar } from '@/components/shared/filters';
import { ScheduledReportsListPresenter } from './scheduled-reports-list-presenter';
import { ScheduledReportForm } from './scheduled-report-form';
import type { ScheduledReport } from '@/lib/schemas/reports/scheduled-reports';
import type { CreateScheduledReportInput } from '@/lib/schemas/reports/scheduled-reports';
import {
  SCHEDULED_REPORTS_FILTER_CONFIG,
  DEFAULT_SCHEDULED_REPORTS_FILTERS,
} from './scheduled-reports-filter-config';
import type { ScheduledReportsFiltersState } from './scheduled-reports-filter-config';

export interface ScheduledReportsListContainerProps {
  /** Filters from URL (synced by parent route) */
  filters: ScheduledReportsFiltersState;
  /** Update filters - parent will sync to URL */
  onFiltersChange: (filters: ScheduledReportsFiltersState) => void;
  /** Optional: ID from URL to open edit form (deep link) */
  deepLinkId?: string;
  /** Callback when deep link is consumed */
  onClearDeepLink?: () => void;
}

/**
 * Map container filters to hook params.
 * Container uses null for "all"; hook uses undefined.
 */
function filtersToHookParams(filters: ScheduledReportsFiltersState) {
  return {
    search: filters.search || undefined,
    frequency: filters.frequency ?? undefined,
    format: filters.format ?? undefined,
    isActive:
      filters.isActive === null
        ? undefined
        : filters.isActive === 'active',
  };
}

export function ScheduledReportsListContainer({
  filters,
  onFiltersChange,
  deepLinkId,
  onClearDeepLink,
}: ScheduledReportsListContainerProps) {
  const confirmation = useConfirmation();
  const [formOpen, setFormOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);
  const [executingReportId, setExecutingReportId] = useState<string | null>(null);
  const openedForIdRef = useRef<string | null>(null);

  const hookParams = useMemo(() => filtersToHookParams(filters), [filters]);

  const {
    data: reportsData,
    isLoading,
    refetch,
    error,
  } = useScheduledReports({
    ...hookParams,
    pageSize: 50,
  });

  const reports = useMemo(() => reportsData?.items ?? [], [reportsData]);
  const pagination = reportsData?.pagination;
  const total = pagination?.totalItems ?? 0;

  const {
    selectedIds,
    isAllSelected,
    isPartiallySelected,
    lastClickedIndex,
    setLastClickedIndex,
    handleSelect,
    handleSelectAll,
    handleShiftClickRange,
    clearSelection,
    isSelected,
  } = useTableSelection({ items: reports });

  const handleShiftClickRangeWithIndex = useCallback(
    (rowIndex: number) => {
      if (lastClickedIndex !== null) {
        handleShiftClickRange(lastClickedIndex, rowIndex);
      }
      setLastClickedIndex(rowIndex);
    },
    [lastClickedIndex, handleShiftClickRange, setLastClickedIndex]
  );

  const handleSelectWithIndex = useCallback(
    (id: string, checked: boolean) => {
      handleSelect(id, checked);
      const idx = reports.findIndex((r) => r.id === id);
      if (idx !== -1) {
        setLastClickedIndex(idx);
      }
    },
    [handleSelect, reports, setLastClickedIndex]
  );

  const createMutation = useCreateScheduledReport();
  const updateMutation = useUpdateScheduledReport();
  const deleteMutation = useDeleteScheduledReport();
  const executeMutation = useExecuteScheduledReport();
  const bulkDeleteMutation = useBulkDeleteScheduledReports();
  const bulkUpdateMutation = useBulkUpdateScheduledReports();

  const handleCreateClick = useCallback(() => {
    setEditingReport(null);
    setFormOpen(true);
  }, []);

  const handleEditClick = useCallback((report: ScheduledReport) => {
    setEditingReport(report);
    setFormOpen(true);
  }, []);

  const handleDeleteClick = useCallback(
    async (report: ScheduledReport) => {
      const { confirmed } = await confirmation.confirm({
        ...confirmations.delete(report.name, 'report'),
      });
      if (!confirmed) return;

      try {
        await deleteMutation.mutateAsync(report.id);
        toast.success(`"${report.name}" has been deleted`);
        clearSelection();
      } catch {
        toast.error('Failed to delete report');
      }
    },
    [confirmation, deleteMutation, clearSelection]
  );

  const handleExecuteClick = useCallback(
    async (report: ScheduledReport) => {
      setExecutingReportId(report.id);
      try {
        await executeMutation.mutateAsync(report.id);
        toast.success(`"${report.name}" execution triggered`);
      } catch {
        toast.error('Failed to execute report');
      } finally {
        setExecutingReportId(null);
      }
    },
    [executeMutation]
  );

  const handleToggleActive = useCallback(
    async (report: ScheduledReport) => {
      try {
        await updateMutation.mutateAsync({
          id: report.id,
          isActive: !report.isActive,
        });
        toast.success(
          report.isActive
            ? `"${report.name}" has been paused`
            : `"${report.name}" has been activated`
        );
      } catch {
        toast.error('Failed to update report status');
      }
    },
    [updateMutation]
  );

  const handleFormSubmit = useCallback(
    async (data: CreateScheduledReportInput) => {
      try {
        if (editingReport) {
          await updateMutation.mutateAsync({ id: editingReport.id, ...data });
          toast.success(`"${data.name}" has been updated`);
        } else {
          await createMutation.mutateAsync(data);
          toast.success(`"${data.name}" has been created`);
        }
        setFormOpen(false);
        setEditingReport(null);
      } catch {
        toast.error(
          editingReport ? 'Failed to update report' : 'Failed to create report'
        );
      }
    },
    [editingReport, createMutation, updateMutation]
  );

  const handleBulkDeleteClick = useCallback(
    async () => {
      if (selectedIds.size === 0) return;

      const { confirmed } = await confirmation.confirm({
        ...confirmations.bulkDelete(selectedIds.size, 'reports'),
      });
      if (!confirmed) return;

      try {
        await bulkDeleteMutation.mutateAsync({ ids: Array.from(selectedIds) });
        toast.success(`${selectedIds.size} reports deleted`);
        clearSelection();
      } catch {
        toast.error('Failed to delete reports');
      }
    },
    [selectedIds, confirmation, bulkDeleteMutation, clearSelection]
  );

  const handleBulkToggleActive = useCallback(
    async (activate: boolean) => {
      if (selectedIds.size === 0) return;
      try {
        await bulkUpdateMutation.mutateAsync({
          ids: Array.from(selectedIds),
          updates: { isActive: activate },
        });
        toast.success(
          `${selectedIds.size} reports ${activate ? 'activated' : 'paused'}`
        );
        clearSelection();
      } catch {
        toast.error('Failed to update reports');
      }
    },
    [selectedIds, bulkUpdateMutation, clearSelection]
  );

  const handleClearFilters = useCallback(() => {
    onFiltersChange(DEFAULT_SCHEDULED_REPORTS_FILTERS);
  }, [onFiltersChange]);

  const handleFormOpenChange = useCallback(
    (open: boolean) => {
      setFormOpen(open);
      if (!open) {
        openedForIdRef.current = null;
        setEditingReport(null);
        if (deepLinkId && onClearDeepLink) onClearDeepLink();
      }
    },
    [deepLinkId, onClearDeepLink]
  );

  // Deep link: open edit form when id in URL
  useEffect(() => {
    if (!deepLinkId || isLoading) return;
    if (openedForIdRef.current === deepLinkId) return;

    const report = reports.find((r) => r.id === deepLinkId);
    if (report) {
      openedForIdRef.current = deepLinkId;
      setEditingReport(report);
      setFormOpen(true);
    } else if (reports.length > 0) {
      toast.error('Report not found');
      onClearDeepLink?.();
    }
  }, [deepLinkId, reports, isLoading, onClearDeepLink]);

  const activeCount = reports.filter((r) => r.isActive).length;
  const pausedCount = reports.filter((r) => !r.isActive).length;
  const dueTodayCount = reports.filter((r) => {
    if (!r.nextRunAt) return false;
    const hours =
      (new Date(r.nextRunAt).getTime() - Date.now()) / (1000 * 60 * 60);
    return hours > 0 && hours <= 24;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Scheduled Reports</h1>
          <p className="text-muted-foreground mt-1">
            Configure automated reports to be sent on a schedule.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleCreateClick}>
            <Plus className="h-4 w-4 mr-2" />
            Create Report
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Total Reports"
          value={total}
          icon={FileText}
          isLoading={isLoading}
        />
        <MetricCard
          title="Active"
          value={activeCount}
          icon={CheckCircle2}
          iconClassName="text-green-600"
          isLoading={isLoading}
        />
        <MetricCard
          title="Paused"
          value={pausedCount}
          icon={PauseCircle}
          iconClassName="text-amber-600"
          isLoading={isLoading}
        />
        <MetricCard
          title="Due Today"
          value={dueTodayCount}
          icon={Clock}
          iconClassName="text-blue-600"
          isLoading={isLoading}
        />
      </div>

      {/* Filters + Bulk Actions */}
      <div className="space-y-3">
        <DomainFilterBar
          config={SCHEDULED_REPORTS_FILTER_CONFIG}
          filters={filters}
          onFiltersChange={onFiltersChange}
          defaultFilters={DEFAULT_SCHEDULED_REPORTS_FILTERS}
          resultCount={total}
        />

        {selectedIds.size >= 2 && (
          <BulkActionsBar selectedCount={selectedIds.size} onClear={clearSelection}>
            <Button size="sm" variant="outline" onClick={() => handleBulkToggleActive(true)}>
              <Play className="h-4 w-4 mr-1" />
              Activate
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkToggleActive(false)}>
              <Pause className="h-4 w-4 mr-1" />
              Pause
            </Button>
            <Button size="sm" variant="destructive" onClick={handleBulkDeleteClick}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete ({selectedIds.size})
            </Button>
          </BulkActionsBar>
        )}

        <ScheduledReportsListPresenter
          reports={reports}
          isLoading={isLoading}
          error={error instanceof Error ? error : error ? new Error(String(error)) : null}
          onRetry={() => refetch()}
          filters={filters}
          onFiltersChange={onFiltersChange}
          onClearFilters={handleClearFilters}
          onCreateReport={handleCreateClick}
          selectedIds={selectedIds}
          isAllSelected={isAllSelected}
          isPartiallySelected={isPartiallySelected}
          onSelect={handleSelectWithIndex}
          onSelectAll={handleSelectAll}
          onShiftClickRange={handleShiftClickRangeWithIndex}
          isSelected={isSelected}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          onExecute={handleExecuteClick}
          onToggleActive={handleToggleActive}
          executingReportId={executingReportId}
          total={total}
        />
      </div>

      <ScheduledReportForm
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        report={editingReport}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        submitError={(createMutation.error ?? updateMutation.error)?.message ?? null}
      />
    </div>
  );
}
