import { ArrowUpDown, Filter, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type {
  JobTaskPriority,
  JobTaskStatus,
  TaskFilters,
  TaskSortOption,
} from '@/lib/schemas/jobs';
import { typedRecordEntries } from '@/lib/schemas/jobs/job-tasks';
import {
  DEFAULT_TASK_FILTERS,
  PROJECT_TASK_PRIORITY_CONFIG,
  PROJECT_TASK_STATUS_CONFIG,
} from './project-task-config';

export interface ProjectTaskFilterPopoverProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  taskCounts: {
    byStatus: Record<JobTaskStatus, number>;
    byPriority: Record<JobTaskPriority, number>;
  };
}

export function ProjectTaskFilterPopover({
  filters,
  onFiltersChange,
  taskCounts,
}: ProjectTaskFilterPopoverProps) {
  const hasFilters = filters.status.length > 0 || filters.priority.length > 0 || filters.assignee !== 'all';

  const toggleStatus = (status: JobTaskStatus) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    onFiltersChange({ ...filters, status: newStatuses });
  };

  const togglePriority = (priority: JobTaskPriority) => {
    const newPriorities = filters.priority.includes(priority)
      ? filters.priority.filter(p => p !== priority)
      : [...filters.priority, priority];
    onFiltersChange({ ...filters, priority: newPriorities });
  };

  const clearFilters = () => onFiltersChange(DEFAULT_TASK_FILTERS);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn(hasFilters && 'border-primary')}>
          <Filter className="h-4 w-4 mr-2" />
          Filter
          {hasFilters && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
              {filters.status.length + filters.priority.length + (filters.assignee !== 'all' ? 1 : 0)}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filter Tasks</h4>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            )}
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Status</p>
            <div className="flex flex-wrap gap-2">
              {typedRecordEntries(PROJECT_TASK_STATUS_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                const isSelected = filters.status.includes(key);
                const count = taskCounts.byStatus[key] || 0;
                return (
                  <Button
                    key={key}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => toggleStatus(key)}
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {config.label}
                    <span className="ml-1 text-muted-foreground">({count})</span>
                  </Button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Priority</p>
            <div className="flex flex-wrap gap-2">
              {typedRecordEntries(PROJECT_TASK_PRIORITY_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                const isSelected = filters.priority.includes(key);
                const count = taskCounts.byPriority[key] || 0;
                return (
                  <Button
                    key={key}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    className={cn('h-7 text-xs', isSelected && config.bg)}
                    onClick={() => togglePriority(key)}
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {config.label}
                    <span className="ml-1 text-muted-foreground">({count})</span>
                  </Button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Assignee</p>
            <div className="flex gap-2">
              {(['all', 'me', 'unassigned'] as const).map((option) => (
                <Button
                  key={option}
                  variant={filters.assignee === option ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onFiltersChange({ ...filters, assignee: option })}
                >
                  {option === 'all' ? 'All' : option === 'me' ? 'Assigned to me' : 'Unassigned'}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export interface ProjectTaskSortDropdownProps {
  sortBy: TaskSortOption;
  onSortChange: (sort: TaskSortOption) => void;
}

export function ProjectTaskSortDropdown({
  sortBy,
  onSortChange,
}: ProjectTaskSortDropdownProps) {
  const sortOptions: { id: TaskSortOption; label: string }[] = [
    { id: 'dueDate', label: 'Due Date' },
    { id: 'priority', label: 'Priority' },
    { id: 'created', label: 'Created' },
    { id: 'title', label: 'Title (A-Z)' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowUpDown className="h-4 w-4 mr-2" />
          Sort
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        {sortOptions.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.id}
            checked={sortBy === option.id}
            onCheckedChange={() => onSortChange(option.id)}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface ProjectTaskActiveFilterChipsProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
}

export function ProjectTaskActiveFilterChips({
  filters,
  onFiltersChange,
}: ProjectTaskActiveFilterChipsProps) {
  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  filters.status.forEach(status => {
    chips.push({
      key: `status-${status}`,
      label: PROJECT_TASK_STATUS_CONFIG[status].label,
      onRemove: () => onFiltersChange({
        ...filters,
        status: filters.status.filter(s => s !== status),
      }),
    });
  });

  filters.priority.forEach(priority => {
    chips.push({
      key: `priority-${priority}`,
      label: PROJECT_TASK_PRIORITY_CONFIG[priority].label,
      onRemove: () => onFiltersChange({
        ...filters,
        priority: filters.priority.filter(p => p !== priority),
      }),
    });
  });

  if (filters.assignee !== 'all') {
    chips.push({
      key: 'assignee',
      label: filters.assignee === 'me' ? 'Assigned to me' : 'Unassigned',
      onRemove: () => onFiltersChange({ ...filters, assignee: 'all' }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2" role="list" aria-label="Active filters">
      {chips.map((chip) => (
        <Badge key={chip.key} variant="secondary" className="gap-1" role="listitem">
          {chip.label}
          <button
            onClick={chip.onRemove}
            aria-label={`Remove ${chip.label} filter`}
            className="ml-1 p-1 -m-1 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded-sm"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
