/**
 * Project Tasks Tab - Enhanced
 *
 * Full-featured task management with:
 * - Priority badges (urgent, high, normal, low)
 * - Due dates with overdue warnings
 * - Assignee avatars
 * - Estimated hours
 * - Status workflow (checkbox toggle)
 * - Workstream grouping
 * - Inline quick actions
 *
 * @source tasks from useProjectTasks hook
 * @source workstreams from useWorkstreams hook
 * @source users from useUserLookup hook
 * @source mutations from useUpdateJobTaskStatus, useDeleteProjectTask hooks
 *
 * SPRINT-03: Enhanced task tab maximizing schema potential
 */

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { format, isPast, isToday, isTomorrow, addDays, formatDistanceToNow as formatDistanceToNowDateFns } from 'date-fns';
import {
  CheckSquare,
  Plus,
  Clock,
  Calendar,
  AlertCircle,
  MoreHorizontal,
  Trash2,
  Edit3,
  CheckCircle2,
  Circle,
  Timer,
  GripVertical,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { SemanticColor } from '@/components/shared';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Link, useSearch, useNavigate } from '@tanstack/react-router';
import { Filter, ArrowUpDown, X, ExternalLink } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/lib/toast';
import { toastError } from '@/hooks';

// Hooks
import {
  useProjectTasks,
  useUpdateProjectTaskStatus,
  useDeleteProjectTask,
  useCreateTask,
  useWorkstreams,
  useReorderTasks,
  useSiteVisitsByProject,
} from '@/hooks/jobs';
import { useUserLookup } from '@/hooks/users';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

// Types
import type {
  JobTaskStatus,
  JobTaskPriority,
  ProjectTaskResponse,
  TaskWithWorkstream,
  TaskFilters,
  TaskSortOption,
} from '@/lib/schemas/jobs';
import { typedRecordEntries } from '@/lib/schemas/jobs/job-tasks';

// Dialogs
import { TaskCreateDialog, TaskEditDialog } from './task-dialogs';
import { KanbanQuickAdd } from '@/components/shared/kanban';

// ============================================================================
// TYPES
// ============================================================================

interface ProjectTasksTabProps {
  projectId: string;
  /** When provided, show "All tasks complete" CTA and open completion dialog on click */
  onCompleteProjectClick?: () => void;
}

const DEFAULT_FILTERS: TaskFilters = {
  status: [],
  priority: [],
  assignee: 'all',
};

// Helper function to safely get priority with default
function getTaskPriority(priority: string | null | undefined): JobTaskPriority {
  if (priority === 'urgent' || priority === 'high' || priority === 'normal' || priority === 'low') {
    return priority;
  }
  return 'normal';
}

// ============================================================================
// CONFIG
// ============================================================================

const PRIORITY_CONFIG: Record<JobTaskPriority, { label: string; color: string; bg: string; icon: React.ElementType; variant: SemanticColor }> = {
  urgent: {
    label: 'Urgent',
    color: 'text-red-600',
    bg: 'bg-red-100',
    icon: AlertCircle,
    variant: 'error',
  },
  high: {
    label: 'High',
    color: 'text-orange-600',
    bg: 'bg-orange-100',
    icon: AlertCircle,
    variant: 'warning',
  },
  normal: {
    label: 'Normal',
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    icon: Clock,
    variant: 'info',
  },
  low: {
    label: 'Low',
    color: 'text-green-600',
    bg: 'bg-green-100',
    icon: Clock,
    variant: 'success',
  },
};

const STATUS_CONFIG: Record<JobTaskStatus, { label: string; color: string; icon: React.ElementType; variant: SemanticColor }> = {
  pending: {
    label: 'To Do',
    color: 'text-gray-500',
    icon: Circle,
    variant: 'neutral',
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-blue-500',
    icon: Clock,
    variant: 'progress',
  },
  completed: {
    label: 'Done',
    color: 'text-green-500',
    icon: CheckCircle2,
    variant: 'success',
  },
  blocked: {
    label: 'Blocked',
    color: 'text-red-500',
    icon: AlertCircle,
    variant: 'error',
  },
};

// ============================================================================
// HELPERS
// ============================================================================

