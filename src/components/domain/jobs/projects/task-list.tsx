/**
 * Task List Component
 *
 * Displays a list of tasks for a site visit with rich metadata.
 * Enhanced to match ProjectTasksTab quality with priority badges,
 * due date warnings, and assignee display.
 *
 * ARCHITECTURE: Presenter Component - receives data via props.
 *
 * @source tasks from useProjectTasks hook (filtered by siteVisitId)
 */

import { CheckCircle2, Circle, Clock, AlertCircle, Loader2, Calendar, Timer } from 'lucide-react';
import { isPast, isToday, isTomorrow, addDays, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority?: 'low' | 'normal' | 'high' | 'urgent' | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
  assigneeAvatar?: string | null;
  dueDate?: string | null;
  estimatedHours?: number | null;
  position?: number;
}

export interface TaskListProps {
  /** Tasks to display */
  tasks: Task[];
  /** Loading state */
  isLoading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Callback when task is clicked */
  onTaskClick?: (taskId: string) => void;
  /** Additional className */
  className?: string;
}

// ============================================================================
// STATUS CONFIG
// ============================================================================

const STATUS_CONFIG: Record<
  Task['status'],
  { label: string; icon: typeof Circle; color: string; variant: 'neutral' | 'progress' | 'success' | 'error' }
> = {
  pending: {
    label: 'Pending',
    icon: Circle,
    color: 'text-gray-600',
    variant: 'neutral',
  },
  in_progress: {
    label: 'In Progress',
    icon: Clock,
    color: 'text-blue-600',
    variant: 'progress',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'text-green-600',
    variant: 'success',
  },
  blocked: {
    label: 'Blocked',
    icon: AlertCircle,
    color: 'text-red-600',
    variant: 'error',
  },
};

const PRIORITY_CONFIG: Record<
  NonNullable<Task['priority']>,
  { label: string; color: string; bg: string; icon: typeof AlertCircle }
> = {
  low: { label: 'Low', color: 'text-green-600', bg: 'bg-green-100', icon: Clock },
  normal: { label: 'Normal', color: 'text-blue-600', bg: 'bg-blue-100', icon: Clock },
  high: { label: 'High', color: 'text-orange-600', bg: 'bg-orange-100', icon: AlertCircle },
  urgent: { label: 'Urgent', color: 'text-red-600', bg: 'bg-red-100', icon: AlertCircle },
};

// ============================================================================
// HELPERS
// ============================================================================

function formatDueDate(date: string | null | undefined): { text: string; isOverdue: boolean; isSoon: boolean } {
  if (!date) return { text: 'No due date', isOverdue: false, isSoon: false };

  const dueDate = new Date(date);
  const today = new Date();

  if (isToday(dueDate)) return { text: 'Due today', isOverdue: false, isSoon: true };
  if (isTomorrow(dueDate)) return { text: 'Due tomorrow', isOverdue: false, isSoon: true };
  if (isPast(dueDate) && !isToday(dueDate)) {
    const days = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return { text: `Overdue by ${days} day${days > 1 ? 's' : ''}`, isOverdue: true, isSoon: false };
  }

  // Within 3 days
  if (dueDate <= addDays(today, 3)) return { text: format(dueDate, 'MMM d'), isOverdue: false, isSoon: true };

  return { text: format(dueDate, 'MMM d, yyyy'), isOverdue: false, isSoon: false };
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Task List - Presenter component for displaying site visit tasks
 *
 * @source tasks from useProjectTasks hook (filtered by siteVisitId)
 */
export function TaskList({
  tasks,
  isLoading = false,
  emptyMessage = 'No tasks',
  onTaskClick,
  className,
}: TaskListProps) {
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <CheckCircle2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  // Sort by position if available
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.position !== undefined && b.position !== undefined) {
      return a.position - b.position;
    }
    return 0;
  });

  return (
    <TooltipProvider>
      <div className={cn('space-y-3', className)}>
        {sortedTasks.map((task) => {
          const statusConfig = STATUS_CONFIG[task.status];
          const StatusIcon = statusConfig.icon;
          const priorityConfig = task.priority ? PRIORITY_CONFIG[task.priority] : PRIORITY_CONFIG.normal;
          const PriorityIcon = priorityConfig.icon;
          const dueInfo = formatDueDate(task.dueDate);
          const isCompleted = task.status === 'completed';

          return (
            <div
              key={task.id}
              onClick={() => onTaskClick?.(task.id)}
              className={cn(
                'flex items-start gap-3 p-4 rounded-xl border bg-card transition-all',
                onTaskClick && 'cursor-pointer hover:shadow-sm hover:border-primary/20',
                isCompleted && 'opacity-70 bg-muted/30'
              )}
            >
              {/* Status Icon */}
              <div className="pt-0.5">
                <StatusIcon className={cn('h-5 w-5 shrink-0', statusConfig.color)} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Title Row */}
                <div className="flex items-start gap-2">
                  <p
                    className={cn(
                      'font-medium text-foreground',
                      isCompleted && 'line-through text-muted-foreground'
                    )}
                  >
                    {task.title}
                  </p>

                  {/* Priority Badge */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className={cn('shrink-0 px-1.5 py-0.5', priorityConfig.bg, priorityConfig.color)}
                      >
                        <PriorityIcon className="h-3 w-3" />
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{priorityConfig.label} Priority</p>
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
                  <div className={cn('flex items-center gap-1 text-xs', statusConfig.color)}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    <span>{statusConfig.label}</span>
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
                            <AvatarImage src={task.assigneeAvatar ?? undefined} />
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
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
