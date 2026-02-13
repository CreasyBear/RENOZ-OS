/**
 * Extend Warranty Dialog Component
 *
 * Dialog for extending a warranty's coverage period.
 * Supports different extension types: paid, promotional, loyalty, goodwill.
 *
 * Features:
 * - Extension type selection
 * - Month input with quick select buttons
 * - Price field (required for paid extensions)
 * - Notes/reason field
 * - Live preview of current expiry -> new expiry
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json - DOM-WAR-007c
 * @see _Initiation/_prd/2-domains/warranty/wireframes/WAR-007c.wireframe.md
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarPlus, DollarSign, ArrowRight } from 'lucide-react';
import {
  calculateNewExpiryDate,
  formatDateAustralian,
  getDaysDifference,
  parseDate,
} from '@/lib/warranty/date-utils';
import {
  isWarrantyExtensionTypeValue,
  type WarrantyExtensionTypeValue,
} from '@/lib/schemas/warranty';

// ============================================================================
// TYPES
// ============================================================================

export interface ExtendWarrantyDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the open state changes */
  onOpenChange: (open: boolean) => void;
  /** The warranty to extend */
  warranty: {
    id: string;
    warrantyNumber: string;
    productName?: string;
    customerName?: string;
    expiryDate: Date | string;
    status?: string;
  };
  /** Callback after successful extension */
  onSuccess?: () => void;
  /** From route container (mutation). */
  onSubmit: (payload: {
    warrantyId: string;
    extensionType: WarrantyExtensionTypeValue;
    extensionMonths: number;
    price: number | null;
    notes: string | null;
  }) => Promise<void>;
  /** From route container (mutation). */
  isSubmitting?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const EXTENSION_TYPES: { value: WarrantyExtensionTypeValue; label: string; description: string }[] =
  [
    {
      value: 'paid_extension',
      label: 'Paid Extension',
      description: 'Customer pays for extended coverage',
    },
    {
      value: 'promotional',
      label: 'Promotional',
      description: 'Marketing or promotional offer',
    },
    {
      value: 'loyalty_reward',
      label: 'Loyalty Reward',
      description: 'Reward for customer loyalty',
    },
    {
      value: 'goodwill',
      label: 'Goodwill',
      description: 'Gesture of goodwill (e.g., after claim)',
    },
  ];

const QUICK_SELECT_MONTHS = [3, 6, 12, 24];

// ============================================================================
// COMPONENT
// ============================================================================