function formatDueDate(date: Date | string | null | undefined): { text: string; isOverdue: boolean; isSoon: boolean } {
  if (!date) return { text: 'No due date', isOverdue: false, isSoon: false };

  const dueDate = date instanceof Date ? date : new Date(date);
  const today = new Date();

  if (isToday(dueDate)) return { text: 'Due today', isOverdue: false, isSoon: true };
  if (isTomorrow(dueDate)) return { text: 'Due tomorrow', isOverdue: false, isSoon: true };
  if (isPast(dueDate) && !isToday(dueDate)) return { text: `Overdue by ${formatDistanceToNowDateFns(dueDate)}`, isOverdue: true, isSoon: false };

  // Within 3 days
  if (dueDate <= addDays(today, 3)) return { text: format(dueDate, 'MMM d'), isOverdue: false, isSoon: true };

  return { text: format(dueDate, 'MMM d, yyyy'), isOverdue: false, isSoon: false };
}



function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ============================================================================
// SORTABLE TASK CARD
// ============================================================================

interface SortableTaskCardProps {
  task: TaskWithWorkstream;
  projectId: string;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableTaskCard({ task, projectId, onToggle, onEdit, onDelete }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-start gap-3 p-4 rounded-xl border bg-card hover:shadow-sm transition-all',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary',
        task.status === 'completed' && 'opacity-70 bg-muted/30'
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="pt-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      <TaskCardContent
        task={task}
        projectId={projectId}
        onToggle={onToggle}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}

// ============================================================================
// TASK CARD CONTENT
// ============================================================================

interface TaskCardContentProps {
  task: TaskWithWorkstream;
  projectId: string;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function TaskCardContent({ task, projectId, onToggle, onEdit, onDelete }: TaskCardContentProps) {
  const priority = PRIORITY_CONFIG[task.priority || 'normal'];
  const status = STATUS_CONFIG[task.status];
  const dueInfo = formatDueDate(task.dueDate);
  const isCompleted = task.status === 'completed';
  const PriorityIcon = priority.icon;
  const StatusIcon = status.icon;

  return (
    <>
      {/* Checkbox */}
      <div className="pt-0.5">
        <Checkbox
          checked={isCompleted}
          onCheckedChange={onToggle}
          className={cn(
            'h-5 w-5 rounded-full border-2',
            isCompleted
              ? 'border-green-500 bg-green-500 text-white'
              : 'border-gray-300 hover:border-gray-400'
          )}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title Row */}
        <div className="flex items-start gap-2">
          <h4 className={cn(
            'font-medium text-foreground',
            isCompleted && 'line-through text-muted-foreground'
          )}>
            {task.title}
          </h4>

          {/* Priority Badge */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className={cn('shrink-0 px-1.5 py-0.5', priority.bg, priority.color)}
              >
                <PriorityIcon className="h-3 w-3" />
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{priority.label} Priority</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Description */}
        {task.description && (
          <p className={cn(
            'text-sm text-muted-foreground mt-1 line-clamp-2',
            isCompleted && 'line-through'
          )}>
            {task.description}
          </p>
        )}

        {/* Meta Row */}
        <div className="flex flex-wrap items-center gap-3 mt-3">
          {/* Status */}
          <div className={cn('flex items-center gap-1 text-xs', status.color)}>
            <StatusIcon className="h-3.5 w-3.5" />
            <span>{status.label}</span>
          </div>

          {/* Due Date */}
          {task.dueDate && (
            <div className={cn(
              'flex items-center gap-1 text-xs',
              dueInfo.isOverdue ? 'text-red-500 font-medium' :
              dueInfo.isSoon ? 'text-amber-600' : 'text-muted-foreground'
            )}>
              <Calendar className="h-3.5 w-3.5" />
              <span>{dueInfo.text}</span>
              {dueInfo.isOverdue && <AlertCircle className="h-3.5 w-3.5" />}
            </div>
          )}

          {/* Estimated Hours */}
          {task.estimatedHours && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Timer className="h-3.5 w-3.5" />
              <span>{task.estimatedHours}h</span>
            </div>
          )}

