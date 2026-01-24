/**
 * Warranty Claim Form Dialog Component
 *
 * Dialog for submitting a new warranty claim. Supports different claim types
 * (cell degradation, BMS fault, inverter failure, installation defect).
 *
 * Features:
 * - Claim type selection with descriptions
 * - Description textarea with character count
 * - Cycle count input for battery warranties (auto-populated if available)
 * - Form validation with Zod
 * - Loading state during submission
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json - DOM-WAR-006c
 * @see _Initiation/_prd/2-domains/warranty/wireframes/WAR-006c.wireframe.md
 */

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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, FileWarning, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { WarrantyClaimTypeValue } from '@/lib/schemas/warranty/claims';
import { claimTypeConfig } from '@/lib/warranty/claims-utils';

// ============================================================================
// TYPES
// ============================================================================

export interface WarrantyClaimFormDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the open state changes */
  onOpenChange: (open: boolean) => void;
  /** The warranty to file a claim against */
  warranty: {
    id: string;
    warrantyNumber: string;
    productName?: string;
    customerName?: string;
    status: string;
    policyType?: string;
    currentCycleCount?: number | null;
    cycleLimit?: number | null;
  };
  /** Callback after successful claim submission */
  onSuccess?: () => void;
  /** From route container (mutation). */
  onSubmit: (payload: {
    warrantyId: string;
    claimType: WarrantyClaimTypeValue;
    description: string;
    cycleCountAtClaim?: number;
    notes?: string;
  }) => Promise<void>;
  /** From route container (mutation). */
  isSubmitting?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CLAIM_TYPES: { value: WarrantyClaimTypeValue; label: string; description: string }[] = [
  {
    value: 'cell_degradation',
    label: 'Cell Degradation',
    description: 'Battery cell performance decline below expected levels',
  },
  {
    value: 'bms_fault',
    label: 'BMS Fault',
    description: 'Battery Management System malfunction or errors',
  },
  {
    value: 'inverter_failure',
    label: 'Inverter Failure',
    description: 'Inverter stopped working or producing errors',
  },
  {
    value: 'installation_defect',
    label: 'Installation Defect',
    description: 'Issues related to installation workmanship',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Other warranty-covered issues',
  },
];

const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 5000;

// ============================================================================
// COMPONENT
// ============================================================================

