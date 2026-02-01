/**
 * Task List Component
 *
 * Displays a list of tasks for a site visit.
 *
 * ARCHITECTURE: Presenter Component - receives data via props.
 *
 * @source tasks from useProjectTasks hook (filtered by siteVisitId)
 */

import { CheckCircle2, Circle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { StatusBadge } from '@/components/shared';
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
  dueDate?: string | null;
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
  { label: string; color: string }
> = {
  low: { label: 'Low', color: 'text-gray-600' },
  normal: { label: 'Normal', color: 'text-blue-600' },
  high: { label: 'High', color: 'text-orange-600' },
  urgent: { label: 'Urgent', color: 'text-red-600' },
};

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
    <div className={cn('space-y-2', className)}>
      {sortedTasks.map((task) => {
        const statusConfig = STATUS_CONFIG[task.status];
        const StatusIcon = statusConfig.icon;
        const priorityConfig = task.priority ? PRIORITY_CONFIG[task.priority] : null;

        return (
          <div
            key={task.id}
            onClick={() => onTaskClick?.(task.id)}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border transition-colors',
              onTaskClick && 'cursor-pointer hover:bg-muted/50',
              task.status === 'completed' && 'opacity-60'
            )}
          >
            <StatusIcon className={cn('h-5 w-5 mt-0.5 shrink-0', statusConfig.color)} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p
                  className={cn(
                    'font-medium truncate',
                    task.status === 'completed' && 'line-through text-muted-foreground'
                  )}
                >
                  {task.title}
                </p>

                <StatusBadge status={task.status} variant={statusConfig.variant} />

                {priorityConfig && (
                  <span className={cn('text-xs', priorityConfig.color)}>{priorityConfig.label}</span>
                )}
              </div>

              {task.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
              )}

              {task.dueDate && (
                <p className="text-xs text-muted-foreground mt-1">
                  Due: {new Date(task.dueDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
