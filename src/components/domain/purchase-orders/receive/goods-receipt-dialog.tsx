/**
 * Goods Receipt Dialog
 *
 * Multi-step dialog for receiving goods against a purchase order.
 * Steps: Select Items -> Quality Check -> Review -> Confirm
 *
 * @see docs/design-system/WIZARD-STANDARDS.md
 * @see docs/design-system/WORKFLOW-CONTINUITY-STANDARDS.md
 */

import { useState, useCallback, useMemo, useEffect, startTransition } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Package, AlertTriangle, Check, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createPendingDialogInteractionGuards } from '@/components/ui/dialog-pending-guards';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { toastSuccess, toastError } from '@/hooks';
import { useReceiveGoods } from '@/hooks/suppliers';
import type { PurchaseOrderItem } from '@/lib/schemas/purchase-orders';
import { SerialNumberBatchEntry } from '@/components/domain/procurement/receiving/serial-number-batch-entry';

// ============================================================================
// TYPES
// ============================================================================

interface GoodsReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poId: string;
  poNumber: string;
  items: PurchaseOrderItem[];
  /** Called after successful receipt — parent can switch to receipts tab */
  onReceiptComplete?: () => void;
}

interface ReceiptLineItem {
  poItemId: string;
  productName: string;
  productSku: string | null;
  productId: string | null;
  ordered: number;
  pending: number;
  quantityReceived: number;
  quantityRejected: number;
  condition: 'new' | 'refurbished' | 'used' | 'damaged';
  rejectionReason?: string;
  lotNumber: string;
  serialNumbers: string[];
  notes: string;
  requiresSerialNumbers?: boolean; // If product is serialized
}

type Step = 'select' | 'quality' | 'review';

const STEPS: { key: Step; label: string }[] = [
  { key: 'select', label: 'Select Items' },
  { key: 'quality', label: 'Quality Check' },
  { key: 'review', label: 'Review' },
];

const CONDITION_LABELS: Record<string, string> = {
  new: 'New / Good',
  refurbished: 'Refurbished',
  used: 'Used',
  damaged: 'Damaged',
};

const REJECTION_REASONS: Record<string, string> = {
  damaged: 'Damaged',
  wrong_item: 'Wrong Item',
  quality_issue: 'Quality Issue',
  short_shipment: 'Short Shipment',
  other: 'Other',
};

// ============================================================================
// HELPERS
// ============================================================================

function buildInitialLineItems(items: PurchaseOrderItem[]): ReceiptLineItem[] {
  return items
    .filter((item) => item.quantityPending > 0)
    .map((item) => ({
      poItemId: item.id,
      productName: item.productName,
      productSku: item.productSku,
      productId: item.productId,
      ordered: item.quantity,
      pending: item.quantityPending,
      quantityReceived: item.quantityPending,
      quantityRejected: 0,
      condition: 'new' as const,
      lotNumber: '',
      serialNumbers: [],
      notes: '',
      requiresSerialNumbers: false, // Will be determined from product if available
    }));
}

function getStepIndex(step: Step): number {
  return STEPS.findIndex((s) => s.key === step);
}

// ============================================================================
// COMPONENT
// ============================================================================

