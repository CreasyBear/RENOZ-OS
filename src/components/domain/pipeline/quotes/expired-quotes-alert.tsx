/**
 * ExpiredQuotesAlert Presenter
 *
 * Dashboard alert showing expired and expiring quotes.
 * Allows quick actions like extending validity or viewing details.
 *
 * Pure presenter - all data passed via props from container.
 *
 * @see ./expired-quotes-alert-container.tsx (container)
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-VALIDITY-UI)
 */

import { memo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  AlertTriangle,
  XCircle,
  Clock,
  ChevronRight,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { FormatAmount } from '@/components/shared/format';
import { TruncateTooltip } from '@/components/shared/truncate-tooltip';
import { formatDistanceToNow } from 'date-fns';
import { ExtendValidityDialog } from './extend-validity-dialog';

// ============================================================================
// TYPES
// ============================================================================

type QuoteItem = {
  opportunityId: string;
  opportunityTitle: string;
  customerId: string;
  quoteExpiresAt: Date | null;
  value: number;
  stage: string;
  daysUntilExpiry?: number;
  daysSinceExpiry?: number;
};

/**
 * Container props - used by parent components
 */
export interface ExpiredQuotesAlertContainerProps {
  warningDays?: number;
  maxItems?: number;
  showExpired?: boolean;
  showExpiring?: boolean;
  variant?: 'alert' | 'card';
  className?: string;
}

/**
 * Presenter props - receives data from container
 */
export interface ExpiredQuotesAlertPresenterProps {
  /** @source useExpiringQuotes hook */
  expiringQuotes: QuoteItem[];
  /** @source useExpiredQuotes hook */
  expiredQuotes: QuoteItem[];
  /** @source Combined loading state from container */
  isLoading: boolean;
  warningDays: number;
  maxItems: number;
  showExpired: boolean;
  showExpiring: boolean;
  variant: 'alert' | 'card';
  className?: string;
}

// ============================================================================
// PRESENTER COMPONENT
// ============================================================================

export const ExpiredQuotesAlertPresenter = memo(function ExpiredQuotesAlertPresenter({
  expiringQuotes,
  expiredQuotes,
  isLoading,
  warningDays,
  maxItems,
  showExpired,
  showExpiring,
  variant,
  className,
}: ExpiredQuotesAlertPresenterProps) {
  const [expiredOpen, setExpiredOpen] = useState(true);
  const [expiringOpen, setExpiringOpen] = useState(true);

  const totalExpired = expiredQuotes.length;
  const totalExpiring = expiringQuotes.length;

  // Don't render if nothing to show
  if (!isLoading && totalExpired === 0 && totalExpiring === 0) {
    return null;
  }

  const renderQuoteItem = (quote: QuoteItem, isExpired: boolean) => (
    <div
      key={quote.opportunityId}
      className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            to="/pipeline/$opportunityId"
            params={{ opportunityId: quote.opportunityId }}
            className="font-medium hover:underline"
          >
            <TruncateTooltip text={quote.opportunityTitle} />
          </Link>
          <Badge variant="outline" className="text-xs shrink-0">
            <FormatAmount amount={quote.value} />
          </Badge>
        </div>
        <TruncateTooltip
          text={`Customer ID: ${quote.customerId} • ${quote.stage}`}
          className="text-sm text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground">
          {isExpired
            ? `Expired ${quote.quoteExpiresAt ? formatDistanceToNow(new Date(quote.quoteExpiresAt), { addSuffix: true }) : 'unknown'}`
            : `Expires ${quote.quoteExpiresAt ? formatDistanceToNow(new Date(quote.quoteExpiresAt), { addSuffix: true }) : 'unknown'}`}
        </p>
      </div>
      <div className="flex items-center gap-2 ml-2">
        <ExtendValidityDialog
          opportunityId={quote.opportunityId}
          quoteNumber={quote.opportunityTitle}
          currentValidUntil={quote.quoteExpiresAt?.toISOString() ?? new Date().toISOString()}
          trigger={
            <Button variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          }
        />
        <Link to="/pipeline/$opportunityId" params={{ opportunityId: quote.opportunityId }}>
          <Button variant="ghost" size="sm">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );

  if (variant === 'alert') {
    return (
      <div className={cn('space-y-2', className)}>
        {showExpired && totalExpired > 0 && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Expired Quotes</AlertTitle>
            <AlertDescription>
              {totalExpired} quote{totalExpired !== 1 ? 's have' : ' has'} expired
              and can no longer be accepted.{' '}
              <Link
                to="/pipeline"
                className="underline"
              >
                View all
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {showExpiring && totalExpiring > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Expiring Soon</AlertTitle>
            <AlertDescription>
              {totalExpiring} quote{totalExpiring !== 1 ? 's are' : ' is'} expiring
              within the next {warningDays} days.{' '}
              <Link
                to="/pipeline"
                className="underline"
              >
                View all
              </Link>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Quote Validity Alerts
        </CardTitle>
        <CardDescription>
          Quotes requiring attention due to expiration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <>
            {/* Expired Quotes Section */}
            {showExpired && totalExpired > 0 && (
              <Collapsible open={expiredOpen} onOpenChange={setExpiredOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-2 h-auto"
                  >
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span className="font-medium text-destructive">
                        Expired ({totalExpired})
                      </span>
                    </div>
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 transition-transform',
                        expiredOpen && 'rotate-90'
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-l-2 border-destructive ml-2 pl-2 space-y-1">
                    {expiredQuotes.slice(0, maxItems).map((quote) =>
                      renderQuoteItem(quote, true)
                    )}
                    {totalExpired > maxItems && (
                      <Link
                        to="/pipeline"
                        className="block text-sm text-muted-foreground hover:text-foreground px-3 py-2"
                      >
                        View all {totalExpired} expired quotes →
                      </Link>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Expiring Quotes Section */}
            {showExpiring && totalExpiring > 0 && (
              <Collapsible open={expiringOpen} onOpenChange={setExpiringOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-2 h-auto"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium text-yellow-600">
                        Expiring Soon ({totalExpiring})
                      </span>
                    </div>
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 transition-transform',
                        expiringOpen && 'rotate-90'
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-l-2 border-yellow-500 ml-2 pl-2 space-y-1">
                    {expiringQuotes.slice(0, maxItems).map((quote) =>
                      renderQuoteItem(quote, false)
                    )}
                    {totalExpiring > maxItems && (
                      <Link
                        to="/pipeline"
                        className="block text-sm text-muted-foreground hover:text-foreground px-3 py-2"
                      >
                        View all {totalExpiring} expiring quotes →
                      </Link>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* No alerts */}
            {totalExpired === 0 && totalExpiring === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                No quote validity alerts
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});

/**
 * @deprecated Use ExpiredQuotesAlertContainer instead for new code.
 * This export is kept for backwards compatibility.
 */
export const ExpiredQuotesAlert = ExpiredQuotesAlertPresenter;

export default ExpiredQuotesAlertPresenter;
