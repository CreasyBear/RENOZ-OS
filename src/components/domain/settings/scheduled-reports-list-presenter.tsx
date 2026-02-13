/**
 * Scheduled Reports List Presenter
 *
 * Unified presenter combining desktop table and mobile cards
 * with responsive switching, loading states, and empty states.
 */

import { memo, useMemo } from 'react';
import { FileText } from 'lucide-react';
import {
  DataTableSkeleton,
  DataTableEmpty,
} from '@/components/shared/data-table';
import { FilterEmptyState } from '@/components/shared/filter-empty-state';
import { countActiveFilters } from '@/components/shared/filters/types';
import { buildFilterItems } from '@/components/shared/filters/build-filter-items';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ScheduledReportsTablePresenter } from './scheduled-reports-table-presenter';
import { ScheduledReportsMobileCards } from './scheduled-reports-mobile-cards';
import type { ScheduledReport } from '@/lib/schemas/reports/scheduled-reports';
import type { ScheduledReportsFiltersState } from './scheduled-reports-filter-config';
import {
  SCHEDULED_REPORTS_FILTER_CONFIG,
  DEFAULT_SCHEDULED_REPORTS_FILTERS,
} from './scheduled-reports-filter-config';

export interface ScheduledReportsListPresenterProps {
  reports: ScheduledReport[];
  isLoading: boolean;
  error: Error | null;
  onRetry?: () => void;
  filters?: ScheduledReportsFiltersState;
  onFiltersChange?: (filters: ScheduledReportsFiltersState) => void;
  onClearFilters?: () => void;
  onCreateReport?: () => void;
  selectedIds: Set<string>;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onShiftClickRange: (rowIndex: number) => void;
  isSelected: (id: string) => boolean;
  onEdit: (report: ScheduledReport) => void;
  onDelete: (report: ScheduledReport) => void;
  onExecute: (report: ScheduledReport) => void;
  onToggleActive: (report: ScheduledReport) => void;
  executingReportId: string | null;
  total: number;
  className?: string;
}

function MobileSkeleton() {
  return (
    <div className="md:hidden space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-3 w-32 mb-3" />
            <div className="flex justify-between">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DesktopSkeleton() {
  return (
    <div className="hidden md:block">
      <DataTableSkeleton
        rows={5}
        columns={[
          { skeleton: { type: 'checkbox' } },
          { skeleton: { type: 'text', width: 'w-40' } },
          { skeleton: { type: 'text', width: 'w-20' } },
          { skeleton: { type: 'text', width: 'w-16' } },
          { skeleton: { type: 'text', width: 'w-16' } },
          { skeleton: { type: 'badge', width: 'w-20' } },
          { skeleton: { type: 'text', width: 'w-24' } },
          { skeleton: { type: 'text', width: 'w-24' } },
          { skeleton: { type: 'actions' } },
        ]}
      />
    </div>
  );
}

function Pagination({
  total,
  reportsLength,
}: {
  total: number;
  reportsLength: number;
}) {
  if (total <= 0) return null;
  return (
    <div className="px-2">
      <p className="text-sm text-muted-foreground text-center">
        Showing {reportsLength} of {total} reports
      </p>
    </div>
  );
}

export const ScheduledReportsListPresenter = memo(
  function ScheduledReportsListPresenter({
    reports,
    isLoading,
    error,
    onRetry,
    filters,
    onFiltersChange,
    onClearFilters,
    onCreateReport,
    selectedIds,
    isAllSelected,
    isPartiallySelected,
    onSelect,
    onSelectAll,
    onShiftClickRange,
    isSelected,
    onEdit,
    onDelete,
    onExecute,
    onToggleActive,
    executingReportId,
    total,
    className,
  }: ScheduledReportsListPresenterProps) {
    const hasActiveFilters = useMemo(() => {
      if (!filters) return false;
      return countActiveFilters(filters, ['search']) > 0;
    }, [filters]);

    const filterItems = useMemo(() => {
      if (!filters || !hasActiveFilters || !onFiltersChange) return [];
      return buildFilterItems({
        filters,
        config: SCHEDULED_REPORTS_FILTER_CONFIG,
        defaultFilters: DEFAULT_SCHEDULED_REPORTS_FILTERS,
        onFiltersChange,
        excludeKeys: ['search'],
      });
    }, [filters, hasActiveFilters, onFiltersChange]);

    if (error) {
      return (
        <DataTableEmpty
          variant="error"
          title="Failed to load scheduled reports"
          description={error.message ?? 'An unexpected error occurred'}
          action={onRetry ? { label: 'Try again', onClick: onRetry } : undefined}
          className={className}
        />
      );
    }

    if (isLoading) {
      return (
        <div className={cn('space-y-3', className)}>
          <DesktopSkeleton />
          <MobileSkeleton />
        </div>
      );
    }

    if (reports.length === 0) {
      if (hasActiveFilters && filterItems.length > 0 && onClearFilters) {
        return (
          <div className={cn('py-12', className)}>
            <FilterEmptyState
              entityName="reports"
              filters={filterItems}
              onClearAll={onClearFilters}
            />
          </div>
        );
      }

      return (
        <DataTableEmpty
          variant="empty"
          icon={FileText}
          title="No reports yet"
          description={
            total === 0
              ? 'Create your first scheduled report to automate report delivery.'
              : 'No reports match your current search or filters.'
          }
          action={
            onCreateReport
              ? { label: 'Create Report', onClick: onCreateReport }
              : undefined
          }
          className={className}
        />
      );
    }

    return (
      <div className={cn('space-y-3', className)}>
        <div className="hidden md:block">
          <ScheduledReportsTablePresenter
            reports={reports}
            selectedIds={selectedIds}
            isAllSelected={isAllSelected}
            isPartiallySelected={isPartiallySelected}
            onSelect={onSelect}
            onSelectAll={onSelectAll}
            onShiftClickRange={onShiftClickRange}
            isSelected={isSelected}
            onEdit={onEdit}
            onDelete={onDelete}
            onExecute={onExecute}
            onToggleActive={onToggleActive}
            executingReportId={executingReportId}
          />
        </div>

        <div className="md:hidden">
          <ScheduledReportsMobileCards
            reports={reports}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onEdit={onEdit}
          />
        </div>

        <Pagination total={total} reportsLength={reports.length} />
      </div>
    );
  }
);

ScheduledReportsListPresenter.displayName = 'ScheduledReportsListPresenter';
