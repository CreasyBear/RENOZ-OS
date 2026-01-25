/**
 * Task Card
 *
 * Individual task card component with status badge, completion toggle,
 * and action menu. Designed for both desktop and mobile touch targets.
 *
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-001c
 */

import * as React from 'react';
import { GripVertical, MoreVertical, Pencil, Trash2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TaskResponse, JobTaskStatus } from '@/lib/schemas';

// ============================================================================
// TYPES
// ============================================================================

export interface TaskCardProps {
  task: TaskResponse;
  /** Whether the card is being dragged */
  isDragging?: boolean;
  /** Ref for drag handle (from dnd-kit) */
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  /** Called when status checkbox is toggled */
  onToggleStatus?: (taskId: string, currentStatus: JobTaskStatus) => void;
  /** Called when edit is clicked */
  onEdit?: (task: TaskResponse) => void;
  /** Called when delete is clicked */
  onDelete?: (taskId: string) => void;
  /** Disabled state (e.g., during mutation) */
  disabled?: boolean;
}

// ============================================================================
// STATUS CONFIG
// ============================================================================

const statusConfig: Record<
  JobTaskStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending: { label: 'Pending', variant: 'outline' },
  in_progress: { label: 'In Progress', variant: 'default' },
  completed: { label: 'Completed', variant: 'secondary' },
  blocked: { label: 'Blocked', variant: 'destructive' },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function TaskCard({
  task,
  isDragging = false,
  dragHandleProps,
  onToggleStatus,
  onEdit,
  onDelete,
  disabled = false,
}: TaskCardProps) {
  const status = statusConfig[task.status] || statusConfig.pending;
  const isCompleted = task.status === 'completed';

  return (
    <div
      className={cn(
        'bg-card flex items-center gap-3 rounded-lg border p-4 transition-all',
        isDragging && 'ring-primary opacity-50 ring-2',
        isCompleted && 'opacity-70',
        disabled && 'pointer-events-none opacity-50'
      )}
      role="listitem"
      aria-label={`Task: ${task.title}`}
    >
      {/* Drag handle - minimum 44px touch target */}
      <div
        {...dragHandleProps}
        className="-m-2 flex cursor-grab touch-none items-center justify-center p-2"
        aria-label="Drag to reorder"
        role="button"
        tabIndex={0}
      >
        <GripVertical className="text-muted-foreground h-5 w-5" />
      </div>

      {/* Completion checkbox - minimum 44px touch target */}
      <div className="-m-2 flex items-center justify-center p-2">
        <Checkbox
          checked={isCompleted}
          onCheckedChange={() => onToggleStatus?.(task.id, task.status)}
          aria-label={`Mark task "${task.title}" as ${isCompleted ? 'incomplete' : 'complete'}`}
          className="h-5 w-5"
        />
      </div>

      {/* Task content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'truncate font-medium',
              isCompleted && 'text-muted-foreground line-through'
            )}
          >
            {task.title}
          </span>
        </div>
        {task.description && (
          <p className="text-muted-foreground mt-1 truncate text-sm">{task.description}</p>
        )}
        {(task.assignee || task.dueDate) && (
          <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
            {task.assignee && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {task.assignee.name || task.assignee.email}
              </span>
            )}
            {task.dueDate && <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
          </div>
        )}
      </div>

      {/* Status badge */}
      <Badge variant={status.variant} className="shrink-0">
        {status.label}
      </Badge>

      {/* Actions menu - minimum 44px touch target */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0"
            aria-label={`Actions for task "${task.title}"`}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit?.(task)} className="gap-2">
            <Pencil className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete?.(task.id)}
            className="text-destructive focus:text-destructive gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
