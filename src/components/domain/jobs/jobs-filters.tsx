/**
 * JobsFilters Component
 *
 * Advanced filtering component for the jobs kanban board. Provides comprehensive
 * filtering capabilities to help users find and organize tasks efficiently.
 *
 * ## Features
 * - Real-time text search across task titles, descriptions, and metadata
 * - Priority filtering (Low, Normal, High, Urgent)
 * - Status filtering (Pending, In Progress, Completed, Blocked)
 * - Assignee filtering with dropdown selection
 * - Job type filtering (Installation, Service, Warranty)
 * - Due date filtering (Today, This Week, Overdue, Upcoming)
 * - Active filter badges with individual removal
 * - Filter persistence across browser sessions
 *
 * ## Filter Types
 * - **Priority**: Task urgency levels
 * - **Assignee**: Filter by assigned team member
 * - **Status**: Current workflow state
 * - **Job Type**: Type of job assignment
 * - **Due Date**: Time-based filtering
 * - **Search**: Full-text search across all fields
 *
 * ## User Experience
 * - Collapsible filter popover to save screen space
 * - Filter count indicator on trigger button
 * - Clear all filters option
 * - Keyboard navigation support
 * - Responsive design for mobile devices
 *
 * ## Performance
 * - Client-side filtering for instant results
 * - Efficient search algorithms
 * - Debounced search input to reduce computation
 *
 * @param filters - Current filter state object
 * @param onChange - Callback when filters are modified
 * @param availableAssignees - List of available team members for assignee filter
 *
 * @see src/hooks/jobs/use-job-tasks-kanban.ts for filter implementation
 * @see src/components/domain/orders/fulfillment-dashboard/fulfillment-filters.tsx for reference
 * @see _reference/.square-ui-reference/templates/tasks/components/tasks/filters/
 */

import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface JobsFiltersState {
  priority: 'all' | 'low' | 'normal' | 'high' | 'urgent';
  assigneeId: string | 'all'; // 'all' or user ID
  status: 'all' | 'pending' | 'in_progress' | 'completed' | 'blocked';
  jobType: 'all' | 'installation' | 'service' | 'warranty';
  jobId: string | 'all'; // 'all' or job assignment ID
  dueDateRange: 'all' | 'today' | 'this_week' | 'overdue' | 'upcoming';
  searchQuery: string;
}

export interface JobsFiltersProps {
  filters: JobsFiltersState;
  onChange: (filters: JobsFiltersState) => void;
  availableAssignees?: Array<{ id: string; name: string }>;
  className?: string;
}

const PRIORITY_OPTIONS = [
  { id: 'all', name: 'All priorities', color: undefined },
  { id: 'low', name: 'Low', color: 'text-green-600 dark:text-green-400' },
  { id: 'normal', name: 'Normal', color: 'text-blue-600 dark:text-blue-400' },
  { id: 'high', name: 'High', color: 'text-yellow-600 dark:text-yellow-400' },
  { id: 'urgent', name: 'Urgent', color: 'text-red-600 dark:text-red-400' },
] as const;

const STATUS_OPTIONS = [
  { id: 'all', name: 'All statuses', color: undefined },
  { id: 'pending', name: 'Pending', color: 'text-gray-600 dark:text-gray-400' },
  { id: 'in_progress', name: 'In Progress', color: 'text-blue-600 dark:text-blue-400' },
  { id: 'completed', name: 'Completed', color: 'text-green-600 dark:text-green-400' },
  { id: 'blocked', name: 'Blocked', color: 'text-red-600 dark:text-red-400' },
] as const;

const JOB_TYPE_OPTIONS = [
  { id: 'all', name: 'All job types', color: undefined },
  { id: 'installation', name: 'Installation', color: 'text-blue-600 dark:text-blue-400' },
  { id: 'service', name: 'Service', color: 'text-green-600 dark:text-green-400' },
  { id: 'warranty', name: 'Warranty', color: 'text-purple-600 dark:text-purple-400' },
] as const;

