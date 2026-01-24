/**
 * PaymentPlansList Presenter Component
 *
 * Pure presentation component for payment plans and installment schedules.
 * All data fetching and mutations are handled by the container (route).
 *
 * @see src/routes/_authenticated/financial/payment-plans.tsx (container)
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json (DOM-FIN-002c)
 */

import { memo, useState } from 'react';
import { Plus, CheckCircle, CreditCard } from 'lucide-react';
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
  DialogFooter,
} from '@/components/ui/dialog';
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
import { format } from 'date-fns';
import type { PaymentPlanType, InstallmentStatus } from '@/lib/schemas';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Payment schedule data structure returned by getPaymentSchedule.
 * Contains summary information and list of installments.
 */
export interface PaymentSchedule {
  orderId: string;
  planType: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  installmentCount: number;
  paidCount: number;
  overdueCount: number;
  nextDueDate: Date | null;
  nextDueAmount: number | null;
  installments: Installment[];
}

/**
 * Single installment in a payment schedule.
 */
export interface Installment {
  id: string;
  organizationId: string;
  orderId: string;
  planType: string;
  installmentNo: number;
  description: string | null;
  dueDate: string;
  amount: number;
  gstAmount: number;
  status: InstallmentStatus;
  paidAmount: number | null;
  paidAt: Date | null;
  paymentReference: string | null;
  notes: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

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
  schedule: PaymentSchedule | undefined | null;
  /** @source useQuery loading state */
  isLoading: boolean;
  /** @source useQuery error state */
  error?: unknown;
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
// CREATE DIALOG
// ============================================================================

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
  const [planType, setPlanType] = useState<PaymentPlanType>('fifty_fifty');
  const [monthlyCount, setMonthlyCount] = useState('3');

  const handleSubmit = () => {
    onCreatePlan(
      planType,
      planType === 'monthly' ? parseInt(monthlyCount) : undefined
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Payment Plan</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-muted-foreground text-sm">Order Total</p>
            <p className="text-lg font-semibold">
              <FormatAmount amount={orderTotal} />
            </p>
          </div>
          <div className="grid gap-2">
            <Label>Payment Plan Type</Label>
            <Select value={planType} onValueChange={(v) => setPlanType(v as PaymentPlanType)}>
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
          </div>
          {planType === 'monthly' && (
            <div className="grid gap-2">
              <Label>Number of Months</Label>
              <Input
                type="number"
                min="2"
                max="24"
                value={monthlyCount}
                onChange={(e) => setMonthlyCount(e.target.value)}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Plan'}
          </Button>
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
      <div className={cn('text-destructive p-4', className)}>Failed to load payment schedule</div>
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
