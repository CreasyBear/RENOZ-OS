/**
 * CSAT Display Card Component
 *
 * Displays customer satisfaction rating on issue detail page.
 * Shows existing rating or prompts for rating entry.
 *
 * @see src/hooks/use-csat.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-005a
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { StarRating, RatingBadge } from './star-rating';
import { CsatEntryDialog } from './csat-entry-dialog';
import { toast } from '@/hooks/_shared/use-toast';
import { formatSupportMutationError } from '@/hooks/support';
import { formatDistanceToNow, format } from 'date-fns';
import {
  MessageSquare,
  MessageSquarePlus,
  Send,
  User,
  Building2,
  Clock,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Source labels
const SOURCE_LABELS: Record<string, string> = {
  email_link: 'Email Response',
  internal_entry: 'Internal Entry',
  public_form: 'Public Form',
};

const CSAT_LINK_ERROR_MESSAGES = {
  NOT_FOUND: 'The support issue could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to generate feedback links.',
  AUTH_ERROR: 'Your session has expired. Sign in again before generating feedback links.',
  RATE_LIMIT: 'Too many feedback links were requested. Wait a moment and retry.',
};

function formatCsatLinkError(error: unknown, fallback: string): string {
  return formatSupportMutationError(error, fallback, {
    codeMessages: CSAT_LINK_ERROR_MESSAGES,
  });
}

interface CsatDisplayCardProps {
  /** Issue ID */
  issueId: string;
  /** Issue title for context */
  issueTitle?: string;
  /** Issue status - used to determine if rating can be requested */
  issueStatus?: string;
  /** From route container (useIssueFeedback). */
  feedback?: {
    rating: number;
    submittedAt: Date | string;
    comment?: string | null;
    source: string;
    submittedByUser?: { name: string | null; email: string } | null;
    submittedByCustomer?: { name: string } | null;
  } | null;
  /** From route container (useIssueFeedback). */
  isLoading?: boolean;
  /** From route container (useIssueFeedback). */
  error?: Error | null;
  /** From route container (useIssueFeedback). */
  onRefresh?: () => void;
  /** From route container (useGenerateFeedbackToken). */
  onGenerateFeedbackLink?: (issueId: string) => Promise<{ feedbackUrl: string }>;
  /** From route container (useGenerateFeedbackToken). */
  isGeneratingLink?: boolean;
  /** From route container (useSubmitInternalFeedback). */
  onSubmitFeedback: (payload: {
    issueId: string;
    rating: number;
    comment: string | null;
  }) => Promise<void>;
  /** From route container (useSubmitInternalFeedback). */
  isSubmittingFeedback?: boolean;
  /** Custom class name */
  className?: string;
}

export function CsatDisplayCard({
  issueId,
  issueTitle,
  issueStatus,
  feedback,
  isLoading,
  error,
  onRefresh,
  onGenerateFeedbackLink,
  isGeneratingLink,
  onSubmitFeedback,
  isSubmittingFeedback,
  className,
}: CsatDisplayCardProps) {
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [generatedFeedbackUrl, setGeneratedFeedbackUrl] = useState<string | null>(null);

  const copyFeedbackLink = async (feedbackUrl: string) => {
    try {
      await navigator.clipboard.writeText(feedbackUrl);
      setCopiedLink(true);
      toast.success('Feedback link copied to clipboard.');
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      setCopiedLink(false);
      toast.error('Feedback link is ready, but clipboard access was blocked. Copy it manually.');
    }
  };

  const handleGenerateLink = async () => {
    try {
      if (!onGenerateFeedbackLink) {
        toast.error('Feedback link generation is unavailable.');
        return;
      }
      const result = await onGenerateFeedbackLink(issueId);
      setGeneratedFeedbackUrl(result.feedbackUrl);
      await copyFeedbackLink(result.feedbackUrl);
    } catch (err) {
      toast.error(formatCsatLinkError(err, 'Failed to generate feedback link'));
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isResolved = issueStatus === 'resolved' || issueStatus === 'closed';

  if (error && !feedback) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="text-muted-foreground h-4 w-4" />
            Customer Satisfaction
          </CardTitle>
          <CardDescription>Feedback status unavailable</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <MessageSquare className="h-4 w-4" />
            <AlertTitle>Unable to load customer feedback</AlertTitle>
            <AlertDescription className="space-y-3">
              <span className="block">{error.message}</span>
              {onRefresh ? (
                <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
                  Retry
                </Button>
              ) : null}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (feedback && feedback.rating > 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              Customer Satisfaction
            </CardTitle>
            <RatingBadge rating={feedback.rating} />
          </div>
          <CardDescription>
            Collected{' '}
            {formatDistanceToNow(new Date(feedback.submittedAt), {
              addSuffix: true,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <StarRating value={feedback.rating} size="md" />
            <span className="text-muted-foreground">{feedback.rating} out of 5</span>
          </div>

          {feedback.comment && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm italic">&quot;{feedback.comment}&quot;</p>
            </div>
          )}

          <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {format(new Date(feedback.submittedAt), "MMM d, yyyy 'at' h:mm a")}
            </div>

            {feedback.submittedByUser && (
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {feedback.submittedByUser.name || feedback.submittedByUser.email}
              </div>
            )}

            {feedback.submittedByCustomer && (
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                {feedback.submittedByCustomer.name}
              </div>
            )}

            <span className="bg-muted rounded px-2 py-0.5 text-xs">
              {SOURCE_LABELS[feedback.source] || feedback.source}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn('border-dashed', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="text-muted-foreground h-4 w-4" />
            Customer Satisfaction
          </CardTitle>
          <CardDescription>No feedback received yet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <StarRating value={0} size="md" />
            <span className="text-muted-foreground">Not yet rated</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setEntryDialogOpen(true)}>
              <MessageSquarePlus className="mr-2 h-4 w-4" />
              Enter Rating Manually
            </Button>

            {isResolved && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateLink}
                disabled={isGeneratingLink}
              >
                {copiedLink ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                    Link Copied
                  </>
                ) : isGeneratingLink ? (
                  <>
                    <Copy className="mr-2 h-4 w-4 animate-pulse" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Generate Feedback Link
                  </>
                )}
              </Button>
            )}
          </div>

          {!isResolved && (
            <p className="text-muted-foreground text-xs">
              Feedback link can be generated once the issue is resolved.
            </p>
          )}

          {generatedFeedbackUrl ? (
            <div className="bg-muted/40 space-y-2 rounded-md border p-2">
              <p className="text-muted-foreground text-xs">Feedback link ready</p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={generatedFeedbackUrl}
                  className="h-8 text-xs"
                  onFocus={(event) => event.currentTarget.select()}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void copyFeedbackLink(generatedFeedbackUrl)}
                >
                  {copiedLink ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <CsatEntryDialog
        open={entryDialogOpen}
        onOpenChange={setEntryDialogOpen}
        issueId={issueId}
        issueTitle={issueTitle}
        onSuccess={onRefresh}
        onSubmit={onSubmitFeedback}
        isSubmitting={isSubmittingFeedback}
      />
    </>
  );
}
