/**
 * JobsCard Component
 *
 * Individual task card component for the jobs kanban board. Displays task information
 * in a compact, visually appealing format with drag-and-drop and editing capabilities.
 *
 * ## Features
 * - Task title, description, and metadata display
 * - Priority indicators with color coding
 * - Job assignment and customer information
 * - Due date and time estimates
 * - Drag handle for reordering
 * - Selection checkbox for bulk operations
 * - Inline editing mode
 * - Context menu for quick actions
 *
 * ## Visual Design
 * - Square UI inspired design with rounded corners
 * - Subtle priority color indicators
 * - Hover states for interactive elements
 * - Responsive layout for mobile devices
 * - Accessibility-compliant focus states
 *
 * ## Priority System
 * - **Low**: Green indicator
 * - **Normal**: Blue indicator
 * - **High**: Yellow indicator
 * - **Urgent**: Red indicator
 *
 * ## Accessibility
 * - ARIA labels with comprehensive task information
 * - Keyboard navigation support
 * - Screen reader friendly markup
 * - Focus management during editing
 *
 * @param task - The kanban task data to display
 * @param onView - Callback when card is clicked to view task details
 * @param onSelect - Callback when task selection checkbox is toggled
 * @param onSaveEdit - Callback when inline edits are saved
 * @param isSelected - Whether the task is currently selected
 * @param isEditing - Whether the card is in inline edit mode
 * @param onStartEdit - Callback to enter edit mode
 * @param onCancelEdit - Callback to exit edit mode
 *
 * @see src/components/domain/orders/fulfillment-dashboard/fulfillment-card.tsx for reference
 * @see src/components/domain/jobs/jobs-card-inline-edit.tsx for edit mode
 * @see src/components/domain/jobs/jobs-card-context-menu.tsx for actions
 * @see _reference/.square-ui-reference/templates/tasks/components/tasks/board/task-card.tsx
 */

