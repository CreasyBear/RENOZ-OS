/**
 * JobsColumn Component
 *
 * Individual column in the jobs kanban board representing a task status.
 * Shows tasks for a specific status with Square UI visual design.
 *
 * @see src/components/domain/orders/fulfillment-dashboard/fulfillment-column.tsx for reference
 * @see _reference/.square-ui-reference/templates/tasks/components/tasks/board/task-column.tsx
 */

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Clock, Package, Truck, CheckCircle, MoreHorizontal, Plus, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { JobsCard } from './jobs-card';
import type { KanbanTask } from '@/hooks/jobs/use-job-tasks-kanban';

// ============================================================================
// TYPES
// ============================================================================

export interface JobsColumnProps {
  columnId: string;
  columnName: string;
  tasks: KanbanTask[];
  totalCount: number;
  onViewTask: (taskId: string) => void;
  onAddTask?: (columnId: string) => void;
  onColumnAction?: (columnId: string, action: string) => void;
  selectedTaskIds?: Set<string>;
  onTaskSelect?: (taskId: string, selected: boolean) => void;
  onSelectAll?: (columnId: string, selected: boolean) => void;
  onBulkAddTask?: (columnId: string) => void;
  onStartEdit?: (taskId: string) => void;
  onCancelEdit?: () => void;
  onSaveEdit?: (
    taskId: string,
    data: { title: string; description?: string; priority: string }
  ) => Promise<void>;
  onDuplicate?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onChangePriority?: (taskId: string, priority: string) => void;
  onAssign?: (taskId: string, assigneeId: string) => void;
  availableAssignees?: Array<{ id: string; name: string }>;
  editingTaskId?: string | null;
  selectedJobId?: string | null;
}

// ============================================================================
// COLUMN CONFIG
// ============================================================================

const COLUMN_CONFIG = {
  pending: {
    icon: Clock,
    color: '#6b7280', // gray
  },
  in_progress: {
    icon: Package,
    color: '#3b82f6', // blue
  },
  completed: {
    icon: CheckCircle,
    color: '#10b981', // green
  },
  blocked: {
    icon: Truck,
    color: '#ef4444', // red
  },
} as const;

// ============================================================================
// COMPONENT
// ============================================================================

export function JobsColumn({
  columnId,
  columnName,
  tasks,
  totalCount,
  onViewTask,
  onAddTask,
  onColumnAction,
  selectedTaskIds = new Set(),
  onTaskSelect = () => {},
  onSelectAll = () => {},
  onBulkAddTask,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDuplicate,
  onDelete,
  onChangePriority,
  onAssign,
  availableAssignees,
  editingTaskId,
  selectedJobId,
}: JobsColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
  });

  // Use virtual scrolling for performance when there are many tasks
  const useVirtualScrolling = tasks.length > 50;

  // Virtual scrolling setup
  const parentRef = React.useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Estimated card height
    overscan: 5,
  });

  const config = COLUMN_CONFIG[columnId as keyof typeof COLUMN_CONFIG];
  const IconComponent = config?.icon || Clock;

  const selectedInColumn = tasks.filter((task) => selectedTaskIds.has(task.id));
  const allSelected = tasks.length > 0 && selectedInColumn.length === tasks.length;

  const taskIds = tasks.map((task) => task.id);

  return (
    <div className="flex h-full w-[300px] flex-1 shrink-0 flex-col lg:w-[340px]">
      <div
        ref={setNodeRef}
        className={cn(
          'border-border/50 bg-muted/70 dark:bg-muted/50 flex max-h-full flex-col space-y-2 rounded-2xl border p-2',
          isOver && 'ring-primary ring-2 ring-offset-2'
        )}
      >
        {/* Column Header */}
        <div className="flex items-center justify-between gap-2">
          <div
            className="bg-muted flex items-center gap-2 rounded-full px-2.5 py-1.5 text-sm font-medium"
            style={{
              backgroundColor: `${config?.color}20`,
            }}
          >
            <IconComponent style={{ color: config?.color }} className="size-4" />
            <span className="text-xs font-medium" style={{ color: config?.color }}>
              {columnName}
            </span>
          </div>
          <Badge
            variant="secondary"
            className="bg-background size-7 rounded-full p-0 text-xs font-medium"
          >
            {totalCount}
          </Badge>
        </div>

        {/* Bulk Selection Controls */}
        {tasks.length > 0 && (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => onSelectAll(columnId, checked === true)}
              aria-label={`Select all tasks in ${columnName}`}
            />
            <label className="text-muted-foreground text-xs">Select all</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-6 min-h-[44px] w-6 min-w-[44px] md:h-6 md:min-h-0 md:w-6 md:min-w-0"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onColumnAction?.(columnId, 'sort')}>
                  Sort by priority
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onColumnAction?.(columnId, 'filter')}>
                  Filter column
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Tasks Container */}
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div ref={parentRef} className="flex-1 overflow-y-auto" style={{ height: '100%' }}>
            {tasks.length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm font-medium">No tasks</p>
                <p className="text-xs">Tasks in {columnName.toLowerCase()} will appear here</p>
              </div>
            ) : useVirtualScrolling ? (
              // Virtual scrolling for large lists
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const task = tasks[virtualItem.index];
                  return (
                    <div
                      key={task.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualItem.size}px`,
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                      className={virtualItem.index > 0 ? 'mt-3' : ''}
                    >
                      <JobsCard
                        task={task}
                        onView={onViewTask}
                        onSelect={onTaskSelect}
                        onSaveEdit={onSaveEdit}
                        onDuplicate={onDuplicate}
                        onDelete={onDelete}
                        onChangePriority={onChangePriority}
                        onAssign={onAssign}
                        availableAssignees={availableAssignees}
                        isSelected={selectedTaskIds.has(task.id)}
                        isEditing={editingTaskId === task.id}
                        onStartEdit={onStartEdit}
                        onCancelEdit={onCancelEdit}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              // Regular rendering for small lists
              <div className="space-y-3">
                {tasks.map((task) => (
                  <JobsCard
                    key={task.id}
                    task={task}
                    onView={onViewTask}
                    onSelect={onTaskSelect}
                    onSaveEdit={onSaveEdit}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                    onChangePriority={onChangePriority}
                    onAssign={onAssign}
                    availableAssignees={availableAssignees}
                    isSelected={selectedTaskIds.has(task.id)}
                    isEditing={editingTaskId === task.id}
                    onStartEdit={onStartEdit}
                    onCancelEdit={onCancelEdit}
                  />
                ))}
              </div>
            )}
          </div>
        </SortableContext>

        {/* Add Task Buttons */}
        <div className="mt-3 flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-background h-auto gap-2 px-2 py-1 text-xs"
            onClick={() => onAddTask?.(columnId)}
            disabled={!selectedJobId}
            title={!selectedJobId ? 'Select a job first to create tasks' : undefined}
          >
            <Plus className="size-4" />
            <span>Add task</span>
          </Button>

          {onBulkAddTask && (
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-background h-auto gap-2 px-2 py-1 text-xs"
              onClick={() => onBulkAddTask(columnId)}
              disabled={!selectedJobId}
              title={!selectedJobId ? 'Select a job first to create tasks' : undefined}
            >
              <Layers className="size-4" />
              <span>Bulk add</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
