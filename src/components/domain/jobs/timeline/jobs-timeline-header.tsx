'use client';

import { format } from 'date-fns';
import { BarChart3, ZoomIn, ZoomOut, Download, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  JobsFilterBar,
  type JobsFilterBarFilters,
  type JobsFilterBarInstaller,
} from '../jobs-filter-bar';

interface JobsTimelineHeaderProps {
  /** Source: route container view state. */
  currentWeekStart: Date;
  /** Source: route container view state. */
  onWeekChange: (date: Date) => void;
  /** Source: `useJobsTimeline` in the route container. */
  totalItems: number;
  /** Source: route container view state. */
  zoomLevel?: 'day' | 'week' | 'month';
  /** Source: route container view state. */
  onZoomChange?: (level: 'day' | 'week' | 'month') => void;
  /** Source: route container view state. */
  filters: JobsFilterBarFilters;
  /** Source: `useCalendarInstallers` in the route container. */
  installers: JobsFilterBarInstaller[];
  /** Source: route container view state. */
  onFiltersChange: (filters: JobsFilterBarFilters) => void;
  /** Source: `useExportCalendarData` in the route container. */
  onExport: (format: 'ics' | 'csv' | 'json') => void;
}

export function JobsTimelineHeader({
  currentWeekStart,
  onWeekChange,
  totalItems,
  zoomLevel = 'week',
  onZoomChange,
  filters,
  installers,
  onFiltersChange,
  onExport,
}: JobsTimelineHeaderProps) {
  const handleZoomIn = () => {
    if (onZoomChange) {
      if (zoomLevel === 'month') onZoomChange('week');
      else if (zoomLevel === 'week') onZoomChange('day');
    }
  };

  const handleZoomOut = () => {
    if (onZoomChange) {
      if (zoomLevel === 'day') onZoomChange('week');
      else if (zoomLevel === 'week') onZoomChange('month');
    }
  };

  const handleExport = (format: 'ics' | 'csv' | 'json') => {
    onExport(format);
  };

  return (
    <div className="border-border border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="text-muted-foreground h-5 w-5" />
            <h2 className="text-xl font-semibold">Jobs Timeline</h2>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onWeekChange(new Date())}>
              Today
            </Button>

            {/* Zoom Controls */}
            <div className="flex items-center rounded-md border">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoomLevel === 'month'}
                className="rounded-r-none border-r"
                aria-label="Zoom out timeline"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="min-w-[60px] px-3 py-1 text-center text-sm font-medium">
                {zoomLevel}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoomLevel === 'day'}
                className="rounded-l-none border-l"
                aria-label="Zoom in timeline"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            <span className="text-muted-foreground text-sm">
              {format(currentWeekStart, zoomLevel === 'month' ? 'MMM yyyy' : 'MMM d, yyyy')}
            </span>

            {totalItems > 0 && (
              <Badge variant="secondary" className="ml-2">
                {totalItems} job{totalItems !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" aria-label="Export timeline data">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('ics')}>
                Export as ICS (Calendar)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            View Options
          </Button>

          <JobsFilterBar
            filters={filters}
            installers={installers}
            onFiltersChange={onFiltersChange}
          />
        </div>
      </div>
    </div>
  );
}