export function GoodsReceiptDialog({
  open,
  onOpenChange,
  poId,
  poNumber,
  items,
  onReceiptComplete,
}: GoodsReceiptDialogProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('select');
  const [receiptNotes, setReceiptNotes] = useState('');
  const [lineItems, setLineItems] = useState<ReceiptLineItem[]>(() =>
    buildInitialLineItems(items)
  );
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const receiveGoods = useReceiveGoods();
  const currentStepIndex = getStepIndex(step);

  // Re-initialize line items when dialog opens with fresh data (#13 stale state fix)
  useEffect(() => {
    if (open) {
      startTransition(() => {
        setLineItems(buildInitialLineItems(items));
        setStep('select');
        setReceiptNotes('');
        setValidationErrors([]);
      });
    }
  }, [open, items]);

  // Derived
  const totalReceiving = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.quantityReceived, 0),
    [lineItems]
  );
  const totalRejected = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.quantityRejected, 0),
    [lineItems]
  );
  const hasItemsToReceive = totalReceiving > 0;

  // Check if form is dirty (any user changes from initial state)
  const isDirty = useMemo(() => {
    if (receiptNotes.trim()) return true;
    if (step !== 'select') return true;
    return lineItems.some((item) => {
      return (
        item.quantityReceived !== item.pending ||
        item.quantityRejected !== 0 ||
        item.condition !== 'new' ||
        item.lotNumber !== '' ||
        item.notes !== ''
      );
    });
  }, [lineItems, receiptNotes, step]);

  // Handlers
  const updateLineItem = useCallback(
    (index: number, field: keyof ReceiptLineItem, value: string | number | string[]) => {
      setLineItems((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
      setValidationErrors([]);
    },
    []
  );

  const updateSerialNumbers = useCallback(
    (index: number, serialNumbers: string[]) => {
      updateLineItem(index, 'serialNumbers', serialNumbers);
    },
    [updateLineItem]
  );

  // Per-step validation (#5)
  const validateStep = useCallback(
    (currentStep: Step): string[] => {
      const errors: string[] = [];

      if (currentStep === 'select') {
        if (!hasItemsToReceive) {
          errors.push('Select at least one item to receive.');
        }
      }

      if (currentStep === 'quality') {
        const receivingItems = lineItems.filter((item) => item.quantityReceived > 0);
        for (const item of receivingItems) {
          if (item.quantityRejected > 0 && !item.rejectionReason) {
            errors.push(`${item.productName}: Rejection reason is required when rejecting items.`);
          }
          if (item.quantityRejected > item.quantityReceived) {
            errors.push(`${item.productName}: Rejected qty cannot exceed received qty.`);
          }
          // Validate serial numbers if REQUIRED (for serialized products)
          const acceptedQuantity = item.quantityReceived - item.quantityRejected;
          if (item.requiresSerialNumbers && acceptedQuantity > 0) {
            // Serial numbers are REQUIRED for serialized products
            if (item.serialNumbers.length !== acceptedQuantity) {
              errors.push(
                `${item.productName}: REQUIRES ${acceptedQuantity} serial number${acceptedQuantity !== 1 ? 's' : ''} (product is serialized). Found ${item.serialNumbers.length}.`
              );
            }
            // Check for duplicates within this item
            const duplicates = item.serialNumbers.filter(
              (serial, i) => item.serialNumbers.indexOf(serial.trim().toUpperCase()) !== i
            );
            if (duplicates.length > 0) {
              errors.push(`${item.productName}: Contains duplicate serial numbers: ${duplicates.join(', ')}`);
            }
            // Check for empty serial numbers
            const emptySerials = item.serialNumbers.filter((s) => !s || s.trim().length === 0);
            if (emptySerials.length > 0) {
              errors.push(`${item.productName}: ${emptySerials.length} empty serial number${emptySerials.length !== 1 ? 's' : ''} found`);
            }
          }
        }
      }

      return errors;
    },
    [lineItems, hasItemsToReceive]
  );

  const handleNext = useCallback(() => {
    const errors = validateStep(step);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    if (step === 'select') setStep('quality');
    else if (step === 'quality') setStep('review');
  }, [step, validateStep]);

  const handleBack = useCallback(() => {
    setValidationErrors([]);
    if (step === 'quality') setStep('select');
    else if (step === 'review') setStep('quality');
  }, [step]);

  const handleSubmit = useCallback(async () => {
    const itemsToReceive = lineItems.filter((item) => item.quantityReceived > 0);

    if (itemsToReceive.length === 0) {
      toastError('No items selected for receiving');
      return;
    }

    try {
      const result = await receiveGoods.mutateAsync({
        purchaseOrderId: poId,
        notes: receiptNotes || undefined,
        items: itemsToReceive.map((item) => ({
          poItemId: item.poItemId,
          quantityReceived: item.quantityReceived,
          quantityRejected: item.quantityRejected,
          condition: item.condition,
          rejectionReason: item.quantityRejected > 0
            ? (item.rejectionReason as 'damaged' | 'wrong_item' | 'quality_issue' | 'short_shipment' | 'other')
            : undefined,
          lotNumber: item.lotNumber || undefined,
          serialNumbers: item.serialNumbers.length > 0 ? item.serialNumbers : undefined,
          notes: item.notes || undefined,
        })),
      });

      const accepted = totalReceiving - totalRejected;
      const firstReceivedSerial =
        itemsToReceive.flatMap((item) => item.serialNumbers.map((serial) => serial.trim()).filter(Boolean))[0];
      toastSuccess(
        `${result.message} Received ${accepted} item${accepted !== 1 ? 's' : ''} into inventory. PO status: ${result.newPOStatus.replace('_', ' ')}`,
        {
          action: {
            label: firstReceivedSerial ? 'View Serials' : 'View PO',
            onClick: () =>
              firstReceivedSerial
                ? navigate({
                    to: '/inventory/browser',
                    search: { view: 'serialized', serializedSearch: firstReceivedSerial, page: 1 },
                  })
                : navigate({ to: '/purchase-orders/$poId', params: { poId } }),
          },
        }
      );
      onOpenChange(false);
      onReceiptComplete?.();
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Failed to receive goods. Please try again.');
    }
  }, [lineItems, poId, receiptNotes, totalReceiving, totalRejected, receiveGoods, onOpenChange, onReceiptComplete, navigate]);

  // Unsaved changes guard (#6)
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && receiveGoods.isPending) {
        return;
      }
      if (!nextOpen && isDirty) {
        setShowCloseConfirm(true);
        return;
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, isDirty, receiveGoods.isPending]
  );

  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    onOpenChange(false);
  }, [onOpenChange]);

  // Keyboard: Enter to advance (#12)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        // Don't intercept Enter inside textareas
        if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
        e.preventDefault();
        if (step === 'review') {
          handleSubmit();
        } else {
          handleNext();
        }
      }
    },
    [step, handleNext, handleSubmit]
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto"
          onKeyDown={handleKeyDown}
          onEscapeKeyDown={createPendingDialogInteractionGuards(receiveGoods.isPending).onEscapeKeyDown}
          onInteractOutside={createPendingDialogInteractionGuards(receiveGoods.isPending).onInteractOutside}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Receive Goods - {poNumber}
            </DialogTitle>
            <DialogDescription>
              {step === 'select' && 'Enter the quantities received for each item.'}
              {step === 'quality' && 'Record condition and quality details for received items.'}
              {step === 'review' && 'Review and confirm the goods receipt.'}
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator — accessible nav with semantic markup (#3) */}
          <nav aria-label="Goods receipt progress">
            <ol className="flex items-center gap-2 mb-4">
              {STEPS.map((s, i) => {
                const isCompleted = i < currentStepIndex;
                const isCurrent = s.key === step;
                return (
                  <li key={s.key} className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium ${
                          isCurrent
                            ? 'bg-primary text-primary-foreground'
                            : isCompleted
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                              : 'bg-muted text-muted-foreground'
                        }`}
                        aria-current={isCurrent ? 'step' : undefined}
                      >
                        {isCompleted ? (
                          <Check className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span
                        className={`text-xs hidden sm:inline ${
                          isCurrent
                            ? 'font-medium text-foreground'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="w-6 h-px bg-border hidden sm:block" />
                    )}
                  </li>
                );
              })}
            </ol>
            {/* Mobile step counter (#14) */}
            <p className="text-xs text-muted-foreground sm:hidden mb-2">
              Step {currentStepIndex + 1} of {STEPS.length} — {STEPS[currentStepIndex].label}
            </p>
          </nav>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 space-y-1">
              {validationErrors.map((err) => (
                <p key={err} className="text-sm text-destructive flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  {err}
                </p>
              ))}
            </div>
          )}

          {/* Step 1: Select Items */}
          {step === 'select' && (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center w-[80px]">Pending</TableHead>
                    <TableHead className="text-center w-[100px]">Receiving</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item, index) => (
                    <TableRow key={item.poItemId}>
                      <TableCell>
                        <div className="font-medium text-sm">{item.productName}</div>
                        {item.productSku && (
                          <div className="text-xs text-muted-foreground">SKU: {item.productSku}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">{item.pending}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={item.pending}
                          value={item.quantityReceived}
                          onChange={(e) =>
                            updateLineItem(
                              index,
                              'quantityReceived',
                              Math.min(Number(e.target.value) || 0, item.pending)
                            )
                          }
                          className="w-20 text-center mx-auto"
                          aria-label={`Quantity receiving for ${item.productName}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="text-sm text-muted-foreground text-right">
                Total receiving: <strong>{totalReceiving}</strong> items
              </div>
            </div>
          )}

          {/* Step 2: Quality Check */}
          {step === 'quality' && (
            <div className="space-y-4">
              {lineItems
                .filter((item) => item.quantityReceived > 0)
                .map((item) => {
                  const actualIndex = lineItems.findIndex((l) => l.poItemId === item.poItemId);
                  const missingReason = item.quantityRejected > 0 && !item.rejectionReason;
                  return (
                    <div key={item.poItemId} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{item.productName}</div>
                          <div className="text-xs text-muted-foreground">
                            Receiving: {item.quantityReceived} units
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Condition</Label>
                          <Select
                            value={item.condition}
                            onValueChange={(v) =>
                              updateLineItem(actualIndex, 'condition', v)
                            }
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Qty Rejected</Label>
                          <Input
                            type="number"
                            min={0}
                            max={item.quantityReceived}
                            value={item.quantityRejected}
                            onChange={(e) =>
                              updateLineItem(
                                actualIndex,
                                'quantityRejected',
                                Math.min(Number(e.target.value) || 0, item.quantityReceived)
                              )
                            }
                            className="h-9 text-xs"
                            aria-label={`Quantity rejected for ${item.productName}`}
                          />
                        </div>
                      </div>
                      {item.quantityRejected > 0 && (
                        <div>
                          <Label className={`text-xs ${missingReason ? 'text-destructive' : ''}`}>
                            Rejection Reason {missingReason && '*'}
                          </Label>
                          <Select
                            value={item.rejectionReason ?? ''}
                            onValueChange={(v) =>
                              updateLineItem(actualIndex, 'rejectionReason', v)
                            }
                          >
                            <SelectTrigger
                              className={`h-9 text-xs ${missingReason ? 'border-destructive' : ''}`}
                            >
                              <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(REJECTION_REASONS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {missingReason && (
                            <p className="text-xs text-destructive mt-1">Required when rejecting items</p>
                          )}
                        </div>
                      )}
                      <div>
                        <Label className="text-xs">Lot/Batch Number</Label>
                        <Input
                          value={item.lotNumber}
                          onChange={(e) =>
                            updateLineItem(actualIndex, 'lotNumber', e.target.value)
                          }
                          placeholder="Optional"
                          className="h-9 text-xs"
                          aria-label={`Lot number for ${item.productName}`}
                        />
                      </div>

                      {/* Serial Number Batch Entry - REQUIRED for serialized products, optional for others */}
                      {item.requiresSerialNumbers || item.quantityReceived > 1 ? (
                        <div className="border-t pt-3">
                          <Label className="text-xs flex items-center gap-2 mb-2">
                            <Hash className="h-3 w-3" />
                            Serial Numbers
                            {item.requiresSerialNumbers && (
                              <Badge variant="destructive" className="text-[10px]">
                                Required
                              </Badge>
                            )}
                            {!item.requiresSerialNumbers && item.quantityReceived > 1 && (
                              <Badge variant="outline" className="text-[10px]">
                                Optional
                              </Badge>
                            )}
                          </Label>
                          <SerialNumberBatchEntry
                            requiredQuantity={item.quantityReceived - item.quantityRejected}
                            existingSerialNumbers={item.serialNumbers}
                            onSerialNumbersChange={(serials) =>
                              updateSerialNumbers(actualIndex, serials)
                            }
                            validateFormat={(serial) => {
                              // Basic validation - can be enhanced with product-specific rules
                              if (!serial || serial.trim().length === 0) {
                                return { valid: false, error: 'Cannot be empty' };
                              }
                              return { valid: true };
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-3">Receipt Summary</h3>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Received</TableHead>
                      <TableHead className="text-center">Accepted</TableHead>
                      <TableHead className="text-center">Rejected</TableHead>
                      <TableHead className="text-center">Condition</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems
                      .filter((item) => item.quantityReceived > 0)
                      .map((item) => {
                        const accepted = item.quantityReceived - item.quantityRejected;
                        return (
                          <TableRow key={item.poItemId}>
                            <TableCell>
                              <div className="text-sm font-medium">{item.productName}</div>
                              {item.lotNumber && (
                                <div className="text-xs text-muted-foreground">
                                  Lot: {item.lotNumber}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-center tabular-nums">
                              {item.quantityReceived}
                            </TableCell>
                            <TableCell className="text-center tabular-nums text-green-600">
                              {accepted}
                            </TableCell>
                            <TableCell className="text-center tabular-nums">
                              {item.quantityRejected > 0 ? (
                                <span className="text-destructive">{item.quantityRejected}</span>
                              ) : (
                                '---'
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-[10px]">
                                {CONDITION_LABELS[item.condition]}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>

              {/* Inventory impact summary (#18) */}
              <div className="grid grid-cols-3 gap-4 p-3 bg-muted/30 rounded-md text-center">
                <div>
                  <div className="text-xs text-muted-foreground">Total Received</div>
                  <div className="text-lg font-semibold tabular-nums">{totalReceiving}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Added to Inventory</div>
                  <div className="text-lg font-semibold tabular-nums text-green-600">
                    {totalReceiving - totalRejected}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Rejected</div>
                  <div className={`text-lg font-semibold tabular-nums ${totalRejected > 0 ? 'text-destructive' : ''}`}>
                    {totalRejected}
                  </div>
                </div>
              </div>

              {lineItems.some((item) => item.quantityRejected > 0) && (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Rejected items will not be added to inventory.
                </div>
              )}

              <div>
                <Label htmlFor="receiptNotes">Receipt Notes</Label>
                <Textarea
                  id="receiptNotes"
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  placeholder="Optional notes for this receipt"
                  rows={2}
                />
              </div>
            </div>
          )}

          <Separator />

          <DialogFooter className="flex justify-between">
            <div>
              {step !== 'select' && (
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              {step === 'review' ? (
                <Button
                  onClick={handleSubmit}
                  disabled={receiveGoods.isPending || !hasItemsToReceive}
                >
                  {receiveGoods.isPending ? 'Processing...' : 'Confirm Receipt'}
                </Button>
              ) : (
                <Button onClick={handleNext} disabled={!hasItemsToReceive}>
                  Next
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved changes confirmation (#6) */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved receipt data. If you close now, your entries will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
