/**
 * Issue Status Change Dialog
 *
 * Dialog prompting for a note when changing issue status via drag-drop.
 *
 * @see src/components/domain/support/issue-kanban-board.tsx
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-008
 */

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { IssueStatus } from '@/lib/schemas/support';

// ============================================================================
// TYPES
// ============================================================================

interface StatusConfig {
  label: string;
  color: string;
}

// ============================================================================
// STATUS CONFIG
// ============================================================================

const statusConfig: Record<IssueStatus, StatusConfig> = {
  open: { label: 'Open', color: 'bg-blue-500' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-500' },
  pending: { label: 'Pending', color: 'bg-orange-500' },
  on_hold: { label: 'On Hold', color: 'bg-gray-500' },
  escalated: { label: 'Escalated', color: 'bg-red-500' },
  resolved: { label: 'Resolved', color: 'bg-green-500' },
  closed: { label: 'Closed', color: 'bg-slate-500' },
};

// ============================================================================
// COMPONENT
// ============================================================================

import type { StatusChangeResult } from '@/lib/schemas/support/issues';

export type { StatusChangeResult };

interface IssueStatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issueTitle: string;
  fromStatus: IssueStatus;
  toStatus: IssueStatus;
  onConfirm: (result: StatusChangeResult) => void;
}

export function IssueStatusChangeDialog({
  open,
  onOpenChange,
  issueTitle,
  fromStatus,
  toStatus,
  onConfirm,
}: IssueStatusChangeDialogProps) {
  const [note, setNote] = useState('');
  const [skipPrompt, setSkipPrompt] = useState(false);

  const fromConfig = statusConfig[fromStatus];
  const toConfig = statusConfig[toStatus];

  const handleConfirm = () => {
    onConfirm({
      confirmed: true,
      note: note.trim(),
      skipPromptForSession: skipPrompt,
    });
    setNote('');
    setSkipPrompt(false);
  };

  const handleCancel = () => {
    onConfirm({
      confirmed: false,
      note: '',
      skipPromptForSession: false,
    });
    setNote('');
    setSkipPrompt(false);
  };

  // Require note for certain transitions
  const requiresNote = toStatus === 'on_hold' || toStatus === 'resolved' || toStatus === 'closed';

  const canSubmit = !requiresNote || note.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Issue Status</DialogTitle>
          <DialogDescription className="pt-2">
            <span className="line-clamp-1">{issueTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status Change Indicator */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-2">
              <div className={cn('h-3 w-3 rounded-full', fromConfig.color)} />
              <span className="text-sm font-medium">{fromConfig.label}</span>
            </div>
            <ArrowRight className="text-muted-foreground h-4 w-4" />
            <div className="flex items-center gap-2">
              <div className={cn('h-3 w-3 rounded-full', toConfig.color)} />
              <span className="text-sm font-medium">{toConfig.label}</span>
            </div>
          </div>

          {/* Note Input */}
          <div className="space-y-2">
            <Label htmlFor="status-note">
              {requiresNote ? 'Note (required)' : 'Note (optional)'}
            </Label>
            <Textarea
              id="status-note"
              placeholder={
                toStatus === 'on_hold'
                  ? 'Why is this issue on hold?'
                  : toStatus === 'resolved' || toStatus === 'closed'
                    ? 'Describe the resolution...'
                    : 'Add a note about this status change...'
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="resize-none"
            />
            {requiresNote && !note.trim() && (
              <p className="text-destructive text-xs">
                A note is required when changing to {toConfig.label.toLowerCase()}.
              </p>
            )}
          </div>

          {/* Skip Prompt Option */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="skip-prompt"
              checked={skipPrompt}
              onCheckedChange={(checked) => setSkipPrompt(checked === true)}
            />
            <Label htmlFor="skip-prompt" className="text-muted-foreground text-sm">
              Don&apos;t show this dialog for the rest of this session
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canSubmit}>
            Confirm Change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
