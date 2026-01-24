/**
 * Dashboard Grid Route (Container)
 *
 * ARCHITECTURE: Container Component - Route that handles ALL data fetching
 * and state management, passing data to pure presenter components.
 *
 * This route manages:
 * - User's dashboard layout (widgets, positions)
 * - Dashboard metrics data
 * - Widget customization mode (drag-and-drop reordering)
 * - Widget catalog (adding widgets)
 * - Date range filtering via URL search params
 *
 * Container/Presenter Pattern:
 * - Container (this file): Data fetching, state, handlers
 * - Presenters: DashboardGrid, WidgetCatalog (pure UI)
 *
 * @see src/hooks/dashboard/
 * @see src/components/domain/dashboard/
 */

import { createFileRoute } from '@tanstack/react-router';
import { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  Settings2,
  Plus,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Bell,
  CheckSquare,
  Zap,
  TrendingUp,
  Users,
  Package,
  DollarSign,
  ShieldCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import {
  DashboardDndProvider,
  DashboardGrid,
  WidgetCatalog,
  DashboardProvider,
  DateRangeSelector,
  useDashboardDateRange,
  type WidgetConfig as GridWidgetConfig,
  type WidgetDefinition as CatalogWidgetDefinition,
} from '@/components/domain/dashboard';
import {
  useUserLayout,
  useDashboardMetrics,
  useSaveDashboardLayout,
  useAvailableWidgets,
} from '@/hooks/dashboard';
import type {
  WidgetConfig as SchemaWidgetConfig,
  WidgetDefinition as SchemaWidgetDefinition,
  DashboardLayoutConfig,
  DashboardFilters,
} from '@/lib/schemas/dashboard/layouts';

// ============================================================================
// ROUTE SEARCH PARAMS
// ============================================================================

const searchSchema = z.object({
  dateRange: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
});

type DashboardSearchParams = z.infer<typeof searchSchema>;

export const Route = createFileRoute('/_authenticated/dashboard/')({
  component: DashboardGridPage,
  validateSearch: (search: Record<string, unknown>): DashboardSearchParams => {
    return searchSchema.parse(search);
  },
});

// ============================================================================
// WIDGET TYPE TO ICON MAPPING
// ============================================================================

const widgetTypeIcons: Record<string, LucideIcon> = {
  kpi_cards: TrendingUp,
  revenue_chart: DollarSign,
  orders_chart: BarChart3,
  customers_chart: Users,
  inventory_chart: Package,
  pipeline_chart: PieChart,
  recent_activities: Activity,
  upcoming_tasks: CheckSquare,
  alerts: Bell,
  quick_actions: Zap,
  kwh_deployed_chart: LineChart,
  warranty_claims_chart: ShieldCheck,
  target_progress: TrendingUp,
};

// ============================================================================
// TYPE: Database widget (type is string)
// ============================================================================

interface DbWidgetConfig {
  id: string;
  type: string;
  title: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  settings: {
    metric?: string;
    chartType?: 'line' | 'bar' | 'pie' | 'area';
    dateRange?: '7d' | '30d' | '90d' | '365d' | 'custom';
    showTrend?: boolean;
    showTarget?: boolean;
    refreshInterval?: number;
  };
}

interface DbLayoutConfig {
  widgets: DbWidgetConfig[];
  gridColumns: number;
  theme: 'light' | 'dark' | 'system';
  compactMode: boolean;
}

// ============================================================================
// HELPER: Transform database widget to grid widget
// ============================================================================

function transformWidgetToGridFormat(widget: DbWidgetConfig, index: number): GridWidgetConfig {
  return {
    id: widget.id,
    type: widget.type,
    position: index,
  };
}

// ============================================================================
// HELPER: Transform available widget to catalog format
// ============================================================================

function transformToCatalogWidget(widget: SchemaWidgetDefinition): CatalogWidgetDefinition {
  const Icon = widgetTypeIcons[widget.type] || BarChart3;
  return {
    type: widget.type,
    name: widget.name,
    description: widget.description,
    icon: Icon,
  };
}

// ============================================================================
// MAIN COMPONENT (CONTAINER) - Wrapper with Provider
// ============================================================================

function DashboardGridPage() {
  return (
    <DashboardProvider>
      <DashboardGridContent />
    </DashboardProvider>
  );
}

// ============================================================================
// INNER COMPONENT (CONTAINER) - Uses DashboardContext
// ============================================================================

function DashboardGridContent() {
  // Get date range from dashboard context
  const { dateRange, preset, setDateRange, setPreset } = useDashboardDateRange();

  // Convert DateRange to API format (ISO strings)
  const dateFrom = dateRange.from.toISOString().split('T')[0];
  const dateTo = dateRange.to.toISOString().split('T')[0];

  // ============================================================================
  // LOCAL UI STATE
  // ============================================================================

  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  // ============================================================================
  // DATA FETCHING: TanStack Query hooks
  // ============================================================================

  // User's current dashboard layout
  const {
    data: userLayoutData,
    isLoading: isLayoutLoading,
    error: layoutError,
  } = useUserLayout();

  // Dashboard metrics with date filtering (data used for future widget rendering)
  const {
    isLoading: isMetricsLoading,
    error: metricsError,
  } = useDashboardMetrics({
    dateFrom,
    dateTo,
  });

  // Available widgets for catalog
  const {
    data: availableWidgetsData,
    isLoading: isWidgetsLoading,
  } = useAvailableWidgets();

  // Mutation hooks
  const saveLayoutMutation = useSaveDashboardLayout();

  // ============================================================================
  // DATA TRANSFORMATION
  // ============================================================================

  // Extract layout and cast to database type (which has string type for widgets)
  const currentDbLayout = userLayoutData?.layout?.layout as DbLayoutConfig | undefined;
  const currentFilters = userLayoutData?.layout?.filters as DashboardFilters | undefined;
  const currentLayoutId = userLayoutData?.layout?.id;

  // Transform layout widgets to grid format
  const widgets = useMemo<GridWidgetConfig[]>(() => {
    if (!currentDbLayout?.widgets) {
      return [];
    }
    return currentDbLayout.widgets.map((widget, index) => transformWidgetToGridFormat(widget, index));
  }, [currentDbLayout]);

  // Transform available widgets to catalog format
  const catalogWidgets = useMemo<CatalogWidgetDefinition[]>(() => {
    if (!availableWidgetsData) {
      return [];
    }
    return availableWidgetsData.map((widget) => transformToCatalogWidget(widget));
  }, [availableWidgetsData]);

  // Filter out widgets already in layout
  const availableCatalogWidgets = useMemo(() => {
    const existingTypes = new Set(widgets.map((w) => w.type));
    return catalogWidgets.filter((w) => !existingTypes.has(w.type));
  }, [catalogWidgets, widgets]);

  // Combined loading state
  const isLoading = isLayoutLoading || isMetricsLoading;

  // Combined error (prioritize layout error)
  const error = layoutError || metricsError;

  // ============================================================================
  // HANDLERS (all wrapped in useCallback)
  // ============================================================================

  /**
   * Update widget order and save to server
   */
  const handleReorder = useCallback(
    (newOrder: string[]) => {
      if (!currentLayoutId || !currentDbLayout) {
        return;
      }

      // Rebuild widgets array in new order
      const currentWidgets = currentDbLayout.widgets;
      const reorderedWidgets = newOrder
        .map((id) => currentWidgets.find((w) => w.id === id))
        .filter((w): w is DbWidgetConfig => w !== undefined)
        .map((widget, index) => ({
          ...widget,
          position: {
            ...widget.position,
            y: Math.floor(index / 4), // Simple grid position
            x: (index % 4) * 3, // 4 columns
          },
        }));

      // Cast to schema type for the mutation
      const layoutToSave: DashboardLayoutConfig = {
        ...currentDbLayout,
        widgets: reorderedWidgets as unknown as SchemaWidgetConfig[],
      };

      // Save the updated layout
      saveLayoutMutation.mutate({
        layout: layoutToSave,
        filters: currentFilters,
      });
    },
    [currentLayoutId, currentDbLayout, currentFilters, saveLayoutMutation]
  );

  /**
   * Handle drag-and-drop reorder of widgets
   */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id || !currentLayoutId || !currentDbLayout) {
        return;
      }

      const oldIndex = widgets.findIndex((w) => w.id === active.id);
      const newIndex = widgets.findIndex((w) => w.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      // Reorder widgets
      const reorderedWidgets = arrayMove(widgets, oldIndex, newIndex);
      const newOrder = reorderedWidgets.map((w) => w.id);

      // Update layout with new order
      handleReorder(newOrder);
    },
    [widgets, currentLayoutId, currentDbLayout, handleReorder]
  );

  /**
   * Add a widget to the layout
   */
  const handleAddWidget = useCallback(
    (widgetType: string) => {
      if (!currentDbLayout) {
        return;
      }

      // Find widget definition
      const widgetDef = availableWidgetsData?.find((w) => w.type === widgetType);
      if (!widgetDef) {
        return;
      }

      // Create new widget config
      const existingWidgets = currentDbLayout.widgets;
      const newWidget: DbWidgetConfig = {
        id: `${widgetType}-${Date.now()}`,
        type: widgetType,
        title: widgetDef.name,
        position: {
          x: 0,
          y: existingWidgets.length, // Add to bottom
          width: widgetDef.minWidth || 3,
          height: widgetDef.minHeight || 2,
        },
        settings: widgetDef.defaultSettings || {},
      };

      // Build updated widgets array
      const updatedWidgets = [...existingWidgets, newWidget];

      // Cast to schema type for the mutation
      const layoutToSave: DashboardLayoutConfig = {
        ...currentDbLayout,
        widgets: updatedWidgets as unknown as SchemaWidgetConfig[],
      };

      // Save with new widget
      saveLayoutMutation.mutate({
        layout: layoutToSave,
        filters: currentFilters,
      });

      // Close catalog
      setIsCatalogOpen(false);
    },
    [currentDbLayout, currentFilters, availableWidgetsData, saveLayoutMutation]
  );

  /**
   * Remove a widget from the layout (reserved for future use)
   * Not yet exposed in UI but kept for upcoming widget removal feature
   */
  const handleRemoveWidget = useCallback(
    (widgetId: string) => {
      if (!currentDbLayout) {
        return;
      }

      const updatedWidgets = currentDbLayout.widgets.filter((w) => w.id !== widgetId);

      // Cast to schema type for the mutation
      const layoutToSave: DashboardLayoutConfig = {
        ...currentDbLayout,
        widgets: updatedWidgets as unknown as SchemaWidgetConfig[],
      };

      saveLayoutMutation.mutate({
        layout: layoutToSave,
        filters: currentFilters,
      });
    },
    [currentDbLayout, currentFilters, saveLayoutMutation]
  );

  // Silence unused variable warning - handler is reserved for future widget removal UI
  void handleRemoveWidget;

  /**
   * Toggle customization mode
   */
  const handleToggleCustomize = useCallback(() => {
    setIsCustomizing((prev) => !prev);
  }, []);

  /**
   * Open widget catalog
   */
  const handleOpenCatalog = useCallback(() => {
    setIsCatalogOpen(true);
  }, []);

  /**
   * Close widget catalog
   */
  const handleCloseCatalog = useCallback(() => {
    setIsCatalogOpen(false);
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Dashboard"
        description="Your personalized dashboard with customizable widgets"
        actions={
          <div className="flex items-center gap-2">
            {isCustomizing && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenCatalog}
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Add Widget
              </Button>
            )}
            <Button
              variant={isCustomizing ? 'default' : 'outline'}
              size="sm"
              onClick={handleToggleCustomize}
            >
              <Settings2 className="mr-2 h-4 w-4" aria-hidden="true" />
              {isCustomizing ? 'Done' : 'Customize'}
            </Button>
          </div>
        }
      />

      {/* Date Range Selector */}
      <div className="px-6 py-4 border-b bg-muted/30">
        <DateRangeSelector
          value={dateRange}
          preset={preset}
          onChange={setDateRange}
          onPresetChange={setPreset}
          showPresetLabel
        />
      </div>

      <PageLayout.Content>
        {/* DnD Provider wraps the grid */}
        <DashboardDndProvider onDragEnd={handleDragEnd}>
          <DashboardGrid
            widgets={widgets}
            isCustomizing={isCustomizing}
            isLoading={isLoading}
            error={error instanceof Error ? error : error ? new Error('Failed to load dashboard') : null}
            onReorder={handleReorder}
          />
        </DashboardDndProvider>

        {/* Widget Catalog Drawer */}
        <WidgetCatalog
          availableWidgets={availableCatalogWidgets}
          isOpen={isCatalogOpen}
          onClose={handleCloseCatalog}
          onAddWidget={handleAddWidget}
          isLoading={isWidgetsLoading}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}

export default DashboardGridPage;
