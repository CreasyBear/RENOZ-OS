/**
 * Kanban Card
 *
 * Draggable card component with two-section layout (content + footer).
 * Based on Square UI task card pattern.
 *
 * Features:
 * - Status icon visible per card (for drag context)
 * - Metadata pills in footer with dashed border
 * - Progress indicator for subtasks
 * - Priority indicator with icons
 * - Assignee avatar stack
 *
 * @see docs/design-system/KANBAN-STANDARDS.md
 */

import { memo, forwardRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Calendar,
  MessageSquare,
  FileText,
  CheckCircle,
  GripVertical,
  Loader2,
} from "lucide-react";
import { format, differenceInHours } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PriorityIndicator,
  CompletedIndicator,
  ProgressRing,
  AvatarStack,
} from "./primitives";
import type { KanbanCardProps, KanbanCardStatus } from "./types";

// ============================================================================
// SORTABLE CARD (with DnD)
// ============================================================================

export interface SortableKanbanCardProps extends KanbanCardProps {
  id: string;
}

export const SortableKanbanCard = memo(function SortableKanbanCard({
  id,
  ...props
}: SortableKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <KanbanCard
      ref={setNodeRef}
      style={style}
      isDragging={isDragging}
      dragHandleProps={{ ...attributes, ...listeners }}
      {...props}
    />
  );
});

// ============================================================================
// BASE CARD
// ============================================================================

export interface KanbanCardBaseProps extends KanbanCardProps {
  /** Style for transform/transition (from sortable) */
  style?: React.CSSProperties;
  /** Props for drag handle */
  dragHandleProps?: Record<string, unknown>;
  /** Show drag handle */
  showDragHandle?: boolean;
  /** Show selection checkbox */
  showCheckbox?: boolean;
  /** Show loading overlay during async operations */
  isUpdating?: boolean;
}

// Helper to get due date urgency styling
function getDueDateStyle(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const hoursUntil = differenceInHours(d, new Date());
  if (hoursUntil < 0) return "text-destructive border-destructive/50"; // Overdue
  if (hoursUntil < 24) return "text-amber-600 border-amber-500/50"; // Due today
  if (hoursUntil < 72) return "text-yellow-600 border-yellow-500/50"; // Due soon
  return ""; // Normal
}

