/**
 * Mobile Dashboard
 *
 * ARCHITECTURE: Presenter Component - Pure UI, receives all data via props.
 *
 * Mobile-optimized dashboard with touch interactions:
 * - Single-column layout for small screens
 * - Pull-to-refresh for data updates
 * - Swipe gestures for widget navigation
 * - Touch-friendly widget interactions
 * - Full-screen spinner on initial load
 *
 * @see _Initiation/_prd/2-domains/dashboard/dashboard.prd.json - DASH-MOBILE-UI
 */

import { memo, useState, useCallback, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { PullToRefresh } from './pull-to-refresh';
import { SwipeContainer } from './swipe-container';
import { RefreshCw, Calendar, TrendingUp, Activity, Target } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Widget configuration for mobile dashboard.
 */
export interface MobileWidgetConfig {
  /** Unique widget instance ID */
  id: string;
  /** Widget type identifier */
  type: 'kpi' | 'chart' | 'activity' | 'target' | 'custom';
  /** Widget title for mobile header */
  title: string;
  /** Optional icon component */
  icon?: ReactNode;
}

/**
 * Page configuration for swipeable sections.
 */
export interface MobileDashboardPage {
  /** Unique page ID */
  id: string;
  /** Page title for header/indicator */
  title: string;
  /** Widget IDs on this page */
  widgetIds: string[];
}

/**
 * Props for the MobileDashboard component.
 */
export interface MobileDashboardProps {
  /** @source Container state - widget configurations */
  widgets: MobileWidgetConfig[];
  /** @source Container state - page configurations for swipe navigation */
  pages?: MobileDashboardPage[];
  /** @source Container state - true during initial data load */
  isInitialLoading?: boolean;
  /** @source Container state - true during background refresh */
  isRefreshing?: boolean;
  /** @source Container state - error from data fetch */
  error?: Error | null;
  /** @source Container async callback - triggers data refetch */
  onRefresh: () => Promise<void>;
  /** @source Container render callback - renders actual widget component */
  renderWidget: (widget: MobileWidgetConfig) => ReactNode;
  /** @source DashboardContext - current date range label */
  dateRangeLabel?: string;
  /** @source DashboardContext - last update timestamp */
  lastUpdated?: Date;
  /** Enable/disable pull-to-refresh */
  pullToRefreshEnabled?: boolean;
  /** Enable/disable swipe navigation */
  swipeEnabled?: boolean;
  /** Optional className for container */
  className?: string;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Full-screen loading spinner for initial load.
 */
const FullScreenLoader = memo(function FullScreenLoader() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background"
      role="status"
      aria-label="Loading dashboard"
    >
      <div className="flex flex-col items-center gap-4">
        <Spinner className="size-10 text-primary" />
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  );
});

/**
 * Mobile header with date range and refresh indicator.
 */
interface MobileHeaderProps {
  dateRangeLabel?: string;
  lastUpdated?: Date;
  isRefreshing?: boolean;
  onManualRefresh: () => void;
}

const MobileHeader = memo(function MobileHeader({
  dateRangeLabel,
  lastUpdated,
  isRefreshing,
  onManualRefresh,
}: MobileHeaderProps) {
  const formatLastUpdated = (date?: Date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between bg-background/95 px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Calendar className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">{dateRangeLabel || 'Last 30 days'}</span>
      </div>

      <div className="flex items-center gap-3">
        {lastUpdated && (
          <span className="text-xs text-muted-foreground">
            {formatLastUpdated(lastUpdated)}
          </span>
        )}
        <button
          type="button"
          onClick={onManualRefresh}
          disabled={isRefreshing}
          className={cn(
            'rounded-full p-2 transition-colors',
            isRefreshing ? 'opacity-50' : 'hover:bg-muted active:bg-muted/80'
          )}
          aria-label="Refresh dashboard"
        >
          <RefreshCw
            className={cn('size-4', isRefreshing && 'animate-spin')}
          />
        </button>
      </div>
    </div>
  );
});

/**
 * Widget skeleton for loading states.
 */
const WidgetSkeleton = memo(function WidgetSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-5 rounded" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
});

/**
 * Error state display.
 */
interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
}

const ErrorState = memo(function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 rounded-full bg-destructive/10 p-3">
        <TrendingUp className="size-6 text-destructive" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">Unable to load dashboard</h3>
      <p className="mb-6 text-sm text-muted-foreground">
        {error.message || 'An unexpected error occurred'}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <RefreshCw className="size-4" />
        Try again
      </button>
    </div>
  );
});

/**
 * Section header with icon.
 */
interface SectionHeaderProps {
  title: string;
  icon?: ReactNode;
}

const SectionHeader = memo(function SectionHeader({ title, icon }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
    </div>
  );
});

// ============================================================================
// DEFAULT PAGES CONFIGURATION
// ============================================================================

