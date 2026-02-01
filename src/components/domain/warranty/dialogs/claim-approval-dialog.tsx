/**
 * Claim Approval Dialog Component
 *
 * Dialog for approving or denying warranty claims.
 * Shows claim summary, SLA status, and provides approve/deny actions.
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json - DOM-WAR-006c
 * @see _Initiation/_prd/2-domains/warranty/wireframes/warranty-claims.wireframe.md
 */

'use client';

import * as React from 'react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/shared';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle2, XCircle, AlertCircle, Shield, User, Package, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WarrantyClaimTypeValue } from '@/lib/schemas/warranty/claims';
import {
  claimTypeConfig,
  claimStatusConfig,
  formatClaimCost,
} from '@/lib/warranty/claims-utils';
import { SlaCountdownBadge } from '../widgets/sla-countdown-badge';

// ============================================================================
// TYPES
// ============================================================================

export interface ClaimApprovalDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the open state changes */
  onOpenChange: (open: boolean) => void;
  /** The claim to approve/deny */
  claim: {
    id: string;
    claimNumber: string;
    claimType: string;
    status: string;
    description: string;
    cost?: number | null;
    submittedAt: string | Date;
    cycleCountAtClaim?: number | null;
    warranty: {
      warrantyNumber: string;
      productSerial?: string | null;
    };
    customer: {
      name: string;
    };
    product: {
      name: string;
    };
    slaTracking?: {
      responseDueAt?: Date | string | null;
      resolutionDueAt?: Date | string | null;
      respondedAt?: Date | string | null;
      resolvedAt?: Date | string | null;
    } | null;
  };
  /** Callback after successful action */
  onSuccess?: () => void;
  /** From route container (approve mutation). */
  onApprove: (payload: { claimId: string; notes?: string }) => Promise<void>;
  /** From route container (deny mutation). */
  onDeny: (payload: { claimId: string; denialReason: string; notes?: string }) => Promise<void>;
  /** From route container (mutation). */
  isSubmitting?: boolean;
}

type Decision = 'approve' | 'deny' | 'request_info';

// ============================================================================
// COMPONENT
// ============================================================================