export function WarrantyClaimFormDialog({
  open,
  onOpenChange,
  warranty,
  onSuccess,
  onSubmit,
  isSubmitting,
}: WarrantyClaimFormDialogProps) {
  // Form state
  const [claimType, setClaimType] = React.useState<WarrantyClaimTypeValue | ''>('');
  const [description, setDescription] = React.useState('');
  const [cycleCount, setCycleCount] = React.useState<string>('');
  const [notes, setNotes] = React.useState('');

  // Derived values
  const isBatteryWarranty = warranty.policyType === 'battery_performance';
  const isValidClaimType = claimType !== '';
  const isValidDescription =
    description.length >= MIN_DESCRIPTION_LENGTH && description.length <= MAX_DESCRIPTION_LENGTH;
  const isValid = isValidClaimType && isValidDescription;

  // Check if warranty can have claims filed
  const canFileClaim = warranty.status === 'active' || warranty.status === 'expiring_soon';

  // Handle dialog open/close with form reset
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset form when opening
      setClaimType('');
      setDescription('');
      setCycleCount(warranty.currentCycleCount?.toString() ?? '');
      setNotes('');
    }
    onOpenChange(newOpen);
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid || !claimType) return;

    try {
      await onSubmit({
        warrantyId: warranty.id,
        claimType,
        description: description.trim(),
        cycleCountAtClaim: cycleCount ? parseInt(cycleCount, 10) : undefined,
        notes: notes.trim() || undefined,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch {
      // Error is handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileWarning className="size-5" />
            File Warranty Claim
          </DialogTitle>
          <DialogDescription>Submit a claim for {warranty.warrantyNumber}</DialogDescription>
        </DialogHeader>

        {!canFileClaim ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Cannot file a claim for a warranty with status: {warranty.status}. Only active or
              expiring soon warranties can have claims filed.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Warranty Info Card */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="grid gap-1">
                  <div className="flex items-center gap-2">
                    <Shield className="text-muted-foreground size-4" />
                    <p className="text-sm font-medium">{warranty.warrantyNumber}</p>
                  </div>
                  {warranty.productName && (
                    <p className="text-muted-foreground text-sm">{warranty.productName}</p>
                  )}
                  {warranty.customerName && (
                    <p className="text-muted-foreground text-sm">{warranty.customerName}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline">
                      {warranty.status === 'active' ? 'Active' : 'Expiring Soon'}
                    </Badge>
                    {isBatteryWarranty && warranty.currentCycleCount !== null && (
                      <Badge variant="secondary">
                        {warranty.currentCycleCount?.toLocaleString() ?? 0}
                        {warranty.cycleLimit
                          ? ` / ${warranty.cycleLimit.toLocaleString()}`
                          : ''}{' '}
                        cycles
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Claim Type */}
            <div className="space-y-2">
              <Label htmlFor="claimType">
                Claim Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={claimType}
                onValueChange={(value) => setClaimType(value as WarrantyClaimTypeValue)}
              >
                <SelectTrigger id="claimType" className="w-full">
                  <SelectValue placeholder="Select the type of issue" />
                </SelectTrigger>
                <SelectContent>
                  {CLAIM_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col items-start">
                        <span>{type.label}</span>
                        <span className="text-muted-foreground text-xs">{type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {claimType && (
                <p className="text-muted-foreground text-xs">
                  {claimTypeConfig[claimType].description}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Issue Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue in detail. Include when it started, symptoms, and any relevant information..."
                minLength={MIN_DESCRIPTION_LENGTH}
                maxLength={MAX_DESCRIPTION_LENGTH}
                rows={4}
                className={
                  description.length > 0 && description.length < MIN_DESCRIPTION_LENGTH
                    ? 'border-destructive'
                    : ''
                }
                aria-describedby="description-help"
              />
              <div className="text-muted-foreground flex justify-between text-xs">
                <span id="description-help">
                  {description.length < MIN_DESCRIPTION_LENGTH
                    ? `Minimum ${MIN_DESCRIPTION_LENGTH} characters required`
                    : 'Provide as much detail as possible'}
                </span>
                <span
                  className={
                    description.length > MAX_DESCRIPTION_LENGTH * 0.9 ? 'text-destructive' : ''
                  }
                >
                  {description.length}/{MAX_DESCRIPTION_LENGTH}
                </span>
              </div>
            </div>

            {/* Cycle Count (Battery Only) */}
            {isBatteryWarranty && (
              <div className="space-y-2">
                <Label htmlFor="cycleCount">Cycle Count at Time of Issue</Label>
                <Input
                  id="cycleCount"
                  type="number"
                  min={0}
                  value={cycleCount}
                  onChange={(e) => setCycleCount(e.target.value)}
                  placeholder={
                    warranty.currentCycleCount?.toString() ?? 'Enter current cycle count'
                  }
                  aria-describedby="cycleCount-help"
                />
                <p id="cycleCount-help" className="text-muted-foreground text-xs">
                  Current battery cycle count helps track degradation patterns.
                  {warranty.currentCycleCount !== null && (
                    <> Last recorded: {warranty.currentCycleCount?.toLocaleString() ?? 0} cycles.</>
                  )}
                </p>
              </div>
            )}

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional information..."
                maxLength={2000}
                rows={2}
              />
              <p className="text-muted-foreground text-right text-xs">{notes.length}/2000</p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              >
                Cancel
              </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? (
                  <>
                    <Spinner className="mr-2 size-4" />
                    Submitting...
                  </>
                ) : (
                  'Submit Claim'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
