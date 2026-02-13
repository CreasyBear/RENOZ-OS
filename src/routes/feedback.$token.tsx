/**
 * Public Feedback Route
 *
 * Token-based feedback form for customers to rate their support experience.
 * No authentication required - validated via unique token.
 *
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-005b
 */

import * as React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useValidateFeedbackToken, useSubmitPublicFeedback } from '@/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { StarRating } from '@/components/domain/support';
import { CheckCircle2, AlertCircle, Clock, MessageSquare, Building2 } from 'lucide-react';

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/feedback/$token')({
  component: PublicFeedbackPage,
});

// ============================================================================
// PAGE COMPONENT
// ============================================================================

function PublicFeedbackPage() {
  const { token } = Route.useParams();
  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);

  // Validate token
  const {
    data: validation,
    isLoading: validating,
    error: validationError,
  } = useValidateFeedbackToken({ token });

  // Submit mutation
  const submitMutation = useSubmitPublicFeedback();
  const handleSubmit = () => {
    submitMutation.mutate(
      {
        token,
        rating,
        comment: comment.trim() || null,
        email: email.trim() || null,
      },
      {
        onSuccess: () => setSubmitted(true),
      }
    );
  };

  // Loading state
  if (validating) {
    return (
      <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Skeleton className="mx-auto h-8 w-48" />
            <Skeleton className="mx-auto mt-2 h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid/expired token
  if (!validation?.valid || validationError) {
    const errorMessage =
      validation?.error ||
      (validationError instanceof Error ? validationError.message : 'Invalid feedback link');
    const isExpired = validation?.expired;
    const isAlreadySubmitted = validation?.alreadySubmitted;

    return (
      <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {isExpired ? (
                <Clock className="h-12 w-12 text-amber-500" />
              ) : isAlreadySubmitted ? (
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              ) : (
                <AlertCircle className="text-destructive h-12 w-12" />
              )}
            </div>
            <CardTitle>
              {isAlreadySubmitted
                ? 'Feedback Already Submitted'
                : isExpired
                  ? 'Link Expired'
                  : 'Invalid Link'}
            </CardTitle>
            <CardDescription>
              {isAlreadySubmitted
                ? "Thank you! We've already received your feedback for this support case."
                : isExpired
                  ? 'This feedback link has expired. Please contact support if you still wish to provide feedback.'
                  : errorMessage}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Thank You!</CardTitle>
            <CardDescription className="text-base">
              Your feedback has been submitted successfully. We appreciate you taking the time to
              help us improve our service.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="mb-4 flex justify-center">
              <StarRating value={rating} size="lg" />
            </div>
            <p className="text-muted-foreground text-sm">You can now close this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Feedback form
  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <MessageSquare className="text-primary h-12 w-12" />
          </div>
          <CardTitle className="text-2xl">How did we do?</CardTitle>
          <CardDescription>Please rate your experience with our support team.</CardDescription>
          {validation.issue && (
            <div className="text-muted-foreground mt-3 flex items-center justify-center gap-2 text-sm">
              <Building2 className="h-4 w-4" />
              <span>
                Issue #{validation.issue.issueNumber}: {validation.issue.title}
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Star Rating */}
          <div className="space-y-3">
            <Label className="block text-center">Your Rating *</Label>
            <div className="flex justify-center">
              <StarRating value={rating} onChange={setRating} size="lg" showLabel />
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Additional Comments (Optional)</Label>
            <Textarea
              id="comment"
              placeholder="Tell us about your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={2000}
            />
            <p className="text-muted-foreground text-right text-xs">{comment.length}/2000</p>
          </div>

          {/* Email (optional) */}
          <div className="space-y-2">
            <Label htmlFor="email">Your Email (Optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Provide your email if you&apos;d like us to follow up on your feedback.
            </p>
          </div>

          {/* Error message */}
          {submitMutation.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {submitMutation.error instanceof Error
                  ? submitMutation.error.message
                  : 'Failed to submit feedback. Please try again.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={rating === 0 || submitMutation.isPending}
          >
            {submitMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
