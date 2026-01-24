/**
 * Dashboard Widget Grid
 *
 * ARCHITECTURE: Presenter Component - Pure UI, receives all data via props.
 *
 * Displays a responsive grid of dashboard widgets with drag-and-drop reordering.
 * Uses @dnd-kit/sortable for drag functionality with SortableContext.
 *
 * Features:
 * - CSS Grid responsive layout (1/2/4 columns)
 * - Drag-and-drop reordering when customizing
 * - Loading skeleton state
 * - Error state handling
 * - DragOverlay for drag preview
 *
 * @see _Initiation/_prd/2-domains/dashboard/wireframes/DASH-GRID-UI.wireframe.md
 */

import { memo } from 'react';
import { DragOverlay, useDndContext } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, GripVertical, LayoutGrid } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Widget configuration for the dashboard grid.
 */
export interface WidgetConfig {
  /** Unique widget instance ID */
  id: string;
  /** Widget type identifier (maps to actual widget component) */
  type: string;
  /** Grid position index */
  position: number;
}

/**
 * Props for the DashboardGrid component.
 */
export interface DashboardGridProps {
  /** @source Dashboard container state - array of widget configurations */
  widgets: WidgetConfig[];
  /** @source Dashboard container state - enables drag mode when true */
  isCustomizing: boolean;
  /** @source Optional loading state from dashboard container */
  isLoading?: boolean;
  /** @source Optional error from dashboard container query */
  error?: Error | null;
  /** @source useCallback handler in dashboard container - fires when widgets are reordered */
  onReorder: (newOrder: string[]) => void;
  /** @source Optional render function for actual widget components */
  renderWidget?: (widget: WidgetConfig) => React.ReactNode;
  /** Optional className for grid container */
  className?: string;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Sortable widget wrapper using useSortable hook.
 */
function SortableWidget({
  id,
  children,
  isCustomizing,
}: {
  id: string;
  children: React.ReactNode;
  isCustomizing: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled: !isCustomizing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative rounded-xl border border-gray-200 bg-white',
        'transition-shadow duration-150',
        isCustomizing && 'cursor-grab active:cursor-grabbing',
        isDragging && 'z-50 scale-105 opacity-90 shadow-lg ring-2 ring-primary/30'
      )}
      {...attributes}
      {...(isCustomizing ? listeners : {})}
    >
      {/* Drag handle indicator (visible when customizing) */}
      {isCustomizing && (
        <div
          className={cn(
            'absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center',
            'rounded-md bg-gray-100/80 text-gray-500',
            'transition-colors hover:bg-gray-200 hover:text-gray-700'
          )}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * Placeholder widget content (used before real widgets are implemented).
 */
function WidgetPlaceholder({ type }: { type: string }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2 p-6">
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-lg',
          'bg-gray-100 text-gray-400'
        )}
      >
        <LayoutGrid className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-gray-600 capitalize">{type.replace(/-/g, ' ')}</p>
      <p className="text-xs text-gray-400">Widget content</p>
    </div>
  );
}

/**
 * Loading skeleton for the grid.
 */
function GridSkeleton({ itemCount = 4 }: { itemCount?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
      aria-busy="true"
      aria-label="Loading dashboard widgets"
    >
      {Array.from({ length: itemCount }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 bg-white p-6"
        >
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Error state display.
 */
function ErrorState({ error }: { error: Error }) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl',
        'border border-red-200 bg-red-50 p-8 text-center'
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <AlertCircle className="h-6 w-6 text-red-600" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-red-800">Failed to load widgets</p>
        <p className="text-xs text-red-600">{error.message || 'An unexpected error occurred'}</p>
      </div>
    </div>
  );
}

/**
 * Empty state when no widgets are configured.
 */
function EmptyState() {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl',
        'border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center'
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
        <LayoutGrid className="h-6 w-6 text-gray-400" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-700">No widgets configured</p>
        <p className="text-xs text-gray-500">Add widgets to customize your dashboard</p>
      </div>
    </div>
  );
}

/**
 * Drag overlay preview component.
 */
function DragPreview({ widget }: { widget: WidgetConfig | null }) {
  if (!widget) return null;

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white',
        'shadow-xl ring-2 ring-primary/20',
        'cursor-grabbing'
      )}
    >
      <WidgetPlaceholder type={widget.type} />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Dashboard Widget Grid
 *
 * ARCHITECTURE: Presenter Component - receives all data via props from container.
 * NO data hooks (useQuery, useMutation) - only local UI state allowed.
 *
 * Uses SortableContext from @dnd-kit/sortable with rectSortingStrategy for
 * drag-and-drop reordering. Must be wrapped in DashboardDndProvider.
 *
 * @example
 * ```tsx
 * function DashboardContainer() {
 *   const [isCustomizing, setIsCustomizing] = useState(false);
 *   const { data: widgets, isLoading, error } = useWidgetPreferences();
 *   const reorderMutation = useReorderWidgets();
 *
 *   const handleDragEnd = useCallback((event: DragEndEvent) => {
 *     const { active, over } = event;
 *     if (over && active.id !== over.id) {
 *       const oldIndex = widgets.findIndex(w => w.id === active.id);
 *       const newIndex = widgets.findIndex(w => w.id === over.id);
 *       const newOrder = arrayMove(widgets, oldIndex, newIndex).map(w => w.id);
 *       reorderMutation.mutate({ order: newOrder });
 *     }
 *   }, [widgets]);
 *
 *   return (
 *     <DashboardDndProvider onDragEnd={handleDragEnd}>
 *       <DashboardGrid
 *         widgets={widgets ?? []}
 *         isCustomizing={isCustomizing}
 *         isLoading={isLoading}
 *         error={error}
 *         onReorder={(newOrder) => reorderMutation.mutate({ order: newOrder })}
 *       />
 *     </DashboardDndProvider>
 *   );
 * }
 * ```
 */
export const DashboardGrid = memo(function DashboardGrid({
  widgets,
  isCustomizing,
  isLoading = false,
  error = null,
  onReorder: _onReorder, // Reserved for future direct reorder handling
  renderWidget,
  className,
}: DashboardGridProps) {
  // Get active drag item from parent DndContext for DragOverlay
  const { active } = useDndContext();
  const activeId = active?.id ?? null;

  // Get widget IDs for SortableContext
  const widgetIds = widgets.map((w) => w.id);

  // Find active widget for drag overlay
  const activeWidget = activeId ? widgets.find((w) => w.id === activeId) ?? null : null;

  // Silence unused variable warning - onReorder is in the interface for future use
  void _onReorder;

  // Handle loading state
  if (isLoading) {
    return <GridSkeleton itemCount={4} />;
  }

  // Handle error state
  if (error) {
    return <ErrorState error={error} />;
  }

  // Handle empty state
  if (widgets.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
        <div
          className={cn(
            'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4',
            className
          )}
          role="list"
          aria-label="Dashboard widgets"
        >
          {widgets.map((widget) => (
            <SortableWidget
              key={widget.id}
              id={widget.id}
              isCustomizing={isCustomizing}
            >
              <div role="listitem">
                {renderWidget ? (
                  renderWidget(widget)
                ) : (
                  <WidgetPlaceholder type={widget.type} />
                )}
              </div>
            </SortableWidget>
          ))}
        </div>
      </SortableContext>

      {/* Drag Overlay for smooth drag preview */}
      <DragOverlay>
        <DragPreview widget={activeWidget} />
      </DragOverlay>
    </>
  );
});