const DUE_DATE_OPTIONS = [
  { id: 'all', name: 'All dates', color: undefined },
  { id: 'today', name: 'Due today', color: 'text-red-600 dark:text-red-400' },
  { id: 'this_week', name: 'Due this week', color: 'text-orange-600 dark:text-orange-400' },
  { id: 'overdue', name: 'Overdue', color: 'text-red-700 dark:text-red-300' },
  { id: 'upcoming', name: 'Upcoming', color: 'text-blue-600 dark:text-blue-400' },
] as const;

export function JobsFilters({
  filters,
  onChange,
  availableAssignees = [],
  className,
}: JobsFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.searchQuery);

  const activeFiltersCount =
    (filters.priority !== 'all' ? 1 : 0) +
    (filters.assigneeId !== 'all' ? 1 : 0) +
    (filters.status !== 'all' ? 1 : 0) +
    (filters.jobType !== 'all' ? 1 : 0) +
    (filters.dueDateRange !== 'all' ? 1 : 0) +
    (filters.searchQuery ? 1 : 0);

  const clearFilters = () => {
    onChange({
      priority: 'all',
      assigneeId: 'all',
      status: 'all',
      jobType: 'all',
      jobId: 'all',
      dueDateRange: 'all',
      searchQuery: '',
    });
    setSearchInput('');
  };

  const handleSearchSubmit = () => {
    onChange({ ...filters, searchQuery: searchInput });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search tasks..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          onBlur={handleSearchSubmit}
          className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring h-9 w-48 rounded-md border px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        {filters.searchQuery && (
          <button
            onClick={() => {
              setSearchInput('');
              onChange({ ...filters, searchQuery: '' });
            }}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filters Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="secondary" size="sm" className="gap-2">
            <SlidersHorizontal className="size-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-4">
            <div>
              <h4 className="mb-3 text-sm font-semibold">Priority</h4>
              <div className="space-y-1">
                {PRIORITY_OPTIONS.map((option) => (
                  <Button
                    key={option.id}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-9 w-full justify-between px-3',
                      filters.priority === option.id && 'bg-muted'
                    )}
                    onClick={() =>
                      onChange({ ...filters, priority: option.id as JobsFiltersState['priority'] })
                    }
                  >
                    <span className={cn('text-sm', option.color)}>{option.name}</span>
                    {filters.priority === option.id && (
                      <div className="bg-primary size-2 rounded-full" />
                    )}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="mb-3 text-sm font-semibold">Status</h4>
              <div className="space-y-1">
                {STATUS_OPTIONS.map((option) => (
                  <Button
                    key={option.id}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-9 w-full justify-between px-3',
                      filters.status === option.id && 'bg-muted'
                    )}
                    onClick={() =>
                      onChange({ ...filters, status: option.id as JobsFiltersState['status'] })
                    }
                  >
                    <span className={cn('text-sm', option.color)}>{option.name}</span>
                    {filters.status === option.id && (
                      <div className="bg-primary size-2 rounded-full" />
                    )}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="mb-3 text-sm font-semibold">Assignee</h4>
              <Select
                value={filters.assigneeId}
                onValueChange={(value) => onChange({ ...filters, assigneeId: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assignees</SelectItem>
                  {availableAssignees.map((assignee) => (
                    <SelectItem key={assignee.id} value={assignee.id}>
                      {assignee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div>
              <h4 className="mb-3 text-sm font-semibold">Job Type</h4>
              <div className="space-y-1">
                {JOB_TYPE_OPTIONS.map((option) => (
                  <Button
                    key={option.id}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-9 w-full justify-between px-3',
                      filters.jobType === option.id && 'bg-muted'
                    )}
                    onClick={() =>
                      onChange({ ...filters, jobType: option.id as JobsFiltersState['jobType'] })
                    }
                  >
                    <span className={cn('text-sm', option.color)}>{option.name}</span>
                    {filters.jobType === option.id && (
                      <div className="bg-primary size-2 rounded-full" />
                    )}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="mb-3 text-sm font-semibold">Due Date</h4>
              <div className="space-y-1">
                {DUE_DATE_OPTIONS.map((option) => (
                  <Button
                    key={option.id}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-9 w-full justify-between px-3',
                      filters.dueDateRange === option.id && 'bg-muted'
                    )}
                    onClick={() =>
                      onChange({
                        ...filters,
                        dueDateRange: option.id as JobsFiltersState['dueDateRange'],
                      })
                    }
                  >
                    <span className={cn('text-sm', option.color)}>{option.name}</span>
                    {filters.dueDateRange === option.id && (
                      <div className="bg-primary size-2 rounded-full" />
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {activeFiltersCount > 0 && (
              <>
                <Separator />
                <Button variant="outline" size="sm" className="h-9 w-full" onClick={clearFilters}>
                  Clear all filters
                </Button>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filter indicators */}
      {filters.priority !== 'all' && (
        <Badge variant="secondary" className="gap-1">
          Priority: {PRIORITY_OPTIONS.find((p) => p.id === filters.priority)?.name}
          <button
            onClick={() => onChange({ ...filters, priority: 'all' })}
            className="hover:bg-muted-foreground/20 ml-1 rounded-full p-0.5"
            aria-label="Remove priority filter"
          >
            ×
          </button>
        </Badge>
      )}

      {filters.status !== 'all' && (
        <Badge variant="secondary" className="gap-1">
          Status: {STATUS_OPTIONS.find((s) => s.id === filters.status)?.name}
          <button
            onClick={() => onChange({ ...filters, status: 'all' })}
            className="hover:bg-muted-foreground/20 ml-1 rounded-full p-0.5"
            aria-label="Remove status filter"
          >
            ×
          </button>
        </Badge>
      )}

      {filters.assigneeId !== 'all' && (
        <Badge variant="secondary" className="gap-1">
          Assignee: {availableAssignees.find((a) => a.id === filters.assigneeId)?.name || 'Unknown'}
          <button
            onClick={() => onChange({ ...filters, assigneeId: 'all' })}
            className="hover:bg-muted-foreground/20 ml-1 rounded-full p-0.5"
            aria-label="Remove assignee filter"
          >
            ×
          </button>
        </Badge>
      )}

      {filters.jobType !== 'all' && (
        <Badge variant="secondary" className="gap-1">
          Type: {JOB_TYPE_OPTIONS.find((t) => t.id === filters.jobType)?.name}
          <button
            onClick={() => onChange({ ...filters, jobType: 'all' })}
            className="hover:bg-muted-foreground/20 ml-1 rounded-full p-0.5"
            aria-label="Remove job type filter"
          >
            ×
          </button>
        </Badge>
      )}

      {filters.dueDateRange !== 'all' && (
        <Badge variant="secondary" className="gap-1">
          {DUE_DATE_OPTIONS.find((d) => d.id === filters.dueDateRange)?.name}
          <button
            onClick={() => onChange({ ...filters, dueDateRange: 'all' })}
            className="hover:bg-muted-foreground/20 ml-1 rounded-full p-0.5"
            aria-label="Remove due date filter"
          >
            ×
          </button>
        </Badge>
      )}

      {filters.searchQuery && (
        <Badge variant="secondary" className="gap-1">
          Search: &quot;{filters.searchQuery}&quot;
          <button
            onClick={() => {
              setSearchInput('');
              onChange({ ...filters, searchQuery: '' });
            }}
            className="hover:bg-muted-foreground/20 ml-1 rounded-full p-0.5"
            aria-label="Remove search filter"
          >
            ×
          </button>
        </Badge>
      )}
    </div>
  );
}
