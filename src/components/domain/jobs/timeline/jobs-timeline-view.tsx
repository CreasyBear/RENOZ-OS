'use client';

import React from 'react';
import { JobsTimelineHeader } from './jobs-timeline-header';
import { JobsTimelineWeekHeader } from './jobs-timeline-week-header';
import { JobsTimelineRow } from './jobs-timeline-row';
import { JobsTimelineStats } from './jobs-timeline-stats';
import type { TimelineJobItem, TimelineStats } from '@/lib/schemas/jobs/job-timeline';
import type { JobsFilterBarFilters, JobsFilterBarInstaller } from '../jobs-filter-bar';
import { useVirtualizer } from '@tanstack/react-virtual';

interface JobsTimelineViewProps {
  /** Source: route container view state. */
  currentWeekStart: Date;
  /** Source: route container view state. */
  onWeekChange: (date: Date) => void;
  /** Source: route container view state. */
  installerIds?: string[];
  /** Source: route container view state. */
  onInstallerFilterChange?: (ids: string[]) => void;
  /** Source: route container view state. */
  filters: JobsFilterBarFilters;
  /** Source: `useCalendarInstallers` in the route container. */
  installers: JobsFilterBarInstaller[];
  /** Source: route container view state. */
  onFiltersChange: (filters: JobsFilterBarFilters) => void;
  /** Source: `useExportCalendarData` in the route container. */
  onExport: (format: 'ics' | 'csv' | 'json') => void;
  /** Source: route container view state. */
  zoomLevel?: 'day' | 'week' | 'month';
  /** Source: route container view state. */
  onZoomChange?: (level: 'day' | 'week' | 'month') => void;
  /** Source: `useJobsTimeline` in the route container. */
  timelineItems: TimelineJobItem[][];
  /** Source: `useJobsTimeline` in the route container. */
  totalItems: number;
  /** Source: `useJobsTimeline` in the route container. */
  stats?: TimelineStats | null;
  /** Source: `useJobsTimeline` in the route container. */
  isLoading?: boolean;
  /** Source: `useJobsTimeline` in the route container. */
  error?: Error | null;
  /** Source: route container navigation handler. */
  onSelectJob?: (jobId: string) => void;
}

export function JobsTimelineView({
  currentWeekStart,
  onWeekChange,
  installerIds: _installerIds = [],
  onInstallerFilterChange: _onInstallerFilterChange,
  filters,
  installers,
  onFiltersChange,
  onExport,
  zoomLevel,
  onZoomChange,
  timelineItems,
  totalItems,
  stats,
  isLoading = false,
  error = null,
  onSelectJob,
}: JobsTimelineViewProps) {
  // Calculate week dates (Monday to Sunday)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(currentWeekStart);
    date.setDate(currentWeekStart.getDate() + i);
    return date;
  });

  // Virtual scrolling setup
  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: timelineItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated row height
    overscan: 5,
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
          <p className="text-muted-foreground mt-2 text-sm">Loading timeline...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-destructive text-sm">Failed to load timeline</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {error.message || 'Please try again'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex h-full flex-col">
      {/* Header with controls */}
      <JobsTimelineHeader
        currentWeekStart={currentWeekStart}
        onWeekChange={onWeekChange}
        totalItems={totalItems}
        zoomLevel={zoomLevel}
        onZoomChange={onZoomChange}
        filters={filters}
        installers={installers}
        onFiltersChange={onFiltersChange}
        onExport={onExport}
      />

      {/* Timeline Grid */}
      <div className="flex-1 overflow-hidden">
        <div className="bg-card h-full overflow-hidden rounded-lg border">
          <JobsTimelineWeekHeader weekDays={weekDays} />

          <div ref={parentRef} className="flex-1 overflow-y-auto">
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: 'relative',
              }}
            >
              {timelineItems.length === 0 ? (
                <div className="text-muted-foreground flex h-64 items-center justify-center">
                  <div className="text-center">
                    <div className="bg-muted mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                      <svg
                        className="h-8 w-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </div>
                    <p className="text-sm font-medium">No jobs scheduled</p>
                    <p className="text-xs">Jobs will appear here when scheduled for this week</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  {rowVirtualizer.getVirtualItems().map((virtualItem) => (
                    <div
                      key={virtualItem.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualItem.size}px`,
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                    >
                      <JobsTimelineRow
                        items={timelineItems[virtualItem.index]}
                        weekDays={weekDays}
                        rowIndex={virtualItem.index}
                        onSelectJob={onSelectJob}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Statistics Footer */}
          {stats && <JobsTimelineStats stats={stats.stats} />}
        </div>
      </div>
    </div>
  );
}