const getDefaultPages = (widgets: MobileWidgetConfig[]): MobileDashboardPage[] => {
  // Group widgets by type for default layout
  const kpiWidgets = widgets.filter((w) => w.type === 'kpi').map((w) => w.id);
  const chartWidgets = widgets.filter((w) => w.type === 'chart').map((w) => w.id);
  const activityWidgets = widgets.filter((w) => w.type === 'activity').map((w) => w.id);
  const targetWidgets = widgets.filter((w) => w.type === 'target').map((w) => w.id);
  const customWidgets = widgets.filter((w) => w.type === 'custom').map((w) => w.id);

  const pages: MobileDashboardPage[] = [];

  // Create a metrics page with KPIs
  if (kpiWidgets.length > 0) {
    pages.push({
      id: 'metrics',
      title: 'Metrics',
      widgetIds: kpiWidgets,
    });
  }

  // Charts get their own page
  if (chartWidgets.length > 0) {
    pages.push({
      id: 'charts',
      title: 'Charts',
      widgetIds: chartWidgets,
    });
  }

  // Activity and targets together
  if (activityWidgets.length > 0 || targetWidgets.length > 0) {
    pages.push({
      id: 'activity',
      title: 'Activity & Targets',
      widgetIds: [...activityWidgets, ...targetWidgets],
    });
  }

  // Custom widgets on their own page
  if (customWidgets.length > 0) {
    pages.push({
      id: 'custom',
      title: 'More',
      widgetIds: customWidgets,
    });
  }

  // If no pages, create a single page with all widgets
  if (pages.length === 0 && widgets.length > 0) {
    pages.push({
      id: 'all',
      title: 'Dashboard',
      widgetIds: widgets.map((w) => w.id),
    });
  }

  return pages;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Mobile-optimized dashboard with touch gestures.
 *
 * @example
 * ```tsx
 * <MobileDashboard
 *   widgets={[
 *     { id: 'revenue', type: 'kpi', title: 'Revenue' },
 *     { id: 'orders', type: 'kpi', title: 'Orders' },
 *     { id: 'trend', type: 'chart', title: 'Revenue Trend' },
 *   ]}
 *   isInitialLoading={isLoading}
 *   isRefreshing={isFetching}
 *   onRefresh={handleRefresh}
 *   renderWidget={(widget) => <KpiWidget key={widget.id} {...widgetData[widget.id]} />}
 *   dateRangeLabel="This Month"
 * />
 * ```
 */
export const MobileDashboard = memo(function MobileDashboard({
  widgets,
  pages,
  isInitialLoading = false,
  isRefreshing = false,
  error,
  onRefresh,
  renderWidget,
  dateRangeLabel,
  lastUpdated,
  pullToRefreshEnabled = true,
  swipeEnabled = true,
  className,
}: MobileDashboardProps) {
  const [activePage, setActivePage] = useState(0);

  // Use provided pages or generate default layout
  const dashboardPages = pages ?? getDefaultPages(widgets);

  // Create widget map for quick lookup
  const widgetMap = new Map(widgets.map((w) => [w.id, w]));

  // Manual refresh handler
  const handleManualRefresh = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  // Show full-screen loader on initial load
  if (isInitialLoading) {
    return <FullScreenLoader />;
  }

  // Show error state
  if (error) {
    return (
      <div className={cn('min-h-screen bg-background', className)}>
        <MobileHeader
          dateRangeLabel={dateRangeLabel}
          lastUpdated={lastUpdated}
          isRefreshing={isRefreshing}
          onManualRefresh={handleManualRefresh}
        />
        <ErrorState error={error} onRetry={handleManualRefresh} />
      </div>
    );
  }

  // Render page content
  const renderPage = (page: MobileDashboardPage) => {
    const pageWidgets = page.widgetIds
      .map((id) => widgetMap.get(id))
      .filter((w): w is MobileWidgetConfig => w !== undefined);

    return (
      <div className="space-y-4 px-4 py-2">
        {pageWidgets.map((widget) => (
          <div
            key={widget.id}
            className="touch-manipulation"
            role="article"
            aria-label={widget.title}
          >
            {isRefreshing ? <WidgetSkeleton /> : renderWidget(widget)}
          </div>
        ))}
      </div>
    );
  };

  // Main content
  const content =
    dashboardPages.length > 1 && swipeEnabled ? (
      <SwipeContainer
        currentPage={activePage}
        onPageChange={setActivePage}
        showDots
        showArrows={false}
        className="min-h-[calc(100vh-120px)]"
      >
        {dashboardPages.map((page) => (
          <div key={page.id}>
            <SectionHeader
              title={page.title}
              icon={
                page.id === 'metrics' ? (
                  <TrendingUp className="size-4" />
                ) : page.id === 'activity' ? (
                  <Activity className="size-4" />
                ) : page.id === 'charts' ? (
                  <TrendingUp className="size-4" />
                ) : (
                  <Target className="size-4" />
                )
              }
            />
            {renderPage(page)}
          </div>
        ))}
      </SwipeContainer>
    ) : (
      <div className="space-y-6 pb-6">
        {dashboardPages.map((page) => (
          <div key={page.id}>
            <SectionHeader
              title={page.title}
              icon={
                page.id === 'metrics' ? (
                  <TrendingUp className="size-4" />
                ) : page.id === 'activity' ? (
                  <Activity className="size-4" />
                ) : (
                  <Target className="size-4" />
                )
              }
            />
            {renderPage(page)}
          </div>
        ))}
      </div>
    );

  return (
    <div className={cn('min-h-screen bg-background', className)}>
      <MobileHeader
        dateRangeLabel={dateRangeLabel}
        lastUpdated={lastUpdated}
        isRefreshing={isRefreshing}
        onManualRefresh={handleManualRefresh}
      />

      {pullToRefreshEnabled ? (
        <PullToRefresh onRefresh={onRefresh} isRefreshing={isRefreshing}>
          {content}
        </PullToRefresh>
      ) : (
        content
      )}
    </div>
  );
});

export default MobileDashboard;
