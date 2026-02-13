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
import { logger } from '@/lib/logger';

/**
 * Props for uncontrolled mode (with trigger button)
 */
interface UncontrolledEscalationDialogProps {
  /** Issue ID - passed to callbacks for context */
  issueId: string;
  isEscalated: boolean;
  onEscalate: (reason: string, escalateToUserId?: string) => Promise<void>;
  onDeEscalate: (reason: string, assignToUserId?: string) => Promise<void>;
  trigger?: React.ReactNode;
  className?: string;
  open?: never;
  onOpenChange?: never;
  isPending?: never;
}

/**
 * Props for controlled mode (externally controlled open state)
 */
interface ControlledEscalationDialogProps {
  /** Controlled open state */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Simplified escalation callback */
  onEscalate: (reason: string) => void | Promise<void>;
  /** Whether the mutation is pending */
  isPending?: boolean;
  issueId?: never;
  isEscalated?: never;
  onDeEscalate?: never;
  trigger?: never;
  className?: string;
}

type EscalationDialogProps = UncontrolledEscalationDialogProps | ControlledEscalationDialogProps;

function isUncontrolled(
  props: EscalationDialogProps
): props is UncontrolledEscalationDialogProps {
  return !('open' in props && props.open !== undefined);
}

export function EscalationDialog(props: EscalationDialogProps) {
  // Determine if we're in controlled mode
  const isControlled = !isUncontrolled(props);

  // Uncontrolled state
  const [internalOpen, setInternalOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Determine actual open state and handler
  const open = isControlled ? props.open : internalOpen;
  const setOpen = isControlled ? props.onOpenChange : setInternalOpen;
  const isPending = isControlled ? props.isPending ?? false : isLoading;

  // Get mode-specific values (narrowed by type guard)
  const isEscalated = isControlled ? false : props.isEscalated;

  const handleSubmit = async () => {
    if (!reason.trim()) return;

    if (isControlled) {
      // Controlled mode - just call onEscalate and let parent handle state
      try {
        await props.onEscalate(reason);
        setReason('');
      } catch (error) {
        logger.error('Escalation failed', error);
        toast.error(error instanceof Error ? error.message : 'Failed to escalate');
      }
    } else {
      // Uncontrolled mode - manage loading state internally (props narrowed by isUncontrolled)
      setIsLoading(true);
      try {
        if (isEscalated) {
          await props.onDeEscalate(reason);
        } else {
          await props.onEscalate(reason);
        }
        setOpen(false);
        setReason('');
      } catch (error) {
        logger.error('Escalation failed', error);
        toast.error(error instanceof Error ? error.message : 'Failed to update escalation status');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const title = isEscalated ? 'De-escalate Issue' : 'Escalate Issue';
  const description = isEscalated
    ? 'Remove escalation status and return to normal workflow.'
    : 'Mark this issue as escalated for priority handling.';
  const buttonLabel = isEscalated ? 'De-escalate' : 'Escalate';
  const Icon = isEscalated ? ArrowDown : AlertTriangle;

  // Get trigger and className for uncontrolled mode
  const trigger = isUncontrolled(props) ? props.trigger : undefined;
  const className = props.className;

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
            disabled={!reason.trim() || isPending}
          >
            {isPending ? 'Processing...' : buttonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
