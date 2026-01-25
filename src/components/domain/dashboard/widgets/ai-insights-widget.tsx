/**
 * AI Insights Widget
 *
 * ARCHITECTURE: Presenter Component - Pure UI, receives all data via props.
 *
 * Displays AI-generated insights from dashboard metrics analysis.
 * Shows pattern recognition, anomalies, trends, and recommendations.
 *
 * Features:
 * - Priority-sorted insight cards
 * - Category filtering
 * - Dismiss/acknowledge actions
 * - Click-through to detailed views
 * - Loading skeleton state
 *
 * @see _Initiation/_prd/2-domains/dashboard/dashboard.prd.json - DASH-AI-INSIGHTS
 */

import { memo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Trophy,
  ShieldAlert,
  Repeat,
  X,
  ChevronRight,
  RefreshCw,
  Filter,
} from 'lucide-react';
import type {
  Insight,
  InsightCategory,
  InsightPriority,
  GetInsightsResponse,
} from '@/lib/schemas/dashboard/ai-insights';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the AiInsightsWidget component.
 */
export interface AiInsightsWidgetProps {
  /** @source Container useInsights hook - insights response data */
  insights?: GetInsightsResponse;
  /** @source Container query state - true when loading */
  isLoading?: boolean;
  /** @source Container query state - error from query */
  error?: Error | null;
  /** @source Container mutation - dismiss an insight */
  onDismiss?: (insightId: string) => void;
  /** @source Container mutation - mark insight as viewed */
  onView?: (insightId: string) => void;
  /** @source Container callback - refresh insights */
  onRefresh?: () => void;
  /** @source Container callback - navigate to insight action URL */
  onActionClick?: (url: string) => void;
  /** Maximum insights to display */
  maxItems?: number;
  /** Show category filter */
  showFilter?: boolean;
  /** Compact mode for smaller widget sizes */
  compact?: boolean;
  /** Optional className */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_CONFIG: Record<InsightCategory, { icon: typeof Sparkles; label: string }> = {
  pattern: { icon: Repeat, label: 'Pattern' },
  anomaly: { icon: AlertTriangle, label: 'Anomaly' },
  trend: { icon: TrendingUp, label: 'Trend' },
  opportunity: { icon: Lightbulb, label: 'Opportunity' },
  risk: { icon: ShieldAlert, label: 'Risk' },
  recommendation: { icon: Sparkles, label: 'Suggestion' },
  achievement: { icon: Trophy, label: 'Achievement' },
};

const PRIORITY_STYLES: Record<InsightPriority, string> = {
  critical: 'border-l-destructive bg-destructive/5',
  high: 'border-l-amber-500 bg-amber-50',
  medium: 'border-l-blue-500 bg-blue-50',
  low: 'border-l-muted bg-muted/30',
};

const PRIORITY_BADGE_STYLES: Record<InsightPriority, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-amber-100 text-amber-800',
  medium: 'bg-blue-100 text-blue-800',
  low: 'bg-muted text-muted-foreground',
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Loading skeleton for insights.
 */
const InsightsSkeleton = memo(function InsightsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-l-4 p-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="size-5 rounded" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-1 h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
});

/**
 * Empty state when no insights.
 */
const InsightsEmpty = memo(function InsightsEmpty({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-3 rounded-full bg-primary/10 p-3">
        <Sparkles className="size-6 text-primary" />
      </div>
      <h4 className="mb-1 text-sm font-medium">No Insights Available</h4>
      <p className="mb-4 text-sm text-muted-foreground">
        Insights are generated from your dashboard metrics.
      </p>
      {onRefresh && (
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="mr-2 size-4" />
          Generate Insights
        </Button>
      )}
    </div>
  );
});

/**
 * Error state.
 */
const InsightsError = memo(function InsightsError({
  error,
  onRetry,
}: {
  error: Error;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-3 rounded-full bg-destructive/10 p-3">
        <AlertTriangle className="size-6 text-destructive" />
      </div>
      <h4 className="mb-1 text-sm font-medium">Unable to Load Insights</h4>
      <p className="mb-4 text-sm text-muted-foreground">{error.message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-2 size-4" />
          Try Again
        </Button>
      )}
    </div>
  );
});

/**
 * Individual insight card.
 */
interface InsightCardProps {
  insight: Insight;
  onDismiss?: (id: string) => void;
  onActionClick?: (url: string) => void;
  compact?: boolean;
}