          {/* Assignee */}
          {task.assigneeId && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={task.assigneeAvatar} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {getInitials(task.assigneeName)}
                    </AvatarFallback>
                  </Avatar>
                  {task.assigneeName && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {task.assigneeName.split(' ')[0]}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Assigned to {task.assigneeName || 'Unknown'}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Site Visit Link */}
          {task.siteVisitId && task.siteVisitNumber && (
            <Link
              to="/projects/$projectId/visits/$visitId"
              params={{ projectId, visitId: task.siteVisitId }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3" />
              Visit {task.siteVisitNumber}
            </Link>
          )}
        </div>
      </div>

      {/* Actions - always visible on touch, hover-reveal on desktop */}
      <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Task actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit3 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}



// ============================================================================
// WORKSTREAM GROUP
// ============================================================================

function WorkstreamGroup({
  name,
  tasks,
  projectId,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onReorderTasks,
}: {
  name: string;
  tasks: TaskWithWorkstream[];
  projectId: string;
  onToggleTask: (task: TaskWithWorkstream) => void;
  onEditTask: (task: TaskWithWorkstream) => void;
  onDeleteTask: (task: TaskWithWorkstream) => void;
  onReorderTasks: (taskIds: string[]) => void;
}) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const blocked = tasks.filter(t => t.status === 'blocked').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Total estimated hours
    const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

    return { total, completed, inProgress, blocked, progress, totalHours };
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex(t => t.id === active.id);
      const newIndex = tasks.findIndex(t => t.id === over.id);

      const reorderedTasks = arrayMove(tasks, oldIndex, newIndex);
      onReorderTasks(reorderedTasks.map(t => t.id));
    }
  };

  if (tasks.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-background border">
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">{name}</h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span>{stats.completed}/{stats.total} done</span>
                {stats.totalHours > 0 && (
                  <>
                    <span>•</span>
                    <span>{stats.totalHours}h estimated</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mini status breakdown */}
            <div className="hidden sm:flex items-center gap-2 text-xs">
              {stats.inProgress > 0 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  {stats.inProgress} active
                </Badge>
              )}
              {stats.blocked > 0 && (
                <Badge variant="secondary" className="bg-red-100 text-red-700">
                  {stats.blocked} blocked
                </Badge>
              )}
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2 w-24">
              <Progress value={stats.progress} className="h-1.5" />
              <span className="text-xs font-medium w-8 text-right">{stats.progress}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={tasks.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <CardContent className="p-4 space-y-3">
            {tasks.map(task => (
              <SortableTaskCard
                key={task.id}
                task={task}
                projectId={projectId}
                onToggle={() => onToggleTask(task)}
                onEdit={() => onEditTask(task)}
                onDelete={() => onDeleteTask(task)}
              />
            ))}
          </CardContent>
        </SortableContext>
      </DndContext>
    </Card>
  );
}

// ============================================================================
// SUMMARY CARDS
// ============================================================================

function TaskSummaryCards({ tasks }: { tasks: TaskWithWorkstream[] }) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const blocked = tasks.filter(t => t.status === 'blocked').length;
    const pending = tasks.filter(t => t.status === 'pending').length;

