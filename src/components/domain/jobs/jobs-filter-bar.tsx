'use client';

import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
export interface JobsFilterBarFilters {
  installerIds: string[];
  statuses: string[];
}

export interface JobsFilterBarInstaller {
  id: string;
  name?: string | null;
  email?: string | null;
}

interface JobsFilterBarProps {
  /** Source: route container view state. */
  filters: JobsFilterBarFilters;
  /** Source: `useCalendarInstallers` in the route container. */
  installers: JobsFilterBarInstaller[];
  /** Source: route container view state. */
  onFiltersChange: (filters: JobsFilterBarFilters) => void;
}

const STATUS_OPTIONS = [
  {
    id: 'scheduled',
    label: 'Scheduled',
    color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    color: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
  },
  {
    id: 'completed',
    label: 'Completed',
    color: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
  },
  {
    id: 'cancelled',
    label: 'Cancelled',
    color: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
  },
  {
    id: 'on_hold',
    label: 'On Hold',
    color: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
  },
] as const;

export function JobsFilterBar({ filters, installers, onFiltersChange }: JobsFilterBarProps) {
  const hasActiveFilters = filters.installerIds.length > 0 || filters.statuses.length > 0;
  const filteredInstallerCount = filters.installerIds.length;
  const filteredStatusCount = filters.statuses.length;

  const toggleInstaller = (installerId: string) => {
    const currentIds = filters.installerIds;
    const newIds = currentIds.includes(installerId)
      ? currentIds.filter((id) => id !== installerId)
      : [...currentIds, installerId];
    onFiltersChange({ ...filters, installerIds: newIds });
  };

  const toggleStatus = (statusId: string) => {
    const currentStatuses = filters.statuses;
    const newStatuses = currentStatuses.includes(statusId)
      ? currentStatuses.filter((s) => s !== statusId)
      : [...currentStatuses, statusId];
    onFiltersChange({ ...filters, statuses: newStatuses });
  };

  const clearAllFilters = () => {
    onFiltersChange({ installerIds: [], statuses: [] });
  };

  const selectedStatuses = STATUS_OPTIONS.filter((option) => filters.statuses.includes(option.id));

  return (
    <div className="flex items-center gap-2">
      {/* Technician Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <Filter className="mr-2 h-4 w-4" />
            Technicians
            {filteredInstallerCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 flex h-5 w-5 items-center justify-center p-0 text-xs"
              >
                {filteredInstallerCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Filter by technician</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFiltersChange({ ...filters, installerIds: [] })}
                className="h-8 text-xs"
              >
                Show all
              </Button>
            </div>

            <div className="max-h-48 space-y-2 overflow-y-auto">
              {installers.map((installer) => (
                <div
                  key={installer.id}
                  className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded p-2"
                  onClick={() => toggleInstaller(installer.id)}
                >
                  <Checkbox
                    checked={filters.installerIds.includes(installer.id)}
                    className="pointer-events-none"
                  />
                  <span className="text-sm">{installer.name || installer.email}</span>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Status Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            Status
            {filteredStatusCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 flex h-5 w-5 items-center justify-center p-0 text-xs"
              >
                {filteredStatusCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Filter by status</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFiltersChange({ ...filters, statuses: [] })}
                className="h-8 text-xs"
              >
                Show all
              </Button>
            </div>

            <div className="space-y-2">
              {STATUS_OPTIONS.map((status) => (
                <div
                  key={status.id}
                  className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded p-2"
                  onClick={() => toggleStatus(status.id)}
                >
                  <Checkbox
                    checked={filters.statuses.includes(status.id)}
                    className="pointer-events-none"
                  />
                  <div className={`h-3 w-3 rounded ${status.color}`} />
                  <span className="text-sm">{status.label}</span>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear All Filters */}
      {hasActiveFilters && (
        <>
          <Separator orientation="vertical" className="h-6" />
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground hover:text-foreground h-8 text-xs"
          >
            <X className="mr-1 h-3 w-3" />
            Clear filters
          </Button>
        </>
      )}

      {/* Active Filter Summary */}
      {hasActiveFilters && (
        <div className="ml-2 flex items-center gap-1">
          <span className="text-muted-foreground text-xs">Filtered by:</span>
          {selectedStatuses.map((status) => (
            <Badge
              key={status.id}
              variant="outline"
              className={`px-2 py-0 text-[10px] ${status.color}`}
            >
              {status.label}
            </Badge>
          ))}
          {filteredInstallerCount > 0 && (
            <Badge variant="outline" className="px-2 py-0 text-[10px]">
              {filteredInstallerCount} technician{filteredInstallerCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
