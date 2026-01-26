/**
 * AI Approval Modal Component
 *
 * Dialog for reviewing and approving/rejecting AI-drafted actions.
 * Implements the human-in-the-loop pattern for AI operations.
 *
 * ARCHITECTURE: Presenter Component - Pure UI, receives all data via props.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json (AI-INFRA-007)
 */

import { memo, useState, useCallback } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  CheckCircle,
  XCircle,
  Clock,
  Bot,
  FileText,
  AlertTriangle,
} from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import type { AIApproval } from '@/hooks/ai';

// ============================================================================
// TYPES
// ============================================================================

export interface ApprovalModalProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** The approval to display */
  approval: AIApproval | null;
  /** Callback when user approves */
  onApprove: (approvalId: string) => void;
  /** Callback when user rejects */
  onReject: (approvalId: string, reason?: string) => void;
  /** Whether an action is in progress */
  isSubmitting?: boolean;
  /** Optional className */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ACTION_LABELS: Record<string, string> = {
  createCustomer: 'Create Customer',
  updateCustomer: 'Update Customer',
  createOrder: 'Create Order',
  updateOrder: 'Update Order',
  sendEmail: 'Send Email',
  createQuote: 'Create Quote',
  scheduleJob: 'Schedule Job',
  // Add more action types as needed
};

const AGENT_LABELS: Record<string, { label: string; color: string }> = {
  customer: { label: 'Customer Agent', color: 'bg-blue-100 text-blue-800' },
  order: { label: 'Order Agent', color: 'bg-green-100 text-green-800' },
  analytics: { label: 'Analytics Agent', color: 'bg-purple-100 text-purple-800' },
  quote: { label: 'Quote Agent', color: 'bg-amber-100 text-amber-800' },
  default: { label: 'AI Agent', color: 'bg-gray-100 text-gray-800' },
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get human-readable action label
 */
function getActionLabel(action: string): string {
  return ACTION_LABELS[action] || action.replace(/([A-Z])/g, ' $1').trim();
}

/**
 * Get agent display config
 */
function getAgentConfig(agent: string) {
  return AGENT_LABELS[agent] || AGENT_LABELS.default;
}

/**
 * Check if approval is expiring soon (within 1 hour)
 */
function isExpiringSoon(expiresAt: string): boolean {
  const expiryTime = new Date(expiresAt).getTime();
  const oneHourFromNow = Date.now() + 60 * 60 * 1000;
  return expiryTime < oneHourFromNow;
}

/**
 * Format action data for display
 */
function formatActionData(data: Record<string, unknown>): Array<{ key: string; value: string }> {
  const entries: Array<{ key: string; value: string }> = [];

  for (const [key, value] of Object.entries(data)) {
    // Skip internal fields
    if (key.startsWith('_')) continue;

    // Format the key
    const formattedKey = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim()
      .replace(/^\w/, (c) => c.toUpperCase());

    // Format the value
    let formattedValue: string;
    if (value === null || value === undefined) {
      formattedValue = '-';
    } else if (typeof value === 'object') {
      formattedValue = JSON.stringify(value, null, 2);
    } else {
      formattedValue = String(value);
    }

    entries.push({ key: formattedKey, value: formattedValue });
  }

  return entries;
}

// ============================================================================
// LOADING STATE
// ============================================================================

function ApprovalModalSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Modal for reviewing and approving/rejecting AI-drafted actions.
 *
 * Features:
 * - Displays action details and data preview
 * - Shows agent and expiry information
 * - Optional rejection reason input
 * - Double-click prevention during submission
 */
export const ApprovalModal = memo(function ApprovalModal({
  open,
  onOpenChange,
  approval,
  onApprove,
  onReject,
  isSubmitting = false,
  className,
}: ApprovalModalProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Reset state when dialog closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setRejectionReason('');
        setShowRejectForm(false);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  // Handle approve action
  const handleApprove = useCallback(() => {
    if (!approval || isSubmitting) return;
    onApprove(approval.id);
  }, [approval, isSubmitting, onApprove]);

  // Handle reject action
  const handleReject = useCallback(() => {
    if (!approval || isSubmitting) return;

    if (!showRejectForm) {
      setShowRejectForm(true);
      return;
    }

    onReject(approval.id, rejectionReason || undefined);
  }, [approval, isSubmitting, onReject, rejectionReason, showRejectForm]);

  // Cancel rejection
  const handleCancelReject = useCallback(() => {
    setShowRejectForm(false);
    setRejectionReason('');
  }, []);

  if (!approval) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className={className}>
          <ApprovalModalSkeleton />
        </DialogContent>
      </Dialog>
    );
  }

  const agentConfig = getAgentConfig(approval.agent);
  const actionLabel = getActionLabel(approval.action);
  const actionEntries = formatActionData(approval.actionData);
  const expiringSoon = isExpiringSoon(approval.expiresAt);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn('max-w-2xl', className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" aria-hidden="true" />
            Review AI Action
          </DialogTitle>
          <DialogDescription>
            Review the proposed action and approve or reject it
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Action Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{actionLabel}</h3>
                    <Badge variant="secondary" className={agentConfig.color}>
                      {agentConfig.label}
                    </Badge>
                  </div>
                </div>

                <div className="text-right text-sm">
                  <p className="text-muted-foreground">
                    {formatDistanceToNow(new Date(approval.createdAt), { addSuffix: true })}
                  </p>
                  <div
                    className={cn(
                      'flex items-center gap-1 mt-1',
                      expiringSoon ? 'text-amber-600' : 'text-muted-foreground'
                    )}
                  >
                    <Clock className="h-3 w-3" />
                    <span className="text-xs">
                      Expires {format(new Date(approval.expiresAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                </div>
              </div>

              {expiringSoon && (
                <div className="mt-3 flex items-center gap-2 rounded-md bg-amber-50 p-2 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span>This approval expires soon. Please review promptly.</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Action Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {actionEntries.map(({ key, value }) => (
                  <div key={key} className="space-y-1">
                    <dt className="text-muted-foreground">{key}</dt>
                    <dd className="font-medium break-words">
                      {value.includes('\n') ? (
                        <pre className="whitespace-pre-wrap text-xs bg-muted p-2 rounded">
                          {value}
                        </pre>
                      ) : (
                        value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {/* Rejection Reason Form */}
          {showRejectForm && (
            <Card className="border-destructive/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-destructive">
                  Rejection Reason
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="rejection-reason" className="sr-only">
                    Reason for rejection
                  </Label>
                  <Textarea
                    id="rejection-reason"
                    placeholder="Optionally explain why you're rejecting this action..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Separator />

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <div className="flex gap-2">
            {showRejectForm ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancelReject}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={isSubmitting}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Confirm Rejection
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleReject}
                  disabled={isSubmitting}
                  className="text-destructive hover:text-destructive"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
