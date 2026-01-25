/**
 * JobsBoard Component
 *
 * Main kanban board component for job task management. Provides a visual workflow
 * interface for managing tasks across all job assignments with drag-and-drop functionality.
 *
 * ## Features
 * - Drag-and-drop task management between workflow columns
 * - Bulk task selection and operations
 * - Real-time task filtering and search
 * - Inline task editing
 * - Keyboard navigation support
 * - Mobile-responsive design
 *
 * ## Workflow States
 * - **Pending**: Tasks awaiting work
 * - **In Progress**: Currently active tasks
 * - **Completed**: Finished tasks
 * - **Blocked**: Tasks blocked by dependencies or issues
 *
 * ## Accessibility
 * - Full keyboard navigation with arrow keys
 * - Screen reader announcements for drag operations
 * - ARIA labels and roles throughout
 * - Focus management and visual indicators
 *
 * ## Performance
 * - Optimized re-renders with proper memoization
 * - Efficient DnD collision detection
 * - Lazy loading of task data
 *
 * @see src/components/domain/orders/fulfillment-dashboard/fulfillment-board.tsx for reference
 * @see src/hooks/jobs/use-job-tasks-kanban.ts for data management
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-005c
 */

import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { JobsColumn } from './jobs-column';
import { JobsCard } from './jobs-card';
import { useJobsCardInlineEdit } from './jobs-card-inline-edit';
import type { KanbanTask } from '@/hooks/jobs';

// ============================================================================
// TYPES
// ============================================================================

export interface JobsBoardProps {
  /** Source: `useJobTasksKanban` in the route container. */
  tasksData?: {
    tasksByStatus: Record<string, KanbanTask[]>;
    allTasks: KanbanTask[];
    total: number;
    filters: Record<string, unknown>;
  };
  /** Source: `useJobTaskKanbanConfig` in the route container. */
  kanbanConfig: {
    columns: ReadonlyArray<{ id: string; name: string; color: string }>;
    canTransition: (from: string, to: string) => boolean;
    getColumnName: (status: string) => string;
  };
  /** Source: `useJobTasksKanban` in the route container. */
  isLoading?: boolean;
  /** Source: `useJobTasksKanban` in the route container. */
  error?: Error | null;
  /** Source: route container navigation handler. */
  onViewTask?: (taskId: string) => void;
  /** Source: route container dialog state. */
  onAddTask?: (columnId: string) => void;
  /** Source: route container handlers. */
  onColumnAction?: (columnId: string, action: string) => void;
  /** Source: `useUpdateJobTaskStatus` in the route container. */
  onTaskMove?: (taskId: string, fromColumn: string, toColumn: string) => void;
  /** Source: route container selection state. */
  selectedTaskIds?: Set<string>;
  /** Source: route container selection state. */
  onTaskSelect?: (taskId: string, selected: boolean) => void;
  /** Source: route container dialog state. */
  onBulkAddTask?: (columnId: string) => void;
  /** Source: route container dialog state. */
  onEditTask?: (taskId: string) => void;
  /** Source: `useUpdateTask` in the route container. */
  onSaveTaskEdit?: (
    taskId: string,
    data: { title: string; description?: string; priority: string }
  ) => Promise<void>;
  /** Source: `useUpdateTask` in the route container. */
  onDuplicateTask?: (taskId: string) => void;
  /** Source: `useDeleteTask` in the route container. */
  onDeleteTask?: (taskId: string) => void;
  /** Source: `useUpdateTask` in the route container. */
  onChangeTaskPriority?: (taskId: string, priority: string) => void;
  /** Source: `useUpdateTask` in the route container. */
  onAssignTask?: (taskId: string, assigneeId: string) => void;
  /** Source: `useCalendarInstallers` in the route container. */
  availableAssignees?: Array<{ id: string; name: string }>;
  /** Source: route container selection state. */
  selectedJobId?: string | null; // For enabling/disabling task creation
}

// ============================================================================
// COMPONENT
// ============================================================================

