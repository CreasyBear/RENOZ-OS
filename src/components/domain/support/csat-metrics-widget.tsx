/**
 * CSAT Metrics Widget Component
 *
 * Dashboard widget displaying CSAT score, distribution, and trend.
 *
 * @see src/hooks/use-csat.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-005c
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { StarRating, RatingBadge } from './star-rating';
import type { CsatMetricsResponse } from '@/lib/schemas/support/csat-responses';
import { TrendingUp, TrendingDown, Minus, Star, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CsatMetricsWidgetProps {
  /** From route container (useCsatMetrics). */
  metrics?: CsatMetricsResponse | null;
  /** From route container (useCsatMetrics). */
  isLoading?: boolean;
  /** From route container (useCsatMetrics). */
  error?: unknown;
  /** Whether to show the trend comparison */
  showTrend?: boolean;
  /** Whether to show rating distribution */
  showDistribution?: boolean;
  /** Custom class name */
  className?: string;
}

export function CsatMetricsWidget({
  metrics,
  isLoading,
  error,
  showTrend = true,
  showDistribution = true,
  className,
}: CsatMetricsWidgetProps) {
  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error || !metrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="h-4 w-4" />
            Customer Satisfaction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Unable to load CSAT metrics</p>
        </CardContent>
      </Card>
    );
  }

  const { averageRating, totalResponses, ratingDistribution, trend } = metrics;

  // Trend indicator
  const getTrendIndicator = () => {
    if (trend.change > 0) {
      return {
        icon: <TrendingUp className="h-4 w-4 text-green-500" />,
        text: `+${trend.changePercent.toFixed(1)}%`,
        color: 'text-green-500',
      };
    } else if (trend.change < 0) {
      return {
        icon: <TrendingDown className="h-4 w-4 text-red-500" />,
        text: `${trend.changePercent.toFixed(1)}%`,
        color: 'text-red-500',
      };
    }
    return {
      icon: <Minus className="text-muted-foreground h-4 w-4" />,
      text: 'No change',
      color: 'text-muted-foreground',
    };
  };

  const trendIndicator = getTrendIndicator();

  // Rating color
  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'bg-green-500';
    if (rating >= 3) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Star className="h-4 w-4" />
          Customer Satisfaction
        </CardTitle>
        <CardDescription>
          Based on {totalResponses} response{totalResponses !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Score */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-3xl font-bold">
              {averageRating > 0 ? averageRating.toFixed(1) : '—'}
            </div>
            <div className="flex items-center gap-1">
              <StarRating value={Math.round(averageRating)} size="sm" />
            </div>
          </div>

          {showTrend && (
            <div className={cn('flex items-center gap-1 text-sm', trendIndicator.color)}>
              {trendIndicator.icon}
              <span>{trendIndicator.text}</span>
            </div>
          )}
        </div>

        {/* Distribution */}
        {showDistribution && (
          <div className="space-y-2">
            <div className="text-muted-foreground flex items-center justify-between text-sm">
              <span>Rating Distribution</span>
              <BarChart3 className="h-4 w-4" />
            </div>
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((rating) => {
                const data = ratingDistribution.find((d) => d.rating === rating);
                const percentage = data?.percentage ?? 0;
                const count = data?.count ?? 0;

                return (
                  <div key={rating} className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground w-3">{rating}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <Progress
                      value={percentage}
                      className={cn('h-2 flex-1', getRatingColor(rating))}
                    />
                    <span className="text-muted-foreground w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Trend Comparison */}
        {showTrend && trend.previousPeriod > 0 && (
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Previous period</span>
              <RatingBadge rating={trend.previousPeriod} size="sm" />
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current period</span>
              <RatingBadge rating={trend.currentPeriod} size="sm" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
