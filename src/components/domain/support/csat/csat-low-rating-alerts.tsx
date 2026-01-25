/**
 * CSAT Low Rating Alerts Component
 *
 * Displays alerts for low customer satisfaction ratings (1-2 stars)
 * with follow-up action buttons.
 *
 * @see src/hooks/use-csat.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-005c
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StarRating } from './star-rating';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, ExternalLink, MessageSquare, User, Building2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CsatMetricsResponse } from '@/lib/schemas/support/csat-responses';

interface CsatLowRatingAlertsProps {
  /** From route container (useCsatMetrics). */
  metrics?: CsatMetricsResponse | null;
  /** From route container (useCsatMetrics). */
  isLoading?: boolean;
  /** From route container (useCsatMetrics). */
  error?: unknown;
  /** Maximum number of alerts to show */
  limit?: number;
  /** Custom class name */
  className?: string;
}

export function CsatLowRatingAlerts({
  metrics,
  isLoading,
  error,
  limit = 5,
  className,
}: CsatLowRatingAlertsProps) {
  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
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
            <AlertTriangle className="h-4 w-4" />
            Low Ratings Requiring Follow-up
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Unable to load low ratings</p>
        </CardContent>
      </Card>
    );
  }

  const lowRatings = metrics.recentLowRatings?.slice(0, limit) ?? [];

  // No low ratings
  if (lowRatings.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="text-muted-foreground h-4 w-4" />
            Low Ratings Requiring Follow-up
          </CardTitle>
          <CardDescription>No recent low ratings - great work!</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground py-6 text-center">
            <MessageSquare className="mx-auto mb-2 h-10 w-10 opacity-50" />
            <p className="text-sm">All customers are satisfied</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Low Ratings Requiring Follow-up
        </CardTitle>
        <CardDescription>
          {lowRatings.length} recent low rating{lowRatings.length !== 1 ? 's' : ''} need attention
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {lowRatings.map((feedback) => (
          <Alert
            key={feedback.id}
            variant="default"
            className={cn(
              'border-l-4',
              feedback.rating === 1 ? 'border-l-red-500' : 'border-l-amber-500'
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                {/* Header */}
                <div className="flex items-center gap-2">
                  <StarRating value={feedback.rating} size="sm" />
                  <Badge
                    variant={feedback.rating === 1 ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {feedback.rating === 1 ? 'Very Poor' : 'Poor'}
                  </Badge>
                </div>

                {/* Issue info */}
                {feedback.issue && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">#{feedback.issue.issueNumber}</span>
                    <span className="text-muted-foreground truncate">{feedback.issue.title}</span>
                  </div>
                )}

                {/* Comment */}
                {feedback.comment && (
                  <p className="text-muted-foreground line-clamp-2 text-sm italic">
                    &quot;{feedback.comment}&quot;
                  </p>
                )}

                {/* Metadata */}
                <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(feedback.submittedAt), {
                      addSuffix: true,
                    })}
                  </div>

                  {feedback.submittedByCustomer && (
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {feedback.submittedByCustomer.name}
                    </div>
                  )}

                  {feedback.submittedByEmail && !feedback.submittedByCustomer && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {feedback.submittedByEmail}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    // Navigate to issue detail - will be connected when support routes are created
                    window.location.href = `/issues/${feedback.issueId}`;
                  }}
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  View
                </Button>
              </div>
            </div>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}