import { useState, useEffect, memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import {
  GripVertical,
  Calendar as CalendarIcon,
  MessageSquare,
  FileText,
  CheckCircle,
  Clock,
  Edit3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { KanbanTask } from '@/hooks/jobs/use-job-tasks-kanban';
import { JobsCardInlineEdit } from './jobs-card-inline-edit';
import { JobsCardContextMenu } from './jobs-card-context-menu';

// ============================================================================
// TYPES
// ============================================================================

export interface JobsCardProps {
  task: KanbanTask;
  onView: (taskId: string) => void;
  onSelect: (taskId: string, selected: boolean) => void;
  onEdit?: (taskId: string) => void;
  onSaveEdit?: (
    taskId: string,
    data: { title: string; description?: string; priority: string }
  ) => Promise<void>;
  onDuplicate?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onChangePriority?: (taskId: string, priority: string) => void;
  onAssign?: (taskId: string, assigneeId: string) => void;
  availableAssignees?: Array<{ id: string; name: string }>;
  isSelected: boolean;
  isDragging?: boolean;
  isEditing?: boolean;
  onStartEdit?: (taskId: string) => void;
  onCancelEdit?: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PRIORITY_CONFIG = {
  low: {
    label: 'Low',
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-600 dark:text-green-400',
  },
  normal: {
    label: 'Normal',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
  },
  high: {
    label: 'High',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-600 dark:text-yellow-400',
  },
  urgent: {
    label: 'Urgent',
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-600 dark:text-red-400',
  },
} as const;

// ============================================================================
// COMPONENT
// ============================================================================

const JobsCardComponent = ({
  task,
  onView,
  onSelect,
  onEdit: _onEdit,
  onSaveEdit,
  onDuplicate,
  onDelete,
  onChangePriority,
  onAssign,
  availableAssignees = [],
  isSelected,
  isDragging = false,
  isEditing = false,
  onStartEdit,
  onCancelEdit,
}: JobsCardProps) => {
  // SSR-safe: start with false, check in useEffect to avoid hydration mismatch
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery?.matches ?? false);

    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery?.addEventListener('change', handleChange);
    return () => mediaQuery?.removeEventListener('change', handleChange);
  }, []);

  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.normal;
  const dueDateFormatted = task.dueDate ? format(new Date(task.dueDate), 'MMM dd') : null;

  // DnD setup
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: dndIsDragging,
  } = useDraggable({
    id: task.id,
    data: {
      type: 'task',
      task,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const isCurrentlyDragging = isDragging || dndIsDragging;

  // ARIA label for accessibility
  const ariaLabel = `Task ${task.title}, ${task.jobAssignment.jobNumber}, ${task.customer?.name || 'Unknown customer'}, ${task.priority} priority`;

  // If editing, render inline edit component
  if (isEditing && onSaveEdit && onCancelEdit) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'border-border/70 bg-background rounded-2xl border p-4',
          isSelected && 'ring-primary ring-2 ring-offset-2',
          isCurrentlyDragging && 'rotate-2 opacity-50 shadow-lg',
          'relative'
        )}
        role="article"
        aria-label={`${ariaLabel} (editing)`}
        aria-selected={isSelected}
        tabIndex={0}
      >
        <JobsCardInlineEdit task={task} onSave={onSaveEdit} onCancel={onCancelEdit} />
      </div>
    );
  }

  // Normal card view
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'border-border/70 bg-background group cursor-pointer rounded-2xl border p-4 hover:shadow-md',
        !prefersReducedMotion && 'transition-shadow duration-200 ease-out',
        isSelected && 'ring-primary ring-2 ring-offset-2',
        isCurrentlyDragging && 'rotate-2 opacity-50 shadow-lg',
        'relative'
      )}
      role="article"
      aria-label={ariaLabel}
      aria-selected={isSelected}
      tabIndex={0}
      onClick={() => onView(task.id)}
    >
      {/* Drag Handle */}
      <div
        className="absolute top-4 -left-2 z-10 flex h-8 w-8 items-center justify-center opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100"
        {...attributes}
        {...listeners}
        aria-label={`Drag ${task.title}`}
      >
        <GripVertical className="text-muted-foreground h-4 w-4" />
      </div>

      {/* Selection Checkbox */}
      <div className="absolute top-4 -right-2 z-10 flex h-8 w-8 items-center justify-center opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(task.id, checked === true)}
          aria-label={`Select task ${task.title}`}
          className="h-5 w-5"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Header with Priority and Actions */}
      <div className="mb-4 flex items-start justify-between">
        <Badge
          className={`${priority.bg} ${priority.text} border-0 text-[10px] font-medium capitalize`}
        >
          {priority.label}
        </Badge>
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {onStartEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 min-h-[44px] w-6 min-w-[44px] md:h-6 md:min-h-0 md:w-6 md:min-w-0"
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit(task.id);
              }}
            >
              <Edit3 className="size-4" />
            </Button>
          )}
          <JobsCardContextMenu
            task={task}
            onView={onView}
            onEdit={onStartEdit || (() => {})}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onChangePriority={onChangePriority}
            onAssign={onAssign}
            availableAssignees={availableAssignees}
          />
        </div>
      </div>

      {/* Task Title */}
      <div className="mb-3">
        <h3 className="mb-2 line-clamp-2 text-sm font-medium">{task.title}</h3>
        <div className="text-muted-foreground flex items-center gap-1.5">
          <CheckCircle className="size-4" />
          <span className="text-xs">{task.jobAssignment.jobNumber}</span>
          {task.customer && (
            <>
              <span className="text-xs">•</span>
              <span className="text-xs">{task.customer.name}</span>
            </>
          )}
        </div>
      </div>

      {/* Due Date */}
      {dueDateFormatted && (
        <div className="text-muted-foreground mb-4 flex items-center gap-1.5">
          <CalendarIcon className="size-4" />
          <span className="text-xs">Due:</span>
          <span className="text-foreground text-xs">{dueDateFormatted}</span>
        </div>
      )}

      {/* Separator */}
      <div className="border-border/60 mb-4 border-t" />

      {/* Footer with metadata and assignees */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Progress indicator if applicable */}
          {task.actualHours !== null && task.estimatedHours && (
            <div className="text-muted-foreground flex items-center gap-1.5">
              <Clock className="size-4" />
              <span className="text-[10px]">
                {task.actualHours}/{task.estimatedHours}h
              </span>
            </div>
          )}

          {/* Comments count */}
          {task.metadata?.comments && task.metadata.comments > 0 && (
            <div className="text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="size-4" />
              <span className="text-[10px]">{task.metadata.comments}</span>
            </div>
          )}

          {/* Attachments count */}
          {task.metadata?.attachments && task.metadata.attachments > 0 && (
            <div className="text-muted-foreground flex items-center gap-1.5">
              <FileText className="size-4" />
              <span className="text-[10px]">{task.metadata.attachments}</span>
            </div>
          )}
        </div>

        {/* Assignee Avatar */}
        {task.assignee && (
          <Avatar className="border-card size-6 border-2">
            <AvatarImage src={task.assignee.avatar} alt={task.assignee.name} />
            <AvatarFallback className="text-[8px]">{task.assignee.name.charAt(0)}</AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
};

// Memoize for performance - only re-render when props actually change
export const JobsCard = memo(JobsCardComponent);
