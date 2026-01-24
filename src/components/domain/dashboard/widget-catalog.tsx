/**
 * Widget Catalog Sheet
 *
 * ARCHITECTURE: Presenter Component - Pure UI, receives all data via props.
 *
 * Displays a slide-out sheet containing available dashboard widgets
 * that users can add to their dashboard grid.
 *
 * Features:
 * - Sheet (drawer) presentation from the right
 * - Grid display of available widgets with icons
 * - Loading skeleton state
 * - Keyboard navigation and ARIA labels
 *
 * @see _Initiation/_prd/2-domains/dashboard/wireframes/DASH-GRID-UI.wireframe.md
 */

import { memo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Widget definition for the catalog.
 */
export interface WidgetDefinition {
  /** Unique identifier for the widget type */
  type: string;
  /** Display name */
  name: string;
  /** Brief description of the widget */
  description: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Category for grouping (optional) */
  category?: string;
  /** Whether the widget is disabled/coming soon */
  disabled?: boolean;
}

/**
 * Props for the WidgetCatalog component.
 */
export interface WidgetCatalogProps {
  /** @source Dashboard container state - array of available widget definitions */
  availableWidgets: WidgetDefinition[];
  /** @source Dashboard container state - controls sheet visibility */
  isOpen: boolean;
  /** @source useCallback handler in dashboard container */
  onClose: () => void;
  /** @source useCallback handler in dashboard container - fires when user selects a widget to add */
  onAddWidget: (widgetType: string) => void;
  /** @source Optional loading state from dashboard container */
  isLoading?: boolean;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Single widget card in the catalog grid.
 */
function WidgetCard({
  widget,
  onAdd,
}: {
  widget: WidgetDefinition;
  onAdd: () => void;
}) {
  const Icon = widget.icon;

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={widget.disabled}
      aria-label={`Add ${widget.name} widget to dashboard${widget.disabled ? ' (coming soon)' : ''}`}
      className={cn(
        'group relative flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-4',
        'text-center transition-all duration-150',
        'hover:border-primary/50 hover:bg-gray-50 hover:shadow-sm',
        'focus:ring-2 focus:ring-primary focus:outline-none focus:ring-inset',
        'active:scale-[0.98]',
        widget.disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      {/* Icon container */}
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100',
          'transition-colors group-hover:bg-primary/10',
          widget.disabled && 'group-hover:bg-gray-100'
        )}
      >
        <Icon
          className={cn(
            'h-6 w-6 text-gray-600',
            'transition-colors group-hover:text-primary',
            widget.disabled && 'group-hover:text-gray-600'
          )}
        />
      </div>

      {/* Widget info */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-900">{widget.name}</p>
        <p className="line-clamp-2 text-xs text-gray-500">{widget.description}</p>
      </div>

      {/* Add indicator */}
      {!widget.disabled && (
        <div
          className={cn(
            'absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full',
            'bg-gray-100 opacity-0 transition-opacity group-hover:opacity-100'
          )}
        >
          <Plus className="h-4 w-4 text-primary" />
        </div>
      )}

      {/* Coming soon badge */}
      {widget.disabled && (
        <span
          className={cn(
            'absolute top-2 right-2 rounded-full bg-gray-100 px-2 py-0.5',
            'text-xs font-medium text-gray-500'
          )}
        >
          Soon
        </span>
      )}
    </button>
  );
}

/**
 * Loading skeleton for the widget grid.
 */
function LoadingSkeleton({ itemCount = 6 }: { itemCount?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-4"
      aria-busy="true"
      aria-label="Loading available widgets"
    >
      {Array.from({ length: itemCount }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-4"
        >
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="w-full space-y-1">
            <Skeleton className="mx-auto h-4 w-20" />
            <Skeleton className="mx-auto h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state when no widgets are available.
 */
function EmptyState() {
  return (
    <div
      className="py-12 text-center"
      role="status"
      aria-label="No widgets available"
    >
      <p className="text-sm font-medium text-gray-900">No widgets available</p>
      <p className="mt-1 text-xs text-gray-500">
        All widgets have been added to your dashboard.
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Widget Catalog Sheet
 *
 * ARCHITECTURE: Presenter Component - receives all data via props from container.
 * NO data hooks (useQuery, useMutation) - only local UI state allowed.
 *
 * @example
 * ```tsx
 * function DashboardContainer() {
 *   const [catalogOpen, setCatalogOpen] = useState(false);
 *   const availableWidgets = useAvailableWidgets();
 *
 *   const handleAddWidget = useCallback((widgetType: string) => {
 *     addWidgetMutation.mutate({ widgetType });
 *     setCatalogOpen(false);
 *   }, []);
 *
 *   return (
 *     <>
 *       <Button onClick={() => setCatalogOpen(true)}>Add Widget</Button>
 *       <WidgetCatalog
 *         availableWidgets={availableWidgets.data ?? []}
 *         isOpen={catalogOpen}
 *         onClose={() => setCatalogOpen(false)}
 *         onAddWidget={handleAddWidget}
 *         isLoading={availableWidgets.isLoading}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export const WidgetCatalog = memo(function WidgetCatalog({
  availableWidgets,
  isOpen,
  onClose,
  onAddWidget,
  isLoading = false,
}: WidgetCatalogProps) {
  // Group widgets by category if categories are provided
  const groupedWidgets = availableWidgets.reduce(
    (acc, widget) => {
      const category = widget.category ?? 'General';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(widget);
      return acc;
    },
    {} as Record<string, WidgetDefinition[]>
  );

  const categories = Object.keys(groupedWidgets).sort();
  const hasCategories = categories.length > 1 || categories[0] !== 'General';

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-md"
        aria-describedby="widget-catalog-description"
      >
        <SheetHeader>
          <SheetTitle>Add Widget</SheetTitle>
          <SheetDescription id="widget-catalog-description">
            Select a widget to add to your dashboard. Click on any widget to add it.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isLoading ? (
            <LoadingSkeleton />
          ) : availableWidgets.length === 0 ? (
            <EmptyState />
          ) : hasCategories ? (
            // Render with category grouping
            categories.map((category) => (
              <section key={category} aria-labelledby={`category-${category}`}>
                <h3
                  id={`category-${category}`}
                  className="mb-3 text-sm font-medium text-gray-700"
                >
                  {category}
                </h3>
                <div
                  className="grid grid-cols-2 gap-4"
                  role="list"
                  aria-label={`${category} widgets`}
                >
                  {groupedWidgets[category].map((widget) => (
                    <div key={widget.type} role="listitem">
                      <WidgetCard
                        widget={widget}
                        onAdd={() => onAddWidget(widget.type)}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))
          ) : (
            // Render without category grouping
            <div
              className="grid grid-cols-2 gap-4"
              role="list"
              aria-label="Available widgets"
            >
              {availableWidgets.map((widget) => (
                <div key={widget.type} role="listitem">
                  <WidgetCard
                    widget={widget}
                    onAdd={() => onAddWidget(widget.type)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
});
