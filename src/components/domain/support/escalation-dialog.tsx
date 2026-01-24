/**
 * Escalation Dialog Component
 *
 * Dialog for escalating or de-escalating issues with reason input.
 *
 * @see src/server/functions/escalation.ts
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks';

interface EscalationDialogProps {
  /** Issue ID - passed to callbacks for context */
  issueId: string;
  isEscalated: boolean;
  onEscalate: (reason: string, escalateToUserId?: string) => Promise<void>;
  onDeEscalate: (reason: string, assignToUserId?: string) => Promise<void>;
  trigger?: React.ReactNode;
  className?: string;
}

export function EscalationDialog({
  issueId: _issueId, // Available for future use in callbacks
  isEscalated,
  onEscalate,
  onDeEscalate,
  trigger,
  className,
}: EscalationDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;

    setIsLoading(true);
    try {
      if (isEscalated) {
        await onDeEscalate(reason);
      } else {
        await onEscalate(reason);
      }
      setOpen(false);
      setReason('');
    } catch (error) {
      console.error('Escalation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update escalation status');
    } finally {
      setIsLoading(false);
    }
  };

  const title = isEscalated ? 'De-escalate Issue' : 'Escalate Issue';
  const description = isEscalated
    ? 'Remove escalation status and return to normal workflow.'
    : 'Mark this issue as escalated for priority handling.';
  const buttonLabel = isEscalated ? 'De-escalate' : 'Escalate';
  const Icon = isEscalated ? ArrowDown : AlertTriangle;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant={isEscalated ? 'outline' : 'destructive'} size="sm" className={className}>
            <Icon className="mr-2 h-4 w-4" />
            {buttonLabel}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon
              className={cn('h-5 w-5', isEscalated ? 'text-muted-foreground' : 'text-destructive')}
            />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reason">
              {isEscalated ? 'De-escalation Reason' : 'Escalation Reason'}
            </Label>
            <Textarea
              id="reason"
              placeholder={
                isEscalated
                  ? 'Why is this issue being de-escalated?'
                  : 'Why does this issue need to be escalated?'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant={isEscalated ? 'default' : 'destructive'}
            onClick={handleSubmit}
            disabled={!reason.trim() || isLoading}
          >
            {isLoading ? 'Processing...' : buttonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