const InsightCard = memo(function InsightCard({
  insight,
  onDismiss,
  onActionClick,
  compact = false,
}: InsightCardProps) {
  const config = CATEGORY_CONFIG[insight.category];
  const Icon = config.icon;
  const primaryAction = insight.actions?.[0];

  return (
    <div
      className={cn(
        'rounded-lg border border-l-4 p-3 transition-colors hover:bg-accent/50',
        PRIORITY_STYLES[insight.priority]
      )}
      role="article"
      aria-label={insight.title}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 flex-shrink-0">
            <Icon className={cn('size-4', insight.priority === 'critical' && 'text-destructive')} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-medium leading-tight">{insight.title}</h4>
            {!compact && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {insight.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1">
          <Badge
            variant="secondary"
            className={cn('text-[10px] uppercase', PRIORITY_BADGE_STYLES[insight.priority])}
          >
            {insight.priority}
          </Badge>

          {onDismiss && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => onDismiss(insight.id)}
                    aria-label="Dismiss insight"
                  >
                    <X className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Dismiss</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Metrics preview */}
      {!compact && insight.metrics && insight.metrics.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {insight.metrics.slice(0, 2).map((metric) => (
            <div
              key={metric.id}
              className="flex items-center gap-1 rounded bg-background/50 px-2 py-0.5 text-xs"
            >
              <span className="text-muted-foreground">{metric.name}:</span>
              <span className="font-medium">
                {typeof metric.currentValue === 'number'
                  ? metric.currentValue.toLocaleString()
                  : metric.currentValue}
              </span>
              {metric.changePercent !== undefined && (
                <span
                  className={cn(
                    'flex items-center',
                    metric.changePercent > 0 ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {metric.changePercent > 0 ? (
                    <TrendingUp className="size-3" />
                  ) : (
                    <TrendingDown className="size-3" />
                  )}
                  {Math.abs(metric.changePercent).toFixed(1)}%
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Primary action */}
      {primaryAction && onActionClick && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-7 w-full justify-between text-xs"
          onClick={() => onActionClick(primaryAction.url || '')}
        >
          {primaryAction.label}
          <ChevronRight className="size-3" />
        </Button>
      )}
    </div>
  );
});

/**
 * Category filter buttons.
 */
interface CategoryFilterProps {
  categories: InsightCategory[];
  selectedCategory: InsightCategory | null;
  onSelect: (category: InsightCategory | null) => void;
}

const CategoryFilter = memo(function CategoryFilter({
  categories,
  selectedCategory,
  onSelect,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-1">
      <Button
        variant={selectedCategory === null ? 'secondary' : 'ghost'}
        size="sm"
        className="h-7 text-xs"
        onClick={() => onSelect(null)}
      >
        All
      </Button>
      {categories.map((category) => {
        const config = CATEGORY_CONFIG[category];
        const Icon = config.icon;
        return (
          <Button
            key={category}
            variant={selectedCategory === category ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => onSelect(category)}
          >
            <Icon className="mr-1 size-3" />
            {config.label}
          </Button>
        );
      })}
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * AI Insights Widget for dashboard.
 *
 * @example
 * ```tsx
 * <AiInsightsWidget
 *   insights={insightsData}
 *   isLoading={isLoading}
 *   onDismiss={handleDismiss}
 *   onRefresh={refetch}
 *   onActionClick={(url) => router.push(url)}
 * />
 * ```
 */
export const AiInsightsWidget = memo(function AiInsightsWidget({
  insights,
  isLoading = false,
  error,
  onDismiss,
  onView: _onView,
  onRefresh,
  onActionClick,
  maxItems = 5,
  showFilter = true,
  compact = false,
  className,
}: AiInsightsWidgetProps) {
  const [selectedCategory, setSelectedCategory] = useState<InsightCategory | null>(null);

  // Filter insights by category
  const filteredInsights = insights?.insights.filter(
    (insight) => selectedCategory === null || insight.category === selectedCategory
  );

  // Get unique categories from insights
  const availableCategories = insights
    ? [...new Set(insights.insights.map((i) => i.category))]
    : [];

  // Limit items
  const displayInsights = filteredInsights?.slice(0, maxItems);

  // Get summary counts
  const criticalCount = insights?.summary.byPriority.critical ?? 0;
  const highCount = insights?.summary.byPriority.high ?? 0;
  const unviewedCount = insights?.summary.unviewed ?? 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <div>
              <CardTitle className="text-base">AI Insights</CardTitle>
              {!compact && (
                <CardDescription className="text-xs">
                  {unviewedCount > 0
                    ? `${unviewedCount} new insight${unviewedCount !== 1 ? 's' : ''}`
                    : 'Automated analysis of your metrics'}
                </CardDescription>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Priority indicators */}
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalCount} Critical
              </Badge>
            )}
            {highCount > 0 && (
              <Badge variant="outline" className="border-amber-500 text-amber-700 text-xs">
                {highCount} High
              </Badge>
            )}

            {/* Refresh button */}
            {onRefresh && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={onRefresh}
                      disabled={isLoading}
                    >
                      <RefreshCw className={cn('size-4', isLoading && 'animate-spin')} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh Insights</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Category filter */}
        {showFilter && availableCategories.length > 1 && !compact && (
          <div className="mt-2 flex items-center gap-2">
            <Filter className="size-3 text-muted-foreground" />
            <CategoryFilter
              categories={availableCategories}
              selectedCategory={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <InsightsSkeleton count={compact ? 2 : 3} />
        ) : error ? (
          <InsightsError error={error} onRetry={onRefresh} />
        ) : !displayInsights || displayInsights.length === 0 ? (
          <InsightsEmpty onRefresh={onRefresh} />
        ) : (
          <ScrollArea className={compact ? 'h-[200px]' : 'h-[350px]'}>
            <div className="space-y-2 pr-4">
              {displayInsights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onDismiss={onDismiss}
                  onActionClick={onActionClick}
                  compact={compact}
                />
              ))}

              {filteredInsights && filteredInsights.length > maxItems && (
                <Button
                  variant="ghost"
                  className="w-full text-xs"
                  onClick={() => onActionClick?.('/dashboard/insights')}
                >
                  View All {filteredInsights.length} Insights
                  <ChevronRight className="ml-1 size-3" />
                </Button>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
});

export default AiInsightsWidget;
