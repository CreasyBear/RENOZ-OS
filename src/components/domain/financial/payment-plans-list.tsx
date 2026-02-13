/**
 * PaymentPlansList Presenter Component
 *
 * Pure presentation component for payment plans and installment schedules.
 * All data fetching and mutations are handled by the container (route).
 *
 * @see src/routes/_authenticated/financial/payment-plans.tsx (container)
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json (DOM-FIN-002c)
 */

import { memo, useState, useCallback, useEffect, startTransition } from 'react';
import { Plus, CheckCircle, CreditCard, ChevronLeft, ChevronRight, FileText, Calendar, Eye, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { FormatAmount } from '@/components/shared/format';
import type {
  PaymentPlanType,
  InstallmentStatus,
  PaymentScheduleResponse,
} from '@/lib/schemas';
import { paymentPlanTypeSchema } from '@/lib/schemas';

/**
 * Props for the PaymentPlansList presenter component.
 * All data and handlers are passed from the container (route).
 */
export interface PaymentPlansListProps {
  /** @source route params or search params */
  orderId: string;
  /** @source route params or search params */
  orderTotal: number;
  /** @source useQuery(getPaymentSchedule) in /financial/payment-plans.tsx */
  schedule: PaymentScheduleResponse | undefined | null;
  /** @source useQuery loading state */
  isLoading: boolean;
  /** @source useQuery error state */
  error?: unknown;
  /** @source useQuery refetch - for retry without full page reload */
  onRetry?: () => void;
  /** @source useState(createDialogOpen) */
  createDialogOpen: boolean;
  /** @source setState(createDialogOpen) */
  onCreateDialogOpenChange: (open: boolean) => void;
  /** @source useMutation(createPaymentPlan) handler */
  onCreatePlan: (planType: PaymentPlanType, monthlyCount?: number) => void;
  /** @source useMutation isPending */
  isCreatingPlan: boolean;
  /** @source useState(recordPaymentOpen) */
  recordPaymentOpen: boolean;
  /** @source setState(recordPaymentOpen) */
  onRecordPaymentOpenChange: (open: boolean) => void;
  /** @source useState(selectedInstallment) */
  selectedInstallment: { id: string; amount: number } | null;
  /** @source handler to select installment and open dialog */
  onSelectInstallment: (id: string, amount: number) => void;
  /** @source useMutation(recordInstallmentPayment) handler */
  onRecordPayment: (installmentId: string, amount: number, paymentRef?: string) => void;
  /** @source useMutation isPending */
  isRecordingPayment: boolean;
  /** Optional CSS class name */
  className?: string;
}

// ============================================================================
// STATUS HELPERS
// ============================================================================

const installmentStatusConfig: Record<
  InstallmentStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending: { label: 'Pending', variant: 'secondary' },
  due: { label: 'Due', variant: 'default' },
  paid: { label: 'Paid', variant: 'outline' },
  overdue: { label: 'Overdue', variant: 'destructive' },
};

// ============================================================================
// CREATE DIALOG - Multi-Step Wizard
// ============================================================================

type PaymentPlanWizardStep = 'plan-type' | 'schedule' | 'review';

const WIZARD_STEPS: { id: PaymentPlanWizardStep; label: string; icon: typeof FileText }[] = [
  { id: 'plan-type', label: 'Plan Type', icon: FileText },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'review', label: 'Review', icon: Eye },
];

interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderTotal: number;
  onCreatePlan: (planType: PaymentPlanType, monthlyCount?: number) => void;
  isCreating: boolean;
}