export function ExtendWarrantyDialog({
  open,
  onOpenChange,
  warranty,
  onSuccess,
  onSubmit,
  isSubmitting,
}: ExtendWarrantyDialogProps) {
  // Form state
  const [extensionType, setExtensionType] =
    React.useState<WarrantyExtensionTypeValue>('promotional');
  const [extensionMonths, setExtensionMonths] = React.useState(12);
  const [price, setPrice] = React.useState<string>('');
  const [notes, setNotes] = React.useState('');

  // Derived values
  const currentExpiryDate = React.useMemo(() => {
    const parsed = parseDate(warranty.expiryDate);
    return parsed ?? new Date();
  }, [warranty.expiryDate]);

  const newExpiryDate = React.useMemo(
    () => calculateNewExpiryDate(currentExpiryDate, extensionMonths),
    [currentExpiryDate, extensionMonths]
  );

  const daysRemaining = React.useMemo(
    () => getDaysDifference(new Date(), currentExpiryDate),
    [currentExpiryDate]
  );

  // Check if warranty is expired and within 90-day extension window
  const isExpired = warranty.status === 'expired';
  const daysSinceExpiry = React.useMemo(() => {
    if (!isExpired) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(currentExpiryDate);
    expiry.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - expiry.getTime()) / (1000 * 60 * 60 * 24));
  }, [isExpired, currentExpiryDate]);
  
  const canExtendExpired = isExpired && daysSinceExpiry !== null && daysSinceExpiry <= 90;
  const daysLeftToExtend = canExtendExpired ? 90 - daysSinceExpiry : null;

  const additionalDays = React.useMemo(
    () => getDaysDifference(currentExpiryDate, newExpiryDate),
    [currentExpiryDate, newExpiryDate]
  );

  const isPaidExtension = extensionType === 'paid_extension';
  const priceValue = price ? parseFloat(price) : null;
  const isValid = extensionMonths > 0 && (!isPaidExtension || (priceValue && priceValue > 0));

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setExtensionType('promotional');
      setExtensionMonths(12);
      setPrice('');
      setNotes('');
    }
  }, [open]);

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) return;

    try {
      await onSubmit({
        warrantyId: warranty.id,
        extensionType,
        extensionMonths,
        price: isPaidExtension && priceValue ? priceValue : null,
        notes: notes.trim() || null,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch {
      // Error is handled by mutation
    }
  };

  // Handle month adjustment
  const handleMonthChange = (delta: number) => {
    setExtensionMonths((prev) => Math.max(1, Math.min(120, prev + delta)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="size-5" />
            Extend Warranty
          </DialogTitle>
          <DialogDescription>
            Extend the coverage period for {warranty.warrantyNumber}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Warranty Info Card */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="grid gap-1">
                <p className="text-sm font-medium">{warranty.warrantyNumber}</p>
                {warranty.productName && (
                  <p className="text-muted-foreground text-sm">{warranty.productName}</p>
                )}
                {warranty.customerName && (
                  <p className="text-muted-foreground text-sm">{warranty.customerName}</p>
                )}
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Current Expiry:</span>
                    <span className="font-medium">{formatDateAustralian(currentExpiryDate)}</span>
                    {!isExpired && (
                      <Badge variant="outline" className="ml-auto">
                        {daysRemaining} days remaining
                      </Badge>
                    )}
                    {isExpired && (
                      <Badge variant="destructive" className="ml-auto">
                        Expired {daysSinceExpiry} days ago
                      </Badge>
                    )}
                  </div>
                  {canExtendExpired && daysLeftToExtend !== null && (
                    <div className="flex items-center gap-2 rounded-md bg-muted/50 p-2 text-xs">
                      <span className="text-muted-foreground">
                        ⚠️ This warranty expired but can still be extended within the 90-day grace period.
                      </span>
                      <Badge variant="outline" className="ml-auto">
                        {daysLeftToExtend} days left to extend
                      </Badge>
                    </div>
                  )}
                  {isExpired && daysSinceExpiry !== null && daysSinceExpiry > 90 && (
                    <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                      ⚠️ This warranty expired more than 90 days ago and cannot be extended.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Extension Type */}
          <div className="space-y-2">
            <Label htmlFor="extensionType">Extension Type</Label>
            <Select
              value={extensionType}
              onValueChange={(value) =>
                setExtensionType(
                  isWarrantyExtensionTypeValue(value) ? value : extensionType
                )
              }
            >
              <SelectTrigger id="extensionType" className="w-full">
                <SelectValue placeholder="Select extension type" />
              </SelectTrigger>
              <SelectContent>
                {EXTENSION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col items-start">
                      <span>{type.label}</span>
                      <span className="text-muted-foreground text-xs">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Extension Months */}
          <div className="space-y-2">
            <Label htmlFor="extensionMonths">Extension Period</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleMonthChange(-1)}
                disabled={extensionMonths <= 1}
                aria-label="Decrease extension period"
              >
                -
              </Button>
              <Input
                id="extensionMonths"
                type="number"
                min={1}
                max={120}
                value={extensionMonths}
                onChange={(e) =>
                  setExtensionMonths(Math.max(1, Math.min(120, parseInt(e.target.value) || 1)))
                }
                className="w-24 text-center"
                aria-label="Extension months"
              />
              <span className="text-muted-foreground text-sm">months</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleMonthChange(1)}
                disabled={extensionMonths >= 120}
                aria-label="Increase extension period"
              >
                +
              </Button>
            </div>
            {/* Quick Select Buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              {QUICK_SELECT_MONTHS.map((months) => (
                <Button
                  key={months}
                  type="button"
                  variant={extensionMonths === months ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExtensionMonths(months)}
                  aria-pressed={extensionMonths === months}
                >
                  {months} mo
                </Button>
              ))}
            </div>
          </div>

          {/* New Expiry Preview */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Current Expiry</p>
                  <p className="text-sm font-medium">{formatDateAustralian(currentExpiryDate)}</p>
                </div>
                <ArrowRight className="text-muted-foreground size-4" />
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">New Expiry</p>
                  <p className="text-primary text-sm font-bold">
                    {formatDateAustralian(newExpiryDate)}
                  </p>
                </div>
              </div>
              <p
                className="text-muted-foreground mt-2 text-center text-xs"
                role="status"
                aria-live="polite"
              >
                +{additionalDays} days from current expiry
              </p>
            </CardContent>
          </Card>

          {/* Price (for paid extensions) */}
          {isPaidExtension && (
            <div className="space-y-2">
              <Label htmlFor="price" className="flex items-center gap-1">
                <DollarSign className="size-4" />
                Price (AUD)
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="price"
                type="number"
                min={0}
                step={0.01}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                required={isPaidExtension}
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes / Reason</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter reason for extension..."
              maxLength={1000}
              rows={3}
            />
            <p className="text-muted-foreground text-right text-xs">{notes.length}/1000</p>
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
                  Extending...
                </>
              ) : (
                'Extend Warranty'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
