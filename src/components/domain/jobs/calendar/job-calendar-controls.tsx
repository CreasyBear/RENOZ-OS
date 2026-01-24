'use client';

import { format } from 'date-fns';
import { Calendar, Download, Plus, Cloud, CloudOff, Settings } from 'lucide-react';
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

interface JobCalendarControlsProps {
  /** Source: route container view state. */
  currentWeekStart: Date;
  /** Source: route container view state. */
  onWeekChange: (date: Date) => void;
  /** Source: route container view state. */
  filters: JobsFilterBarFilters;
  /** Source: `useCalendarInstallers` in the route container. */
  installers: JobsFilterBarInstaller[];
  /** Source: route container view state. */
  onFiltersChange: (filters: JobsFilterBarFilters) => void;
  /** Source: `useExportCalendarData` in the route container. */
  onExport: (format: 'ics' | 'csv' | 'json') => void;
  /** Source: `useCalendarOAuthStatus` in the route container. */
  isOAuthConfigured: boolean;
  /** Source: `useCalendarOAuthStatus` in the route container. */
  oauthProvider?: 'google' | 'outlook' | null;
  /** Source: `useCalendarOAuthStatus` in the route container. */
  oauthLoading?: boolean;
  /** Source: route container navigation handler. */
  onManageIntegrations?: () => void;
  /** Source: route container handler. */
  onCreateTemplate?: () => void;
}

export function JobCalendarControls({
  currentWeekStart,
  onWeekChange,
  filters,
  installers,
  onFiltersChange,
  onExport,
  isOAuthConfigured,
  oauthProvider,
  oauthLoading = false,
  onManageIntegrations,
  onCreateTemplate,
}: JobCalendarControlsProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="text-muted-foreground h-5 w-5" />
          <h2 className="text-xl font-semibold">Job Calendar</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onWeekChange(new Date())}>
            Today
          </Button>
          <span className="text-muted-foreground text-sm">
            {format(currentWeekStart, 'MMM d, yyyy')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* OAuth Calendar Status */}
        <div className="flex items-center gap-2">
          {oauthLoading ? (
            <div className="flex items-center gap-1">
              <Cloud className="text-muted-foreground h-4 w-4 animate-pulse" />
              <span className="text-muted-foreground text-xs">Checking...</span>
            </div>
          ) : isOAuthConfigured ? (
            <div className="flex items-center gap-1">
              <Cloud className="h-4 w-4 text-green-600" />
              <Badge variant="secondary" className="text-xs">
                {oauthProvider === 'google' ? 'Google' : 'Outlook'} Sync
              </Badge>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <CloudOff className="text-muted-foreground h-4 w-4" />
              <Badge variant="outline" className="text-xs">
                Not Connected
              </Badge>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onManageIntegrations}
            aria-label="Manage calendar integrations"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onCreateTemplate}
          aria-label="Create job template"
        >
          <Plus className="mr-2 h-4 w-4" />
          Template
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" aria-label="Export calendar data">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onExport('ics')}>
              Export as ICS (Calendar)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('csv')}>Export as CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('json')}>Export as JSON</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <JobsFilterBar
          filters={filters}
          installers={installers}
          onFiltersChange={onFiltersChange}
        />
      </div>
    </div>
  );
}