export function JobsBoard({
  tasksData,
  kanbanConfig,
  isLoading,
  error,
  onViewTask = () => {},
  onAddTask = () => {},
  onColumnAction = () => {},
  onTaskMove = () => {},
  selectedTaskIds = new Set(),
  onTaskSelect = () => {},
  onBulkAddTask,
  onEditTask: _onEditTask,
  onSaveTaskEdit,
  onDuplicateTask,
  onDeleteTask,
  onChangeTaskPriority,
  onAssignTask,
  availableAssignees,
  selectedJobId,
}: JobsBoardProps) {
  // Drag state
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);

  const inlineEdit = useJobsCardInlineEdit();

  // Configure sensors for drag detection
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

  // Calculate totals for each column
  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    kanbanConfig.columns.forEach((column) => {
      const tasks = tasksData?.tasksByStatus[column.id] || [];
      totals[column.id] = tasks.length;
    });
    return totals;
  }, [tasksData, kanbanConfig.columns]);

  // Handle drag start
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const taskId = active.id as string;

      // Find the task being dragged
      let draggedTask: KanbanTask | null = null;
      if (tasksData) {
        for (const tasks of Object.values(tasksData.tasksByStatus)) {
          draggedTask = tasks.find((task) => task.id === taskId) || null;
          if (draggedTask) {
            break;
          }
        }
      }

      setActiveTask(draggedTask);
    },
    [tasksData]
  );

  // Handle drag over (for visual feedback)
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (over && activeTask) {
        const targetColumn = kanbanConfig.columns.find((column) => column.id === over.id);
        if (targetColumn) {
          // Task over column feedback could be added here if needed
        }
      }
    },
    [activeTask, kanbanConfig.columns]
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      const taskId = active.id as string;

      if (!over) {
        setActiveTask(null);
        return;
      }

      const targetColumnId = over.id as string;
      const targetColumn = kanbanConfig.columns.find((column) => column.id === targetColumnId);

      // Validate target column
      if (!targetColumn) {
        setActiveTask(null);
        return;
      }

      // Find source column
      let sourceColumnId: string | null = null;
      if (tasksData) {
        for (const [columnId, tasks] of Object.entries(tasksData.tasksByStatus)) {
          if (tasks.some((task) => task.id === taskId)) {
            sourceColumnId = columnId;
            break;
          }
        }
      }

      if (!sourceColumnId || sourceColumnId === targetColumnId) {
        setActiveTask(null);
        return;
      }

      // Validate stage transition
      if (!kanbanConfig.canTransition(sourceColumnId, targetColumnId)) {
        setActiveTask(null);
        return;
      }

      try {
        await onTaskMove(taskId, sourceColumnId, targetColumnId);
      } catch (error) {
        console.error('Failed to move task:', error);
      } finally {
        setActiveTask(null);
      }
    },
    [tasksData, kanbanConfig, onTaskMove]
  );

  // Task selection handlers
  const handleSelectAll = useCallback(
    (columnId: string, selected: boolean) => {
      const tasks = tasksData?.tasksByStatus[columnId] || [];

      if (selected) {
        tasks.forEach((task) => onTaskSelect(task.id, true));
      } else {
        tasks.forEach((task) => onTaskSelect(task.id, false));
      }
    },
    [tasksData, onTaskSelect]
  );

  // Inline editing handlers
  const handleStartEdit = useCallback(
    (taskId: string) => {
      inlineEdit.startEditing(taskId);
    },
    [inlineEdit]
  );

  const handleCancelEdit = useCallback(() => {
    inlineEdit.stopEditing();
  }, [inlineEdit]);

  const handleSaveEdit = useCallback(
    async (taskId: string, data: { title: string; description?: string; priority: string }) => {
      try {
        if (onSaveTaskEdit) {
          await onSaveTaskEdit(taskId, data);
        }
        inlineEdit.stopEditing();
      } catch (error) {
        console.error('Failed to save task edit:', error);
      }
    },
    [onSaveTaskEdit, inlineEdit]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto px-4 pb-4 sm:gap-5 sm:px-6">
        {kanbanConfig.columns.map((column) => (
          <div
            key={column.id}
            className="flex h-full w-[300px] flex-1 shrink-0 flex-col lg:w-[340px]"
          >
            <Skeleton className="mb-4 h-12 rounded-2xl" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading tasks</AlertTitle>
        <AlertDescription>
          {error.message || 'Unable to load job tasks data. Please try refreshing the page.'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!tasksData) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No data available</AlertTitle>
        <AlertDescription>
          Unable to load job tasks data. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto px-4 pb-4 sm:gap-5 sm:px-6">
        {kanbanConfig.columns.map((column) => (
          <JobsColumn
            key={column.id}
            columnId={column.id}
            columnName={column.name}
            tasks={tasksData.tasksByStatus[column.id] || []}
            totalCount={columnTotals[column.id] || 0}
            onViewTask={onViewTask}
            onAddTask={onAddTask}
            onColumnAction={onColumnAction}
            selectedTaskIds={selectedTaskIds}
            onTaskSelect={onTaskSelect}
            onSelectAll={handleSelectAll}
            onBulkAddTask={onBulkAddTask}
            onStartEdit={handleStartEdit}
            onCancelEdit={handleCancelEdit}
            onSaveEdit={handleSaveEdit}
            onDuplicate={onDuplicateTask}
            onDelete={onDeleteTask}
            onChangePriority={onChangeTaskPriority}
            onAssign={onAssignTask}
            availableAssignees={availableAssignees}
            editingTaskId={inlineEdit.editingTaskId}
            selectedJobId={selectedJobId}
          />
        ))}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTask ? (
          <JobsCard
            task={activeTask}
            onView={() => {}}
            onSelect={() => {}}
            isSelected={false}
            isDragging={true}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
