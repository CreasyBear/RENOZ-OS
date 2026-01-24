'use client';

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { ReactNode } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface DashboardDndProviderProps {
  /** Child components to wrap with DnD context */
  children: ReactNode;
  /** Callback fired when a drag operation ends */
  onDragEnd: (event: DragEndEvent) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Dashboard DnD Provider
 *
 * Wraps @dnd-kit/core's DndContext with pre-configured sensors for
 * pointer and keyboard interactions. Uses closestCenter collision detection.
 *
 * @example
 * ```tsx
 * function WidgetsGrid() {
 *   const handleDragEnd = (event: DragEndEvent) => {
 *     const { active, over } = event;
 *     if (over && active.id !== over.id) {
 *       // Handle reorder
 *     }
 *   };
 *
 *   return (
 *     <DashboardDndProvider onDragEnd={handleDragEnd}>
 *       <SortableContext items={widgetIds}>
 *         {widgets.map((widget) => (
 *           <SortableWidget key={widget.id} {...widget} />
 *         ))}
 *       </SortableContext>
 *     </DashboardDndProvider>
 *   );
 * }
 * ```
 */
export function DashboardDndProvider({ children, onDragEnd }: DashboardDndProviderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      {children}
    </DndContext>
  );
}
