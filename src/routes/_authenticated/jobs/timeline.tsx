/**
 * Jobs Timeline Route
 *
 * Timeline visualization for job scheduling across weeks.
 * Shows jobs as spanning cards with project management view.
 *
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-005e
 */

import * as React from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { JobsTimelineView } from '@/components/domain/jobs/timeline';
import { UnifiedJobsProvider, useUnifiedJobs } from '@/components/domain/jobs/jobs-unified-context';
import {
  useJobsTimeline,
  useCalendarInstallers,
  useExportCalendarData,
  useRealtimeJobUpdates,
} from '@/hooks';
import { format } from 'date-fns';
import type { TimelineJobItem } from '@/lib/schemas/jobs/job-timeline';
import {
  toJobViewModelFromTimelineItem,
  toTimelineItemFromJobViewModel,
} from '@/lib/jobs/job-view-model-mappers';

export const Route = createFileRoute('/_authenticated/jobs/timeline')({
  component: () => (
    <UnifiedJobsProvider initialView="timeline">
      <JobsTimelinePage />
    </UnifiedJobsProvider>
  ),
});

function JobsTimelinePage() {
  const navigate = useNavigate();
  const { state, actions } = useUnifiedJobs();
  const [zoomLevel, setZoomLevel] = React.useState<'day' | 'week' | 'month'>('week');

  useRealtimeJobUpdates();

  const { data: installersData } = useCalendarInstallers();
  const installers = installersData?.installers ?? [];

  const startDate = format(state.currentWeekStart, 'yyyy-MM-dd');
  const endDate = format(
    new Date(state.currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
    'yyyy-MM-dd'
  );

  const statusFilters =
    state.filters.statuses.length > 0
      ? (state.filters.statuses as TimelineJobItem['status'][])
      : undefined;

  const { timelineItems, totalItems, stats, isLoading, error } = useJobsTimeline({
    startDate,
    endDate,
    installerIds: state.filters.installerIds.length > 0 ? state.filters.installerIds : undefined,
    statuses: statusFilters,
  });

  const exportTimeline = useExportCalendarData();

  const timelineViewModels = React.useMemo(
    () => timelineItems.map((row) => row.map(toJobViewModelFromTimelineItem)),
    [timelineItems]
  );
  const normalizedTimelineItems = React.useMemo(
    () => timelineViewModels.map((row) => row.map(toTimelineItemFromJobViewModel)),
    [timelineViewModels]
  );

  const handleExport = (formatType: 'ics' | 'csv' | 'json') => {
    let exportEndDate: Date;
    if (zoomLevel === 'day') {
      exportEndDate = new Date(state.currentWeekStart);
      exportEndDate.setDate(state.currentWeekStart.getDate() + 1);
    } else if (zoomLevel === 'month') {
      exportEndDate = new Date(state.currentWeekStart);
      exportEndDate.setMonth(state.currentWeekStart.getMonth() + 1);
    } else {
      exportEndDate = new Date(state.currentWeekStart);
      exportEndDate.setDate(state.currentWeekStart.getDate() + 6);
    }

    exportTimeline.mutate({
      format: formatType,
      startDate: format(state.currentWeekStart, 'yyyy-MM-dd'),
      endDate: format(exportEndDate, 'yyyy-MM-dd'),
      installerIds: state.filters.installerIds.length > 0 ? state.filters.installerIds : undefined,
      statuses: statusFilters,
      includeCustomerInfo: true,
      includePrivateNotes: false,
    });
  };

  return (
    <div className="container h-[calc(100vh-100px)] py-6">
      <JobsTimelineView
        currentWeekStart={state.currentWeekStart}
        onWeekChange={actions.setWeekStart}
        installerIds={state.filters.installerIds}
        onInstallerFilterChange={(ids) => actions.updateFilters({ installerIds: ids })}
        filters={{
          installerIds: state.filters.installerIds,
          statuses: state.filters.statuses,
        }}
        installers={installers}
        onFiltersChange={(nextFilters) => actions.updateFilters(nextFilters)}
        onExport={handleExport}
        onSelectJob={(jobId) =>
          navigate({
            to: '/jobs/assignments/$assignmentId' as unknown as never,
            params: { assignmentId: jobId } as never,
          })
        }
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
        timelineItems={normalizedTimelineItems}
        totalItems={totalItems}
        stats={stats}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
}