    const overdue = tasks.filter(t => {
      if (t.status === 'completed' || !t.dueDate) return false;
      return isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate));
    }).length;

    const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total, completed, inProgress, blocked, pending, overdue, totalHours, progress
    };
  }, [tasks]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <CheckSquare className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Tasks</p>
              <p className="text-xl font-semibold">{stats.total}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-2 text-xs">
            <span className="text-green-600">{stats.completed} done</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-blue-600">{stats.inProgress} active</span>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Progress</p>
              <p className="text-xl font-semibold">{stats.progress}%</p>
            </div>
          </div>
          <Progress value={stats.progress} className="mt-2 h-1.5" />
        </CardContent>
      </Card>

      {/* Estimated Hours */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Timer className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Est. Hours</p>
              <p className="text-xl font-semibold">{stats.totalHours}h</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Across {tasks.filter(t => t.estimatedHours).length} tasks
          </p>
        </CardContent>
      </Card>

      {/* Overdue */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              stats.overdue > 0 ? 'bg-red-100' : 'bg-green-100'
            )}>
              <AlertCircle className={cn(
                'h-4 w-4',
                stats.overdue > 0 ? 'text-red-600' : 'text-green-600'
              )} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Overdue</p>
              <p className={cn(
                'text-xl font-semibold',
                stats.overdue > 0 ? 'text-red-600' : ''
              )}>
                {stats.overdue}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {stats.overdue > 0 ? 'Tasks need attention' : 'All on track'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// FILTER POPOVER
// ============================================================================

function TaskFilterPopover({
  filters,
  onFiltersChange,
  taskCounts,
}: {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  taskCounts: { byStatus: Record<JobTaskStatus, number>; byPriority: Record<JobTaskPriority, number> };
}) {
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

  const clearFilters = () => onFiltersChange(DEFAULT_FILTERS);

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

          {/* Status Filter */}
          <div>
            <p className="text-sm font-medium mb-2">Status</p>
            <div className="flex flex-wrap gap-2">
              {typedRecordEntries(STATUS_CONFIG).map(([key, config]) => {
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

          {/* Priority Filter */}
          <div>
            <p className="text-sm font-medium mb-2">Priority</p>
            <div className="flex flex-wrap gap-2">
              {typedRecordEntries(PRIORITY_CONFIG).map(([key, config]) => {
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

          {/* Assignee Filter */}
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

// ============================================================================
// SORT DROPDOWN
// ============================================================================

function TaskSortDropdown({
  sortBy,
  onSortChange,
}: {
  sortBy: TaskSortOption;
  onSortChange: (sort: TaskSortOption) => void;
}) {
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

// ============================================================================
// ACTIVE FILTER CHIPS
// ============================================================================

function ActiveFilterChips({
  filters,
  onFiltersChange,
}: {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
}) {
  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  filters.status.forEach(status => {
    chips.push({
      key: `status-${status}`,
      label: STATUS_CONFIG[status].label,
      onRemove: () => onFiltersChange({
        ...filters,
        status: filters.status.filter(s => s !== status),
      }),
    });
  });

  filters.priority.forEach(priority => {
    chips.push({
      key: `priority-${priority}`,
      label: PRIORITY_CONFIG[priority].label,
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

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyTasksState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card className="p-12 text-center">
      <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
        <CheckSquare className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Add tasks to track work across your project. Tasks can be assigned to team members
        and linked to workstreams.
      </p>
      <Button onClick={onAdd}>
        <Plus className="mr-2 h-4 w-4" />
        Add First Task
      </Button>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProjectTasksTab({ projectId, onCompleteProjectClick }: ProjectTasksTabProps) {
  const queryClient = useQueryClient();
  const { data: tasksData, isLoading, refetch } = useProjectTasks({ projectId });
  const { data: workstreamsData } = useWorkstreams(projectId);
  const { data: siteVisitsData } = useSiteVisitsByProject(projectId);
  const updateStatus = useUpdateProjectTaskStatus(projectId);
  const deleteTask = useDeleteProjectTask(projectId);
  const createTask = useCreateTask();
  const reorderTasks = useReorderTasks();
  const { getUser, currentUserId } = useUserLookup();
  const navigate = useNavigate();

  const siteVisits = useMemo(
    () => siteVisitsData?.items ?? [],
    [siteVisitsData?.items]
  );
  const defaultSiteVisitId = siteVisits.length === 1 ? siteVisits[0].id : siteVisits[0]?.id;

  const handleQuickAdd = useCallback(
    async (data: { title: string; description?: string }) => {
      if (!defaultSiteVisitId) {
        toastError('Add a site visit first to create tasks quickly, or use "Add Task" for full options.');
        return;
      }
      try {
        await createTask.mutateAsync({
          siteVisitId: defaultSiteVisitId,
          title: data.title,
          description: data.description,
          status: 'pending',
          priority: 'normal',
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectTasks.byProject(projectId),
        });
      } catch {
        toastError('Failed to create task. Please try again.');
      }
    },
    [createTask, defaultSiteVisitId, projectId, queryClient]
  );

  // Read filters from URL search params
  const search = useSearch({ from: '/_authenticated/projects/$projectId' });

  // Parse URL filters into component state
  const urlFilters: TaskFilters = useMemo(() => ({
    status: (search.taskStatus?.split(',').filter(Boolean) || []).filter((s): s is JobTaskStatus =>
      s === 'pending' || s === 'in_progress' || s === 'completed' || s === 'blocked'
    ),
    priority: (search.taskPriority?.split(',').filter(Boolean) || []).filter((p): p is JobTaskPriority =>
      p === 'urgent' || p === 'high' || p === 'normal' || p === 'low'
    ),
    assignee: search.taskAssignee || 'all',
  }), [search.taskStatus, search.taskPriority, search.taskAssignee]);

  const urlSortBy: TaskSortOption = search.taskSort || 'dueDate';

  const [editingTask, setEditingTask] = useState<TaskWithWorkstream | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Sync URL params to local state on mount
  const [filters, setFilters] = useState<TaskFilters>(urlFilters);
  const [sortBy, setSortBy] = useState<TaskSortOption>(urlSortBy);

  // Sync local state to URL when filters change
  const updateFilters = useCallback((newFilters: TaskFilters) => {
    setFilters(newFilters);
    navigate({
      to: '/projects/$projectId',
      params: { projectId },
      search: {
        tab: search.tab,
        taskStatus: newFilters.status.length > 0 ? newFilters.status.join(',') : undefined,
        taskPriority: newFilters.priority.length > 0 ? newFilters.priority.join(',') : undefined,
        taskAssignee: newFilters.assignee !== 'all' ? newFilters.assignee : undefined,
        taskSort: search.taskSort,
      },
    });
  }, [navigate, projectId, search.tab, search.taskSort]);

  // Sync local state to URL when sort changes
  const updateSort = useCallback((newSort: TaskSortOption) => {
    setSortBy(newSort);
    navigate({
      to: '/projects/$projectId',
      params: { projectId },
      search: {
        tab: search.tab,
        taskStatus: search.taskStatus,
        taskPriority: search.taskPriority,
        taskAssignee: search.taskAssignee,
        taskSort: newSort !== 'dueDate' ? newSort : undefined,
      },
    });
  }, [navigate, projectId, search.tab, search.taskStatus, search.taskPriority, search.taskAssignee]);

  // Undo deletion pattern - track tasks pending deletion
  const [pendingDeletions, setPendingDeletions] = useState<Set<string>>(new Set());
  const deleteTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Cleanup timeouts on unmount to prevent memory leaks
  useEffect(() => {
    const timeouts = deleteTimeouts.current;
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      timeouts.clear();
    };
  }, []);

  // Get workstreams for grouping
  const workstreams = useMemo(
    () => workstreamsData?.data ?? [],
    [workstreamsData?.data]
  );

  // Transform tasks
  const allTasks = useMemo(() => {
    const rawTasks = tasksData || [];
    return rawTasks.map((task): TaskWithWorkstream => {
      const workstream = workstreams.find(w => w.id === task.workstreamId);
      const assignee = task.assigneeId ? getUser(task.assigneeId) : null;
      const visit = task.siteVisitId ? siteVisits.find(v => v.id === task.siteVisitId) : undefined;
      return {
        ...task,
        workstreamName: workstream?.name,
        assigneeName: assignee?.name ?? undefined,
        siteVisitNumber: visit?.visitNumber,
      };
    });
  }, [tasksData, workstreams, siteVisits, getUser]);

  // Calculate counts for filter UI
  const taskCounts = useMemo(() => {
    const byStatus: Record<JobTaskStatus, number> = { pending: 0, in_progress: 0, completed: 0, blocked: 0 };
    const byPriority: Record<JobTaskPriority, number> = { urgent: 0, high: 0, normal: 0, low: 0 };

    allTasks.forEach(task => {
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
      const priority = getTaskPriority(task.priority);
      byPriority[priority] = (byPriority[priority] || 0) + 1;
    });

    return { byStatus, byPriority };
  }, [allTasks]);

  // Apply filters (including pending deletion exclusion)
  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
      // Exclude tasks pending deletion
      if (pendingDeletions.has(task.id)) {
        return false;
      }
      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(task.status)) {
        return false;
      }
      // Priority filter
      const taskPriority = getTaskPriority(task.priority);
      if (filters.priority.length > 0 && !filters.priority.includes(taskPriority)) {
        return false;
      }
      // Assignee filter
      if (filters.assignee === 'me' && task.assigneeId !== currentUserId) {
        return false;
      }
      if (filters.assignee === 'unassigned' && task.assigneeId) {
        return false;
      }
      return true;
    });
  }, [allTasks, filters, currentUserId, pendingDeletions]);

  // Apply sorting
  const tasks = useMemo(() => {
    const sorted = [...filteredTasks];

    switch (sortBy) {
      case 'dueDate':
        sorted.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
        break;
      case 'priority': {
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
        sorted.sort((a, b) => {
          const aPri = priorityOrder[getTaskPriority(a.priority)];
          const bPri = priorityOrder[getTaskPriority(b.priority)];
          return aPri - bPri;
        });
        break;
      }
      case 'created': {
        sorted.sort((a, b) => {
          const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bDate - aDate; // Newest first
        });
        break;
      }
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return sorted;
  }, [filteredTasks, sortBy]);

  // Group by workstream
  const groupedTasks = useMemo(() => {
    const groups = new Map<string, TaskWithWorkstream[]>();

    // Initialize with all workstreams (even empty ones)
    workstreams.forEach(ws => {
      groups.set(ws.name, []);
    });

    // Add "Unassigned" group
    groups.set('Unassigned', []);

    // Distribute tasks
    tasks.forEach(task => {
      const groupName = task.workstreamName || 'Unassigned';
      const existing = groups.get(groupName) || [];
      existing.push(task);
      groups.set(groupName, existing);
    });

    // Filter out empty groups and sort
    return Array.from(groups.entries())
      .filter(([_, tasks]) => tasks.length > 0)
      .sort(([a], [b]) => {
        // "Unassigned" always last
        if (a === 'Unassigned') return 1;
        if (b === 'Unassigned') return -1;
        return a.localeCompare(b);
      });
  }, [tasks, workstreams]);

  const handleToggleTask = async (task: TaskWithWorkstream) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';

    // Optimistically update project tasks cache
    const projectTasksKey = queryKeys.projectTasks.byProject(projectId);
    const previousProjectTasks = queryClient.getQueryData<{ tasks: ProjectTaskResponse[] }>(projectTasksKey);
    if (previousProjectTasks) {
      queryClient.setQueryData(projectTasksKey, {
        tasks: previousProjectTasks.tasks.map(t =>
          t.id === task.id ? { ...t, status: newStatus } : t
        ),
      });
    }

    try {
      await updateStatus.mutateAsync({
        taskId: task.id,
        status: newStatus,
      });
      if (newStatus === 'completed') {
        // Check if all tasks are now complete (this task + all others)
        const allComplete =
          tasks.length > 0 &&
          tasks.every(t => (t.id === task.id ? true : t.status === 'completed'));
        if (allComplete && onCompleteProjectClick) {
          toast.success('All tasks complete!', {
            action: {
              label: 'Complete project',
              onClick: onCompleteProjectClick,
            },
          });
        } else {
          toast.success('Task completed');
        }
      } else {
        toast.success('Task reopened');
      }
    } catch {
      // Rollback on error
      if (previousProjectTasks) {
        queryClient.setQueryData(projectTasksKey, previousProjectTasks);
      }
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = useCallback(
    (task: TaskWithWorkstream) => {
      const taskId = task.id;
      const jobId = task.siteVisitId || '';

      // Add to pending deletions immediately (optimistic)
      setPendingDeletions((prev) => new Set(prev).add(taskId));

      // Set timeout to actually delete after 5 seconds
      const timeoutId = setTimeout(async () => {
        try {
          await deleteTask.mutateAsync({ taskId, jobId });
          // Clean up after successful deletion
          deleteTimeouts.current.delete(taskId);
          setPendingDeletions((prev) => {
            const next = new Set(prev);
            next.delete(taskId);
            return next;
          });
          refetch();
        } catch {
          // On error, restore the task
          setPendingDeletions((prev) => {
            const next = new Set(prev);
            next.delete(taskId);
            return next;
          });
          toast.error('Failed to delete task');
        }
      }, 5000);

      deleteTimeouts.current.set(taskId, timeoutId);

      // Show toast with undo action
      toast.success(`Task "${task.title}" deleted`, {
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: () => {
            // Cancel the deletion
            const timeout = deleteTimeouts.current.get(taskId);
            if (timeout) {
              clearTimeout(timeout);
              deleteTimeouts.current.delete(taskId);
            }
            // Restore the task
            setPendingDeletions((prev) => {
              const next = new Set(prev);
              next.delete(taskId);
              return next;
            });
            toast.info('Task restored');
          },
        },
      });
    },
    [deleteTask, refetch]
  );

  // Handle task reordering within a workstream
  const handleReorderTasks = useCallback(
    async (_workstreamName: string, taskIds: string[]) => {
      // Find the first task to get the jobId (site visit ID)
      const firstTask = tasks.find(t => t.id === taskIds[0]);
      if (!firstTask?.siteVisitId) return;

      try {
        await reorderTasks.mutateAsync({
          jobId: firstTask.siteVisitId,
          taskIds,
        });
        toast.success('Task order updated');
      } catch {
        toast.error('Failed to reorder tasks');
      }
    },
    [reorderTasks, tasks]
  );

  // Check if any filters are active (moved before early returns for proper scoping)
  const hasActiveFilters = filters.status.length > 0 || filters.priority.length > 0 || filters.assignee !== 'all';

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  if (tasks.length === 0 && !hasActiveFilters) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">Tasks</h3>
            <p className="text-sm text-muted-foreground">
              Track work across all site visits
            </p>
          </div>
        </div>
        <div className="max-w-md">
          <KanbanQuickAdd
            onAdd={handleQuickAdd}
            placeholder="Add a task..."
            showDescription={false}
            isLoading={createTask.isPending}
          />
        </div>
        <EmptyTasksState onAdd={() => setCreateDialogOpen(true)} />
        <TaskCreateDialog
          key={createDialogOpen ? 'open' : 'closed'}
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          projectId={projectId}
          onSuccess={() => refetch()}
        />
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {/* Quick Add */}
      <div className="max-w-md">
        <KanbanQuickAdd
          onAdd={handleQuickAdd}
          placeholder="Add a task..."
          showDescription={false}
          isLoading={createTask.isPending}
        />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium">Tasks</h3>
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters
              ? `${tasks.length} of ${allTasks.length} tasks`
              : `${allTasks.length} tasks across ${groupedTasks.length} workstreams`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TaskFilterPopover
            filters={filters}
            onFiltersChange={updateFilters}
            taskCounts={taskCounts}
          />
          <TaskSortDropdown sortBy={sortBy} onSortChange={updateSort} />
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Active Filter Chips */}
      <ActiveFilterChips filters={filters} onFiltersChange={updateFilters} />

      {/* Summary */}
      <TaskSummaryCards tasks={allTasks} />

      {/* All tasks complete CTA (Phase 5: Forward momentum) */}
      {allTasks.length > 0 &&
        allTasks.every(t => t.status === 'completed') &&
        onCompleteProjectClick && (
          <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-500" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">
                    All tasks complete
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Ready to complete this project?
                  </p>
                </div>
              </div>
              <Button onClick={onCompleteProjectClick} size="sm">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Complete project
              </Button>
            </CardContent>
          </Card>
        )}

      {/* Grouped Tasks or Filtered Empty State */}
      {groupedTasks.length === 0 && hasActiveFilters ? (
        <Card className="p-8 text-center">
          <Filter className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium mb-1">No tasks match your filters</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Try adjusting your filter criteria to see more tasks.
          </p>
          <Button variant="outline" size="sm" onClick={() => updateFilters(DEFAULT_FILTERS)}>
            Clear all filters
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedTasks.map(([workstreamName, workstreamTasks]) => (
          <WorkstreamGroup
            key={workstreamName}
            name={workstreamName}
            tasks={workstreamTasks}
            projectId={projectId}
            onToggleTask={handleToggleTask}
            onEditTask={setEditingTask}
            onDeleteTask={handleDeleteTask}
            onReorderTasks={(taskIds) => handleReorderTasks(workstreamName, taskIds)}
          />
        ))}
        </div>
      )}

      {/* Link to Cross-Project View */}
      <div className="pt-4 border-t text-center">
        <Link
          to="/my-tasks"
          search={{ projectId }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
        >
          View all my tasks across projects
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Create Dialog */}
      <TaskCreateDialog
        key={createDialogOpen ? 'open' : 'closed'}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={projectId}
        onSuccess={() => refetch()}
      />

      {/* Edit Dialog */}
      <TaskEditDialog
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
        projectId={projectId}
        task={editingTask}
        onSuccess={() => refetch()}
      />
    </div>
    </TooltipProvider>
  );
}