function CreatePaymentPlanDialog({
  open,
  onOpenChange,
  orderTotal,
  onCreatePlan,
  isCreating,
}: CreateDialogProps) {
  const [currentStep, setCurrentStep] = useState<PaymentPlanWizardStep>('plan-type');
  const [planType, setPlanType] = useState<PaymentPlanType>('fifty_fifty');
  const [monthlyCount, setMonthlyCount] = useState('3');
  const [errors, setErrors] = useState<string[]>([]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      startTransition(() => {
        setCurrentStep('plan-type');
        setPlanType('fifty_fifty');
        setMonthlyCount('3');
        setErrors([]);
      });
    }
  }, [open]);

  const currentStepIndex = WIZARD_STEPS.findIndex((s) => s.id === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;

  const handleStepClick = useCallback((step: PaymentPlanWizardStep) => {
    // Only allow going back, not forward
    const stepIndex = WIZARD_STEPS.findIndex((s) => s.id === step);
    if (stepIndex <= currentStepIndex) {
      setCurrentStep(step);
      setErrors([]);
    }
  }, [currentStepIndex]);

  const validateStep = useCallback((step: PaymentPlanWizardStep): string[] => {
    const stepErrors: string[] = [];
    
    if (step === 'plan-type') {
      // Plan type is always selected (has default)
    } else if (step === 'schedule') {
      if (planType === 'monthly') {
        const count = parseInt(monthlyCount);
        if (isNaN(count) || count < 2 || count > 24) {
          stepErrors.push('Number of months must be between 2 and 24');
        }
      }
    }
    
    return stepErrors;
  }, [planType, monthlyCount]);

  const handleNext = useCallback(() => {
    const stepErrors = validateStep(currentStep);
    if (stepErrors.length > 0) {
      setErrors(stepErrors);
      return;
    }

    if (isLastStep) {
      // Submit
      onCreatePlan(
        planType,
        planType === 'monthly' ? parseInt(monthlyCount) : undefined
      );
    } else {
      setCurrentStep(WIZARD_STEPS[currentStepIndex + 1].id);
      setErrors([]);
    }
  }, [currentStep, currentStepIndex, isLastStep, planType, monthlyCount, validateStep, onCreatePlan]);

  const handlePrevious = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep(WIZARD_STEPS[currentStepIndex - 1].id);
      setErrors([]);
    }
  }, [currentStepIndex, isFirstStep]);

  // Calculate installment preview with actual dates
  const calculateInstallments = useCallback(() => {
    // Use today as base date for preview (actual dates calculated server-side)
    const baseDate = new Date();
    const paymentTermsDays = 30; // Standard payment terms

    const addDays = (date: Date, days: number): Date => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    };

    const formatDueDate = (date: Date): string => {
      return format(date, 'dd MMM yyyy');
    };

    if (planType === 'fifty_fifty') {
      const half = Math.round(orderTotal / 2);
      return [
        {
          number: 1,
          amount: half,
          dueDate: formatDueDate(addDays(baseDate, paymentTermsDays)),
        },
        {
          number: 2,
          amount: orderTotal - half,
          dueDate: formatDueDate(addDays(baseDate, paymentTermsDays + 30)),
        },
      ];
    } else if (planType === 'thirds') {
      const third = Math.round(orderTotal / 3);
      return [
        {
          number: 1,
          amount: third,
          dueDate: formatDueDate(addDays(baseDate, paymentTermsDays)),
        },
        {
          number: 2,
          amount: third,
          dueDate: formatDueDate(addDays(baseDate, paymentTermsDays + 30)),
        },
        {
          number: 3,
          amount: orderTotal - third * 2,
          dueDate: formatDueDate(addDays(baseDate, paymentTermsDays + 60)),
        },
      ];
    } else if (planType === 'monthly') {
      const count = parseInt(monthlyCount) || 3;
      const monthlyAmount = Math.round(orderTotal / count);
      return Array.from({ length: count }, (_, i) => ({
        number: i + 1,
        amount: i === count - 1 ? orderTotal - monthlyAmount * (count - 1) : monthlyAmount,
        dueDate: formatDueDate(addDays(baseDate, paymentTermsDays + i * 30)),
      }));
    }
    return [];
  }, [planType, monthlyCount, orderTotal]);

  const installments = calculateInstallments();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Payment Plan</DialogTitle>
          <DialogDescription>
            Set up payment plan in {WIZARD_STEPS.length} steps
          </DialogDescription>
        </DialogHeader>

        {/* Step Tabs */}
        <Tabs
          value={currentStep}
          onValueChange={(v) => {
            if (v === 'plan-type' || v === 'schedule' || v === 'review') {
              handleStepClick(v);
            }
          }}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="w-full justify-start">
            {WIZARD_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentStepIndex;
              return (
                <TabsTrigger
                  key={step.id}
                  value={step.id}
                  disabled={index > currentStepIndex}
                  className={cn(
                    "gap-2",
                    isCompleted && "text-green-600 dark:text-green-400"
                  )}
                  aria-label={`Step ${index + 1}: ${step.label}`}
                >
                  <span className="flex items-center justify-center w-5 h-5 text-xs rounded-full border">
                    {index + 1}
                  </span>
                  <Icon className="h-4 w-4 hidden sm:inline" />
                  <span className="hidden sm:inline">{step.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto py-4">
            {/* Plan Type Step */}
            <TabsContent value="plan-type" className="space-y-4 mt-0">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-muted-foreground text-sm mb-1">Order Total</p>
                <p className="text-2xl font-semibold">
                  <FormatAmount amount={orderTotal} />
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Payment Plan Type</Label>
                <Select
                  value={planType}
                  onValueChange={(v) => {
                    const result = paymentPlanTypeSchema.safeParse(v);
                    if (result.success) {
                      setPlanType(result.data);
                      setErrors([]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fifty_fifty">50/50 Split (Commercial)</SelectItem>
                    <SelectItem value="thirds">Three Installments (33/33/34)</SelectItem>
                    <SelectItem value="monthly">Monthly Payments</SelectItem>
                    <SelectItem value="custom">Custom Schedule</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {planType === 'fifty_fifty' && 'Split payment into two equal installments'}
                  {planType === 'thirds' && 'Split payment into three installments (33%, 33%, 34%)'}
                  {planType === 'monthly' && 'Split payment into equal monthly installments'}
                  {planType === 'custom' && 'Create a custom payment schedule'}
                </p>
              </div>

              {/* Preview */}
              {installments.length > 0 && (
                <div className="border rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium">Preview:</p>
                  <div className="space-y-1">
                    {installments.map((inst) => (
                      <div key={inst.number} className="flex justify-between text-sm">
                        <span>Installment {inst.number}:</span>
                        <span className="font-medium">
                          <FormatAmount amount={inst.amount} /> due {inst.dueDate}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {errors.length > 0 && (
                <div className="text-sm text-destructive">
                  {errors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Schedule Step */}
            <TabsContent value="schedule" className="space-y-4 mt-0">
              {planType === 'monthly' ? (
                <>
                  <div className="grid gap-2">
                    <Label>Number of Months</Label>
                    <Input
                      type="number"
                      min="2"
                      max="24"
                      value={monthlyCount}
                      onChange={(e) => {
                        setMonthlyCount(e.target.value);
                        setErrors([]);
                      }}
                      placeholder="Enter number of months"
                    />
                    <p className="text-sm text-muted-foreground">
                      Payment will be split into {monthlyCount || '?'} equal monthly installments
                    </p>
                  </div>

                  {/* Updated Preview */}
                  {installments.length > 0 && (
                    <div className="border rounded-lg p-4 space-y-2">
                      <p className="text-sm font-medium">Payment Schedule:</p>
                      <div className="space-y-2">
                        {installments.map((inst) => (
                          <div key={inst.number} className="flex justify-between items-center p-2 bg-muted rounded">
                            <div>
                              <p className="text-sm font-medium">Installment {inst.number}</p>
                              <p className="text-xs text-muted-foreground">Due {inst.dueDate}</p>
                            </div>
                            <p className="font-semibold">
                              <FormatAmount amount={inst.amount} />
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 border-t flex justify-between font-semibold">
                        <span>Total:</span>
                        <span><FormatAmount amount={orderTotal} /></span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No additional schedule configuration needed for {planType === 'fifty_fifty' ? '50/50 split' : planType === 'thirds' ? 'three installments' : 'custom'} plan.</p>
                  <p className="text-sm mt-2">Review the plan details in the next step.</p>
                </div>
              )}

              {errors.length > 0 && (
                <div className="text-sm text-destructive">
                  {errors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Review Step */}
            <TabsContent value="review" className="space-y-4 mt-0">
              <div className="space-y-4">
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-muted-foreground text-sm mb-1">Order Total</p>
                  <p className="text-2xl font-semibold">
                    <FormatAmount amount={orderTotal} />
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Plan Type:</p>
                  <p className="text-sm text-muted-foreground">
                    {planType === 'fifty_fifty' && '50/50 Split (Commercial)'}
                    {planType === 'thirds' && 'Three Installments (33/33/34)'}
                    {planType === 'monthly' && `Monthly Payments (${monthlyCount} months)`}
                    {planType === 'custom' && 'Custom Schedule'}
                  </p>
                </div>

                {installments.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Payment Schedule:</p>
                    <div className="border rounded-lg divide-y">
                      {installments.map((inst) => (
                        <div key={inst.number} className="flex justify-between items-center p-3">
                          <div>
                            <p className="text-sm font-medium">Installment {inst.number}</p>
                            <p className="text-xs text-muted-foreground">Due {inst.dueDate}</p>
                          </div>
                          <p className="font-semibold">
                            <FormatAmount amount={inst.amount} />
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="pt-3 border-t flex justify-between font-semibold">
                      <span>Total:</span>
                      <span><FormatAmount amount={orderTotal} /></span>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer Navigation */}
        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstStep}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleNext} disabled={isCreating}>
              {isLastStep ? (
                isCreating ? 'Creating...' : 'Create Plan'
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// RECORD PAYMENT DIALOG
// ============================================================================

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installmentId: string;
  amount: number;
  onRecordPayment: (installmentId: string, amount: number, paymentRef?: string) => void;
  isRecording: boolean;
}

function RecordPaymentDialog({
  open,
  onOpenChange,
  installmentId,
  amount,
  onRecordPayment,
  isRecording,
}: RecordPaymentDialogProps) {
  const [paymentRef, setPaymentRef] = useState('');

  const handleSubmit = () => {
    onRecordPayment(installmentId, amount, paymentRef);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-muted-foreground text-sm">Amount</p>
            <p className="text-lg font-semibold">
              <FormatAmount amount={amount} />
            </p>
          </div>
          <div className="grid gap-2">
            <Label>Payment Reference (optional)</Label>
            <Input
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="e.g., Bank transfer ref"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isRecording}>
            {isRecording ? 'Recording...' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PaymentPlansList = memo(function PaymentPlansList({
  orderId: _orderId, // Used by container for data fetching; kept for context
  orderTotal,
  schedule,
  isLoading,
  error,
  onRetry,
  createDialogOpen,
  onCreateDialogOpenChange,
  onCreatePlan,
  isCreatingPlan,
  recordPaymentOpen,
  onRecordPaymentOpenChange,
  selectedInstallment,
  onSelectInstallment,
  onRecordPayment,
  isRecordingPayment,
  className,
}: PaymentPlansListProps) {
  // Loading state
  if (isLoading) {
    return <Skeleton className={cn('h-32 w-full', className)} />;
  }

  // Error state
  if (error) {
    return (
      <div className={cn('rounded-lg border border-destructive/50 bg-destructive/10 p-4', className)}>
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-destructive">Failed to load payment schedule</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => onRetry?.()}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const hasSchedule = schedule && schedule.installments && schedule.installments.length > 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Payment Plan</h3>
        {!hasSchedule && (
          <Button onClick={() => onCreateDialogOpenChange(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create Plan
          </Button>
        )}
      </div>

      {/* Schedule */}
      {!hasSchedule ? (
        <div className="text-muted-foreground rounded-lg border py-8 text-center">
          <CreditCard className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p>No payment plan configured</p>
          <p className="text-sm">Create a plan to split payments into installments</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-muted-foreground text-sm">Total</p>
              <p className="text-lg font-semibold">
                <FormatAmount amount={schedule.totalAmount} />
              </p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-muted-foreground text-sm">Paid</p>
              <p className="text-lg font-semibold text-green-600">
                <FormatAmount amount={schedule.paidAmount} />
              </p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-muted-foreground text-sm">Remaining</p>
              <p className="text-lg font-semibold">
                <FormatAmount amount={schedule.remainingAmount} />
              </p>
            </div>
          </div>

          {/* Installments */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.installments.map((inst) => {
                const statusConf = installmentStatusConfig[inst.status];
                return (
                  <TableRow key={inst.id}>
                    <TableCell>{inst.installmentNo}</TableCell>
                    <TableCell>{format(new Date(inst.dueDate), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <FormatAmount amount={inst.amount} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConf.variant}>{statusConf.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {(inst.status === 'pending' ||
                        inst.status === 'due' ||
                        inst.status === 'overdue') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            onSelectInstallment(inst.id, inst.amount);
                          }}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialogs */}
      <CreatePaymentPlanDialog
        open={createDialogOpen}
        onOpenChange={onCreateDialogOpenChange}
        orderTotal={orderTotal}
        onCreatePlan={onCreatePlan}
        isCreating={isCreatingPlan}
      />
      {selectedInstallment && (
        <RecordPaymentDialog
          open={recordPaymentOpen}
          onOpenChange={onRecordPaymentOpenChange}
          installmentId={selectedInstallment.id}
          amount={selectedInstallment.amount}
          onRecordPayment={onRecordPayment}
          isRecording={isRecordingPayment}
        />
      )}
    </div>
  );
});
