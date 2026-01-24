/**
 * Sortable Task List
 *
 * Vertical sortable list of tasks using dnd-kit.
 * Supports drag-drop reordering with optimistic updates.
 *
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-001c
 */

import * as React from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskCard, type TaskCardProps } from './task-card';
import type { TaskResponse, JobTaskStatus } from '@/lib/schemas';

// ============================================================================
// TYPES
// ============================================================================

export interface SortableTaskListProps {
  tasks: TaskResponse[];
  /** Called when tasks are reordered */
  onReorder: (taskIds: string[]) => void;
  /** Called when status checkbox is toggled */
  onToggleStatus: (taskId: string, currentStatus: JobTaskStatus) => void;
  /** Called when edit is clicked */
  onEdit: (task: TaskResponse) => void;
  /** Called when delete is clicked */
  onDelete: (taskId: string) => void;
  /** Disabled state (e.g., during mutation) */
  disabled?: boolean;
}

// ============================================================================
// SORTABLE ITEM WRAPPER
// ============================================================================

interface SortableTaskItemProps extends Omit<TaskCardProps, 'dragHandleProps'> {
  id: string;
}

function SortableTaskItem({ id, task, ...props }: SortableTaskItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
        {...props}
      />
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SortableTaskList({
  tasks,
  onReorder,
  onToggleStatus,
  onEdit,
  onDelete,
  disabled = false,
}: SortableTaskListProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  // Get the active task for the drag overlay
  const activeTask = React.useMemo(() => tasks.find((t) => t.id === activeId), [tasks, activeId]);

  // Configure sensors with touch support for mobile
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms delay before touch drag starts
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // Create new order
        const newTasks = [...tasks];
        const [removed] = newTasks.splice(oldIndex, 1);
        newTasks.splice(newIndex, 0, removed);

        // Call reorder with new order of IDs
        onReorder(newTasks.map((t) => t.id));
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  // Get task IDs for sortable context
  const taskIds = React.useMemo(() => tasks.map((t) => t.id), [tasks]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-3" role="list" aria-label="Task list">
          {tasks.map((task) => (
            <SortableTaskItem
              key={task.id}
              id={task.id}
              task={task}
              onToggleStatus={onToggleStatus}
              onEdit={onEdit}
              onDelete={onDelete}
              disabled={disabled}
            />
          ))}
        </div>
      </SortableContext>

      {/* Drag overlay for visual feedback */}
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isDragging disabled /> : null}
      </DragOverlay>
    </DndContext>
  );
}