export function ClaimApprovalDialog({
  open,
  onOpenChange,
  claim,
  onSuccess,
  onApprove,
  onDeny,
  isSubmitting,
}: ClaimApprovalDialogProps) {
  // State
  const [decision, setDecision] = React.useState<Decision>('approve');
  const [notes, setNotes] = React.useState('');
  const [denialReason, setDenialReason] = React.useState('');

  const isLoading = !!isSubmitting;

  // Reset form when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setDecision('approve');
      setNotes('');
      setDenialReason('');
    }
    onOpenChange(newOpen);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (decision === 'deny' && !denialReason.trim()) {
      return; // Validation will show error
    }

    try {
      if (decision === 'approve') {
        await onApprove({
          claimId: claim.id,
          notes: notes.trim() || undefined,
        });
      } else if (decision === 'deny') {
        await onDeny({
          claimId: claim.id,
          denialReason: denialReason.trim(),
          notes: notes.trim() || undefined,
        });
      }
      // For request_info, we would update status to under_review with notes
      // This would need a separate mutation

      onOpenChange(false);
      onSuccess?.();
    } catch {
      // Error handled by mutation hooks
    }
  };

  const claimTypeCfg = claimTypeConfig[claim.claimType as WarrantyClaimTypeValue];

  // Check if claim can be approved/denied
  const canDecide = claim.status === 'submitted' || claim.status === 'under_review';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            Review Claim {claim.claimNumber}
          </DialogTitle>
          <DialogDescription>Review the claim details and make a decision.</DialogDescription>
        </DialogHeader>

        {!canDecide ? (
          <div className="py-4 text-center">
            <AlertCircle className="text-muted-foreground mx-auto mb-4 size-12" />
            <p className="text-muted-foreground">
              This claim has status{' '}
              <StatusBadge status={claim.status} statusConfig={claimStatusConfig} />{' '}
              and cannot be approved or denied.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Claim Summary Card */}
            <Card className="bg-muted/50">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="text-muted-foreground size-4" />
                    <span className="font-medium">{claim.customer.name}</span>
                  </div>
                  <StatusBadge status={claim.status} statusConfig={claimStatusConfig} />
                </div>

                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Package className="size-4" />
                  <span>{claim.product.name}</span>
                  {claim.warranty.productSerial && (
                    <span className="font-mono">({claim.warranty.productSerial})</span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  <Badge variant="outline">{claimTypeCfg?.label ?? claim.claimType}</Badge>
                </div>

                {claim.cost !== null && claim.cost !== undefined && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Estimated Cost:</span>
                    <span className="font-medium">{formatClaimCost(claim.cost)}</span>
                  </div>
                )}

                {claim.cycleCountAtClaim !== null && claim.cycleCountAtClaim !== undefined && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Cycle Count:</span>
                    <span>{claim.cycleCountAtClaim.toLocaleString()} cycles</span>
                  </div>
                )}

                {/* SLA Status */}
                {claim.slaTracking && (
                  <div className="flex items-center gap-2 border-t pt-2">
                    <Clock className="text-muted-foreground size-4" />
                    <SlaCountdownBadge
                      responseDueAt={claim.slaTracking.responseDueAt}
                      resolutionDueAt={claim.slaTracking.resolutionDueAt}
                      respondedAt={claim.slaTracking.respondedAt}
                      resolvedAt={claim.slaTracking.resolvedAt}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                Issue Description
              </Label>
              <p className="bg-muted/50 max-h-24 overflow-y-auto rounded-md p-3 text-sm">
                {claim.description}
              </p>
            </div>

            <Separator />

            {/* Decision */}
            <div className="space-y-3">
              <Label>Decision</Label>
              <RadioGroup
                value={decision}
                onValueChange={(v) => setDecision(v as Decision)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="approve" id="approve" />
                  <Label
                    htmlFor="approve"
                    className={cn(
                      'flex cursor-pointer items-center gap-2 font-normal',
                      decision === 'approve' && 'font-medium text-green-700'
                    )}
                  >
                    <CheckCircle2 className="size-4 text-green-600" />
                    Approve - Proceed to resolution
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="deny" id="deny" />
                  <Label
                    htmlFor="deny"
                    className={cn(
                      'flex cursor-pointer items-center gap-2 font-normal',
                      decision === 'deny' && 'text-destructive font-medium'
                    )}
                  >
                    <XCircle className="text-destructive size-4" />
                    Deny - Reject this claim
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="request_info" id="request_info" disabled />
                  <Label
                    htmlFor="request_info"
                    className="text-muted-foreground flex cursor-not-allowed items-center gap-2 font-normal"
                  >
                    <AlertCircle className="size-4" />
                    Request More Info (coming soon)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Denial Reason (required when denying) */}
            {decision === 'deny' && (
              <div className="space-y-2">
                <Label htmlFor="denialReason">
                  Denial Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="denialReason"
                  value={denialReason}
                  onChange={(e) => setDenialReason(e.target.value)}
                  placeholder="Explain why this claim is being denied..."
                  minLength={10}
                  maxLength={2000}
                  rows={3}
                  required={decision === 'deny'}
                  className={
                    !denialReason.trim() && decision === 'deny' ? 'border-destructive' : ''
                  }
                />
                <p className="text-muted-foreground text-xs">
                  Minimum 10 characters. This reason will be visible to the customer.
                </p>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any internal notes..."
                maxLength={2000}
                rows={2}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || (decision === 'deny' && !denialReason.trim())}
                variant={decision === 'deny' ? 'destructive' : 'default'}
              >
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 size-4" />
                    Processing...
                  </>
                ) : decision === 'approve' ? (
                  <>
                    <CheckCircle2 className="mr-2 size-4" />
                    Approve Claim
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 size-4" />
                    Deny Claim
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
