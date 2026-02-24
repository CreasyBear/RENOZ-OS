/**
 * Bulk Receiving Dialog
 *
 * Multi-step wizard for receiving goods against multiple purchase orders.
 * Steps: Select POs -> Review -> Process
 *
 * @see docs/design-system/BULK-OPERATIONS-STANDARDS.md
 * @see src/components/domain/orders/order-bulk-operations-dialog.tsx (reference)
 * @see src/components/shared/bulk-import-wizard.tsx (wizard pattern)
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { Package, AlertTriangle, Check, Loader2, ChevronRight, ChevronLeft, Hash } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FormatAmount } from '@/components/shared/format';
import { toastError } from '@/hooks';
import type { PurchaseOrderTableData } from '@/lib/schemas/purchase-orders';
import type { PODetailsWithSerials } from '@/lib/schemas/procurement/procurement-types';
import { SerialNumberBatchEntry } from './serial-number-batch-entry';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface BulkReceivingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrders: PurchaseOrderTableData[];
  poDetailsWithSerials: PODetailsWithSerials[];
  onConfirm: (receiptData: {
    purchaseOrderIds: string[];
    serialNumbers?: Map<string, Map<string, string[]>>;
  }) => Promise<{
    processed: number;
    failed: number;
    errors: Array<{ poId: string; error: string }>;
  }>;
  isLoading?: boolean;
  error?: React.ReactNode;
}

type Step = 'select' | 'serials' | 'review' | 'processing';

interface ProcessingProgress {
  processed: number;
  failed: number;
  currentPO?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BulkReceivingDialog({
  open,
  onOpenChange,
  purchaseOrders,
  poDetailsWithSerials,
  onConfirm,
  isLoading = false,
  error,
}: BulkReceivingDialogProps) {
  const [step, setStep] = useState<Step>('select');
  const [selectedPOIds, setSelectedPOIds] = useState<Set<string>>(new Set());
  const [serialNumbers, setSerialNumbers] = useState<Map<string, Map<string, string[]>>>(new Map());
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress>({
    processed: 0,
    failed: 0,
  });
  const [attemptTotal, setAttemptTotal] = useState(0);
  const [failureDetails, setFailureDetails] = useState<Array<{ poId: string; error: string }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep('select');
      setSelectedPOIds(new Set());
      setSerialNumbers(new Map());
      setProcessingProgress({ processed: 0, failed: 0 });
      setAttemptTotal(0);
      setFailureDetails([]);
      setIsProcessing(false);
    }
  }, [open]);

  // Check if any selected POs have serialized items
  const selectedPODetails = useMemo(() => {
    return poDetailsWithSerials.filter((po) => selectedPOIds.has(po.poId));
  }, [poDetailsWithSerials, selectedPOIds]);

  const hasSerializedItems = useMemo(() => {
    return selectedPODetails.some((po) => po.hasSerializedItems);
  }, [selectedPODetails]);

  const totalSerializedQuantity = useMemo(() => {
    return selectedPODetails.reduce((sum, po) => sum + po.totalSerializedQuantity, 0);
  }, [selectedPODetails]);

  // Selected POs
  const selectedPOs = useMemo(
    () => purchaseOrders.filter((po) => selectedPOIds.has(po.id)),
    [purchaseOrders, selectedPOIds]
  );

  const totalValue = useMemo(
    () => selectedPOs.reduce((sum, po) => sum + (po.totalAmount ?? 0), 0),
    [selectedPOs]
  );
  const firstCapturedSerial = useMemo(() => {
    for (const itemMap of serialNumbers.values()) {
      for (const serialList of itemMap.values()) {
        for (const serial of serialList) {
          const normalized = serial.trim();
          if (normalized.length > 0) return normalized;
        }
      }
    }
    return null;
  }, [serialNumbers]);

  // Handlers
  const handleTogglePO = useCallback((poId: string, checked: boolean) => {
    setSelectedPOIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(poId);
      } else {
        next.delete(poId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedPOIds(new Set(purchaseOrders.map((po) => po.id)));
    } else {
      setSelectedPOIds(new Set());
    }
  }, [purchaseOrders]);

  const handleNext = useCallback(() => {
    if (selectedPOIds.size === 0) {
      toastError('Select at least one purchase order to receive');
      return;
    }
    // If there are serialized items, go to serial number entry step
    if (hasSerializedItems) {
      setStep('serials');
    } else {
      setStep('review');
    }
  }, [selectedPOIds.size, hasSerializedItems]);

  const handleBack = useCallback(() => {
    if (step === 'serials') {
      setStep('select');
    } else if (step === 'review') {
      setStep(hasSerializedItems ? 'serials' : 'select');
    }
  }, [step, hasSerializedItems]);

  const handleSerialNumbersNext = useCallback(() => {
    // Validate serial numbers before proceeding
    const errors: string[] = [];
    
    selectedPODetails.forEach((po) => {
      if (!po.hasSerializedItems) return;
      
      po.items.forEach((item) => {
        if (!item.requiresSerialNumbers) return;
        
        const itemSerials = serialNumbers.get(po.poId)?.get(item.id) ?? [];
        if (itemSerials.length !== item.quantityPending) {
          errors.push(
            `${po.poNumber} - ${item.productName}: Requires ${item.quantityPending} serial number${item.quantityPending !== 1 ? 's' : ''}, found ${itemSerials.length}`
          );
        }
      });
    });

    if (errors.length > 0) {
      toastError(errors[0]); // Show first error
      return;
    }

    setStep('review');
  }, [selectedPODetails, serialNumbers]);

  const runProcessing = useCallback(async (targetPOIds: string[]) => {
    if (targetPOIds.length === 0) return;
    setIsProcessing(true);
    setStep('processing');
    setProcessingProgress({ processed: 0, failed: 0 });
    setAttemptTotal(targetPOIds.length);
    setFailureDetails([]);

    try {
      const targetPOSet = new Set(targetPOIds);
      const targetSerialNumbers = hasSerializedItems
        ? new Map(
            Array.from(serialNumbers.entries()).filter(([poId]) => targetPOSet.has(poId))
          )
        : undefined;

      const result = await onConfirm({
        purchaseOrderIds: targetPOIds,
        serialNumbers: targetSerialNumbers,
      });
      setProcessingProgress(result);
      setFailureDetails(result.errors ?? []);

      if (result.failed === 0) {
        // All succeeded - close dialog
        setTimeout(() => {
          onOpenChange(false);
        }, 1500);
      }
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Failed to process bulk receiving');
      setStep('review');
    } finally {
      setIsProcessing(false);
    }
  }, [serialNumbers, hasSerializedItems, onConfirm, onOpenChange]);

  const handleConfirm = useCallback(async () => {
    await runProcessing(Array.from(selectedPOIds));
  }, [runProcessing, selectedPOIds]);

  const handleRetryFailed = useCallback(async () => {
    const failedPOIds = Array.from(new Set(failureDetails.map((f) => f.poId)));
    if (failedPOIds.length === 0) return;
    setSelectedPOIds(new Set(failedPOIds));
    await runProcessing(failedPOIds);
  }, [failureDetails, runProcessing]);

  const handleClose = useCallback(() => {
    if (isProcessing) return; // Prevent closing during processing
    onOpenChange(false);
  }, [isProcessing, onOpenChange]);

  const isAllSelected = selectedPOIds.size === purchaseOrders.length && purchaseOrders.length > 0;
  const isPartiallySelected =
    selectedPOIds.size > 0 && selectedPOIds.size < purchaseOrders.length;

  // Step content
  const renderSelectStep = () => (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium">
              {selectedPOIds.size} of {purchaseOrders.length} purchase orders selected
            </p>
            {selectedPOIds.size > 0 && (
              <p className="text-muted-foreground text-xs mt-1">
                Total value: <FormatAmount amount={totalValue} />
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isPartiallySelected ? "indeterminate" : isAllSelected}
              onCheckedChange={handleSelectAll}
              id="select-all"
            />
            <Label htmlFor="select-all" className="text-sm cursor-pointer">
              Select All
            </Label>
          </div>
        </div>

        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {purchaseOrders.map((po) => {
              const isSelected = selectedPOIds.has(po.id);
              return (
                <div
                  key={po.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                    isSelected && 'bg-muted/50 border-primary'
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleTogglePO(po.id, checked as boolean)}
                    id={`po-${po.id}`}
                  />
                  <Label htmlFor={`po-${po.id}`} className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{po.poNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {po.supplierName || 'Unknown Supplier'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          <FormatAmount amount={po.totalAmount} currency={po.currency} />
                        </p>
                      </div>
                    </div>
                  </Label>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {selectedPOIds.size > 10 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You&apos;re about to receive goods for {selectedPOIds.size} purchase orders. This
            operation may take a few moments.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  const handleSerialNumbersChange = useCallback(
    (poId: string, poItemId: string, serials: string[]) => {
      setSerialNumbers((prev) => {
        const next = new Map(prev);
        const poMap = next.get(poId) ?? new Map<string, string[]>();
        poMap.set(poItemId, serials);
        next.set(poId, poMap);
        return next;
      });
    },
    []
  );

  const renderSerialsStep = () => {
    return (
      <div className="space-y-4">
        <Alert>
          <Hash className="h-4 w-4" />
          <AlertDescription>
            {totalSerializedQuantity} serialized item{totalSerializedQuantity !== 1 ? 's' : ''} require serial numbers.
            Enter serial numbers for all items before proceeding.
          </AlertDescription>
        </Alert>

        <ScrollArea className="h-[400px]">
          <div className="space-y-6">
            {selectedPODetails
              .filter((po) => po.hasSerializedItems)
              .map((po) => (
                <div key={po.poId} className="space-y-3 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{po.poNumber}</h4>
                    <Badge variant="outline" className="text-xs">
                      {po.totalSerializedQuantity} serialized item{po.totalSerializedQuantity !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  {po.items
                    .filter((item) => item.requiresSerialNumbers)
                    .map((item) => {
                      const currentSerials = serialNumbers.get(po.poId)?.get(item.id) ?? [];
                      return (
                        <div key={item.id} className="space-y-2 border-t pt-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{item.productName}</p>
                              {item.productSku && (
                                <p className="text-xs text-muted-foreground">SKU: {item.productSku}</p>
                              )}
                            </div>
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          </div>
                          <SerialNumberBatchEntry
                            requiredQuantity={item.quantityPending}
                            existingSerialNumbers={currentSerials}
                            onSerialNumbersChange={(serials) =>
                              handleSerialNumbersChange(po.poId, item.id, serials)
                            }
                          />
                        </div>
                      );
                    })}
                </div>
              ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  const renderReviewStep = () => (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium">
              {selectedPOs.length} purchase order{selectedPOs.length !== 1 ? 's' : ''} ready to
              receive
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              Total value: <FormatAmount amount={totalValue} />
            </p>
            {hasSerializedItems && (
              <p className="text-muted-foreground text-xs mt-1">
                {totalSerializedQuantity} serialized item{totalSerializedQuantity !== 1 ? 's' : ''} with serial numbers
              </p>
            )}
          </div>
        </div>

        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {selectedPOs.map((po) => {
              const poDetail = poDetailsWithSerials.find((p) => p.poId === po.id);
              return (
                <div
                  key={po.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="text-sm font-medium">{po.poNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {po.supplierName || 'Unknown Supplier'}
                    </p>
                    {poDetail?.hasSerializedItems && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {poDetail.totalSerializedQuantity} serialized item{poDetail.totalSerializedQuantity !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      <FormatAmount amount={po.totalAmount} currency={po.currency} />
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          This will create receipts for all selected purchase orders. Each PO will be processed
          individually. You can review individual receipts after processing.
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderProcessingStep = () => {
    const total = attemptTotal;
    const { processed, failed } = processingProgress;
    const percentage = total > 0 ? Math.round(((processed + failed) / total) * 100) : 0;
    const isComplete = total > 0 && processed + failed >= total;
    const failedByPO = Array.from(new Set(failureDetails.map((f) => f.poId))).map((poId) => {
      const po = purchaseOrders.find((candidate) => candidate.id === poId);
      const reasons = failureDetails
        .filter((failure) => failure.poId === poId)
        .map((failure) => failure.error);
      return {
        poId,
        poNumber: po?.poNumber ?? poId,
        reasons,
      };
    });

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            {isComplete && failed === 0 ? (
              <Check className="h-8 w-8 text-primary" />
            ) : isComplete ? (
              <AlertTriangle className="h-8 w-8 text-destructive" />
            ) : (
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            )}
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {isComplete
              ? failed === 0
                ? 'All purchase orders received successfully'
                : `Processed ${processed} of ${total} purchase orders`
              : 'Processing purchase orders...'}
          </h3>
          {processingProgress.currentPO && !isComplete && (
            <p className="text-sm text-muted-foreground">
              Receiving: {processingProgress.currentPO}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{percentage}%</span>
          </div>
          <Progress value={percentage} />
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{processed}</div>
            <div className="text-xs text-muted-foreground">Processed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{failed}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
        </div>

        {failed > 0 && (
          <div className="space-y-3">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {failed} purchase order{failed !== 1 ? 's' : ''} failed to process. Review exact
                reasons below and retry failed items.
              </AlertDescription>
            </Alert>

            {failedByPO.length > 0 && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5">
                <div className="border-b border-destructive/20 px-3 py-2 text-sm font-medium">
                  Failed Purchase Orders
                </div>
                <ScrollArea className="max-h-[180px]">
                  <div className="divide-y divide-destructive/10">
                    {failedByPO.map((entry) => (
                      <div key={entry.poId} className="px-3 py-2">
                        <div className="text-sm font-medium">{entry.poNumber}</div>
                        {entry.reasons.map((reason, idx) => (
                          <p key={`${entry.poId}-${idx}`} className="text-xs text-muted-foreground mt-1">
                            {reason}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
              <Package className="text-primary h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Bulk Receive Goods</DialogTitle>
              <DialogDescription>
                Receive goods against multiple purchase orders
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step indicator */}
        {step !== 'processing' && (
          <div className="flex items-center justify-between">
            {(hasSerializedItems ? ['select', 'serials', 'review'] : ['select', 'review']).map((s, i) => {
              const stepKey = s as Step;
              const isActive = step === stepKey;
              const currentStepIndex = hasSerializedItems
                ? ['select', 'serials', 'review'].indexOf(step)
                : ['select', 'review'].indexOf(step);
              const isCompleted = currentStepIndex > i;

              return (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                        isCompleted
                          ? 'bg-primary text-primary-foreground'
                          : isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {isCompleted ? <Check className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className="text-sm hidden sm:inline">
                      {s === 'select'
                        ? 'Select POs'
                        : s === 'serials'
                          ? 'Serial Numbers'
                          : 'Review'}
                    </span>
                  </div>
                  {i < (hasSerializedItems ? 2 : 1) && (
                    <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Separator />

        {/* Step content */}
        <div className="min-h-[400px]">
          {error ? (
            <div className="py-8">{error}</div>
          ) : (
            <>
              {step === 'select' && renderSelectStep()}
              {step === 'serials' && renderSerialsStep()}
              {step === 'review' && renderReviewStep()}
              {step === 'processing' && renderProcessingStep()}
            </>
          )}
        </div>

        <DialogFooter>
          {step === 'select' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleNext} disabled={selectedPOIds.size === 0}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          )}
          {step === 'serials' && (
            <>
              <Button variant="outline" onClick={handleBack} disabled={isProcessing}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleSerialNumbersNext} disabled={isProcessing || isLoading}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          )}
          {step === 'review' && (
            <>
              <Button variant="outline" onClick={handleBack} disabled={isProcessing}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleConfirm} disabled={isProcessing || isLoading}>
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 mr-2" />
                    Receive {selectedPOIds.size} Purchase Orders
                  </>
                )}
              </Button>
            </>
          )}
          {step === 'processing' && (
            <>
              {!isProcessing && processingProgress.processed > 0 && firstCapturedSerial && (
                <Link
                  to="/inventory/browser"
                  search={{ view: 'serialized', serializedSearch: firstCapturedSerial, page: 1 }}
                  className={cn(buttonVariants({ variant: 'outline' }))}
                >
                  View Received Serials
                </Link>
              )}
              {processingProgress.failed > 0 && !isProcessing && (
                <Button onClick={handleRetryFailed}>
                  Retry Failed ({processingProgress.failed})
                </Button>
              )}
              <Button
                onClick={handleClose}
                disabled={isProcessing}
                variant={processingProgress.failed > 0 ? 'outline' : 'default'}
              >
                {processingProgress.failed > 0 ? 'Close' : 'Done'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
