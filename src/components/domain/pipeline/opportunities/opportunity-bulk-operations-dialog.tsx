/* eslint-disable react-refresh/only-export-components -- Dialog exports component + constants */
'use client';

/**
 * Opportunity Bulk Operations Dialog
 *
 * Dialog for bulk updating opportunity stages.
 * Follows the same pattern as OrderBulkOperationsDialog.
 *
 * @see src/components/domain/orders/order-bulk-operations-dialog.tsx
 */

import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRightLeft } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { FormatAmount } from '@/components/shared/format';
import { toastError } from '@/hooks';
import type { OpportunityStage } from '@/lib/schemas/pipeline';
import { isValidOpportunityStage } from '@/lib/schemas/pipeline';
import { PIPELINE_STAGE_OPTIONS } from '../pipeline-filter-config';

// ============================================================================
// TYPES
// ============================================================================

export interface OpportunityBulkOperation {
  id: string;
  title: string;
  customerId?: string | null;
  customerName?: string | null;
  value: number;
  currentStage: OpportunityStage;
}

export interface BulkOperationConfig {
  type: 'stage_update';
  title: string;
  description: string;
  confirmText: string;
  icon: typeof ArrowRightLeft;
  variant: 'default' | 'secondary' | 'destructive';
}

export interface OpportunityBulkOperationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operation: BulkOperationConfig | null;
  opportunities: OpportunityBulkOperation[];
  onConfirm: (stage: OpportunityStage) => Promise<void>;
  isLoading?: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export const OPERATION_CONFIG: BulkOperationConfig = {
  type: 'stage_update',
  title: 'Bulk Change Stage',
  description: 'Update the stage of selected opportunities.',
  confirmText: 'Update Stage',
  icon: ArrowRightLeft,
  variant: 'default',
};

const STAGE_OPTIONS = PIPELINE_STAGE_OPTIONS.filter(
  (option) => option.value !== 'won' && option.value !== 'lost'
);

// ============================================================================
// COMPONENT
// ============================================================================

export function OpportunityBulkOperationsDialog({
  open,
  onOpenChange,
  operation,
  opportunities,
  onConfirm,
  isLoading = false,
}: OpportunityBulkOperationsDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [selectedStage, setSelectedStage] = useState<OpportunityStage | ''>('');
  const [stageError, setStageError] = useState<string | null>(null);
  const config = operation || OPERATION_CONFIG;

  useEffect(() => {
    if (open) {
      setSelectedStage('');
      setStageError(null);
    }
  }, [open]);

  const totalValue = opportunities.reduce((sum, opp) => sum + opp.value, 0);

  const handleConfirm = async () => {
    if (!selectedStage) {
      setStageError('Select a stage to continue.');
      return;
    }

    setIsConfirming(true);
    try {
      if (!isValidOpportunityStage(selectedStage)) {
        throw new Error('Invalid opportunity stage');
      }
      await onConfirm(selectedStage);
      onOpenChange(false);
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Failed to complete bulk operation');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
              <config.icon className="text-primary h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{config.title}</DialogTitle>
              <DialogDescription>{config.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {opportunities.length} opportunity{opportunities.length !== 1 ? 'ies' : ''} selected
                </p>
                <p className="text-muted-foreground text-xs">
                  Total value: <FormatAmount amount={totalValue} />
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                Stage Update
              </div>
            </div>
          </div>

          {/* Warning for large operations */}
          {opportunities.length > 10 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You&apos;re about to perform a bulk operation on {opportunities.length} opportunities. This action
                cannot be easily undone. Please review the opportunity list below.
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Stage Selection */}
          <div className="space-y-2">
            <Label>New Stage</Label>
            <Select
              value={selectedStage}
              onValueChange={(value) => {
                if (value && ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'].includes(value)) {
                  if (isValidOpportunityStage(value)) {
                    setSelectedStage(value);
                  }
                  setStageError(null);
                } else {
                  setStageError('Invalid stage selected');
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select stage..." />
              </SelectTrigger>
              <SelectContent>
                {STAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {stageError && <p className="text-sm text-destructive">{stageError}</p>}
          </div>

          {/* Opportunities List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Selected Opportunities</h4>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {opportunities.map((opportunity) => (
                <div
                  key={opportunity.id}
                  className="flex items-center justify-between rounded border p-3 text-sm"
                >
                  <div className="flex-1">
                    <div className="font-medium">{opportunity.title}</div>
                    <div className="text-muted-foreground">
                      {opportunity.customerId && opportunity.customerName ? (
                        <Link
                          to="/customers/$customerId"
                          params={{ customerId: opportunity.customerId }}
                          search={{}}
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {opportunity.customerName}
                        </Link>
                      ) : (
                        opportunity.customerName || 'No customer'
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      <FormatAmount amount={opportunity.value} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Current: {opportunity.currentStage}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isConfirming}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isConfirming || isLoading || !selectedStage}
            variant={config.variant}
            className="gap-2"
          >
            {isConfirming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <config.icon className="h-4 w-4" />
                {config.confirmText}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