export const KanbanCard = memo(
  forwardRef<HTMLDivElement, KanbanCardBaseProps>(function KanbanCard(
    {
      title,
      description,
      subtitle,
      value,
      status,
      priority,
      tags,
      dueDate,
      metadata,
      progress,
      assignees,
      isSelected,
      isDragging,
      onClick,
      onSelect,
      actions,
      className,
      style,
      dragHandleProps,
      showDragHandle = true,
      showCheckbox = false,
      isUpdating = false,
    },
    ref
  ) {
    const hasProgress = progress && progress.total > 0;
    const isCompleted = hasProgress && progress.completed === progress.total;
    const dueDateStyle = dueDate ? getDueDateStyle(dueDate) : "";
    const StatusIcon = status?.icon;

    const handleClick = (e: React.MouseEvent) => {
      // Don't trigger click if clicking checkbox or drag handle
      if ((e.target as HTMLElement).closest("[data-no-card-click]")) {
        return;
      }
      onClick?.();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick?.();
      }
    };

    return (
      <div
        ref={ref}
        style={style}
        className={cn(
          // Square UI: rounded-2xl, softer border, clean background
          "group relative bg-background rounded-2xl border border-border/70",
          "cursor-pointer transition-all duration-200 ease-out",
          // Subtle hover - no scale to avoid layout shift
          "hover:shadow-md hover:border-border",
          "focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
          isDragging && "opacity-60 rotate-2 shadow-xl",
          isSelected && "ring-2 ring-primary border-primary/50",
          isUpdating && "pointer-events-none",
          className
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`${title}${status ? ` - ${status.name}` : ""}`}
      >
        {/* Loading overlay */}
        {isUpdating && (
          <div className="absolute inset-0 z-10 bg-background/80 flex items-center justify-center rounded-2xl">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {/* Content section - generous padding like Square UI */}
        <div className="p-4">
          {/* Header row - priority badge top left, actions top right (Square UI pattern) */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              {/* Priority badge - Square UI style */}
              {priority && !isCompleted && (
                <PriorityIndicator priority={priority} />
              )}
              {isCompleted && <CompletedIndicator />}
            </div>

            {/* Drag handle + actions - top right */}
            <div className="flex items-center gap-1">
              {showDragHandle && dragHandleProps && (
                <button
                  {...dragHandleProps}
                  data-no-card-click
                  className="text-muted-foreground hover:text-foreground cursor-grab p-1 rounded hover:bg-muted active:cursor-grabbing transition-colors"
                  aria-label="Drag to reorder"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
              )}
              {showCheckbox && onSelect && (
                <div data-no-card-click className="p-1">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelect(checked as boolean)}
                    aria-label={`Select ${title}`}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Title section */}
          <div className="mb-3">
            <h3 className="text-xs font-medium mb-1.5 leading-snug">
              {title}
            </h3>
            {/* Subtitle/project with icon - Square UI pattern */}
            {(description || subtitle) && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                {StatusIcon && <StatusIcon className="size-[18px] shrink-0" />}
                <span className="text-xs line-clamp-2">{description || subtitle}</span>
              </div>
            )}
          </div>

          {/* Value display - if present */}
          {value && (
            <div className="flex items-center gap-1.5 text-muted-foreground mb-3">
              <span className="text-xs">Value:</span>
              <span className="text-xs font-medium text-foreground">{value}</span>
            </div>
          )}

          {/* Tags/Labels - Square UI style */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {tags.slice(0, 3).map((tag, idx) => (
                <Badge
                  key={tag.id ?? tag.label ?? idx}
                  variant="secondary"
                  className="text-[10px] px-2 py-0.5 font-medium rounded-full border-0"
                  style={
                    tag.color
                      ? { backgroundColor: `${tag.color}20`, color: tag.color }
                      : undefined
                  }
                >
                  {tag.label}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-2 py-0.5 rounded-full"
                >
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Footer section - Square UI separator with opacity */}
        <div className="px-4 py-3 border-t border-border/60">
          <div className="flex items-center justify-between">
            {/* Metadata - left side */}
            <div className="flex items-center gap-3">
              {/* Due date */}
              {dueDate && (
                <div className={cn(
                  "flex items-center gap-1.5 text-muted-foreground",
                  dueDateStyle
                )}>
                  <Calendar className="size-4" />
                  <span className="text-xs">
                    {format(
                      typeof dueDate === "string" ? new Date(dueDate) : dueDate,
                      "MMM d"
                    )}
                  </span>
                </div>
              )}

              {/* Comments */}
              {metadata?.comments && metadata.comments > 0 && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MessageSquare className="size-4" />
                  <span className="text-[10px]">{metadata.comments}</span>
                </div>
              )}

              {/* Attachments */}
              {metadata?.attachments && metadata.attachments > 0 && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <FileText className="size-4" />
                  <span className="text-[10px]">{metadata.attachments}</span>
                </div>
              )}

              {/* Progress */}
              {hasProgress && (
                <div className={cn(
                  "flex items-center gap-1.5",
                  isCompleted ? "text-green-600" : "text-muted-foreground"
                )}>
                  {isCompleted ? (
                    <CheckCircle className="size-4" />
                  ) : (
                    <ProgressRing
                      value={(progress.completed / progress.total) * 100}
                    />
                  )}
                  <span className="text-[10px]">
                    {progress.completed}/{progress.total}
                  </span>
                </div>
              )}
            </div>

            {/* Right side: assignees */}
            <div className="flex items-center gap-2">
              {assignees && assignees.length > 0 && (
                <AvatarStack avatars={assignees} max={2} size="sm" />
              )}

              {/* Actions - hover reveal */}
              {actions && (
                <div
                  data-no-card-click
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                >
                  {actions}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  })
);

// ============================================================================
// CARD OVERLAY (for drag overlay)
// ============================================================================

export interface KanbanCardOverlayProps {
  title: string;
  status?: KanbanCardStatus;
  priority?: KanbanCardProps["priority"];
  value?: React.ReactNode;
}

export const KanbanCardOverlay = memo(function KanbanCardOverlay({
  title,
  status,
  priority,
  value,
}: KanbanCardOverlayProps) {
  const StatusIcon = status?.icon;

  return (
    <div className="w-[300px] bg-background rounded-2xl border border-border/70 shadow-2xl rotate-2 opacity-95">
      <div className="p-4">
        {/* Priority badge top */}
        {priority && (
          <div className="mb-3">
            <PriorityIndicator priority={priority} showTooltip={false} />
          </div>
        )}
        {/* Title */}
        <h3 className="text-xs font-medium mb-1.5">{title}</h3>
        {/* Status/value row */}
        <div className="flex items-center justify-between text-muted-foreground">
          {StatusIcon && (
            <div className="flex items-center gap-1.5">
              <StatusIcon className="size-4" />
              <span className="text-xs">{status?.name}</span>
            </div>
          )}
          {value && (
            <span className="text-xs font-medium text-foreground">{value}</span>
          )}
        </div>
      </div>
    </div>
  );
});
