/**
 * CSAT Entry Dialog Component
 *
 * Dialog for internal staff to enter customer satisfaction ratings.
 * Used when feedback is collected via phone or in-person.
 *
 * @see src/hooks/use-csat.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-005a
 */

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from './star-rating';
import { toast } from 'sonner';
import { MessageSquarePlus } from 'lucide-react';

interface CsatEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Issue ID to record feedback for */
  issueId: string;
  /** Issue title for display */
  issueTitle?: string;
  /** Callback when feedback is submitted */
  onSuccess?: () => void;
  /** From route container (mutation). */
  onSubmit: (payload: {
    issueId: string;
    rating: number;
    comment: string | null;
  }) => Promise<void>;
  /** From route container (mutation). */
  isSubmitting?: boolean;
}

export function CsatEntryDialog({
  open,
  onOpenChange,
  issueId,
  issueTitle,
  onSuccess,
  onSubmit,
  isSubmitting,
}: CsatEntryDialogProps) {
  // Form state
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  // Reset form when dialog opens (event handler pattern - no useEffect)
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset form state when opening
      setRating(0);
      setComment('');
    }
    onOpenChange(newOpen);
  };

  // Handle submit
  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating.');
      return;
    }

    try {
      await onSubmit({
        issueId,
        rating,
        comment: comment.trim() || null,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit feedback');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5" />
            Enter Customer Feedback
          </DialogTitle>
          <DialogDescription>
            {issueTitle
              ? `Record customer satisfaction rating for "${issueTitle}".`
              : 'Record customer satisfaction rating for this issue.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Rating */}
          <div className="space-y-3">
            <Label>Rating *</Label>
            <div className="flex flex-col items-center space-y-2">
              <StarRating value={rating} onChange={setRating} size="lg" showLabel />
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Customer Comment (Optional)</Label>
            <Textarea
              id="comment"
              placeholder="Enter any feedback the customer provided..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={2000}
            />
            <p className="text-muted-foreground text-right text-xs">{comment.length}/2000</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || rating === 0}>
            {isSubmitting ? 'Saving...' : 'Save Feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
