/**
 * CreditNotesList Component (Presenter)
 *
 * Lists credit notes with status badges and actions.
 * Supports create, issue, apply to invoice, and void operations.
 *
 * This is a presenter component - all data fetching and mutations
 * are handled by the container (route) and passed via props.
 *
 * @see src/routes/_authenticated/financial/credit-notes.tsx (container)
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json (DOM-FIN-001c)
 */

import { memo, useState, useCallback } from 'react';
import { MoreHorizontal, Plus, FileText, Ban, CheckCircle, Clock, Receipt } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { FormatAmount } from '@/components/shared/format';
import { format } from 'date-fns';
import type { CreditNoteStatus } from '@/lib/schemas';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Credit note with customer relation for display.
 * Matches the shape returned by listCreditNotes server function.
 */
interface CreditNoteWithCustomer {
  id: string;
  creditNoteNumber: string | null;
  customerId: string;
  orderId: string | null;
  amount: number;
  gstAmount: number | null;
  reason: string | null;
  status: CreditNoteStatus;
  issuedAt: Date | null;
  appliedAt: Date | null;
  appliedToOrderId: string | null;
  voidedAt: Date | null;
  voidReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  organizationId: string;
  customer: {
    id: string;
    name: string;
    email: string | null;
  } | null;
}

/**
 * Input for creating a credit note.
 */
export interface CreateCreditNoteInput {
  /** @source Form input - customer UUID */
  customerId: string;
  /** @source Form input - optional order UUID */
  orderId?: string;
  /** @source Form input - amount in cents */
  amount: number;
  /** @source Form input - reason for credit */
  reason: string;
}

/**
 * Props for CreditNotesList presenter component.
 * All data and mutation handlers come from the container.
 */
export interface CreditNotesListProps {
  /** @source Route param or undefined for all */
  customerId?: string;
  /** @source useQuery(['credit-notes', customerId]).data.items */
  creditNotes: CreditNoteWithCustomer[];
  /** @source useQuery.isLoading */
  isLoading: boolean;
  /** @source useQuery.error */
  error: Error | null;
  /** @source useMutation for createCreditNote */
  onCreate: (data: CreateCreditNoteInput) => void;
  /** @source useMutation for issueCreditNote */
  onIssue: (id: string) => void;
  /** @source useMutation for applyCreditNoteToInvoice */
  onApply: (creditNoteId: string, orderId: string) => void;
  /** @source useMutation for voidCreditNote */
  onVoid: (id: string) => void;
  /** @source Combined pending state from all mutations */
  isMutating: boolean;
  /** @source Optional className for styling */
  className?: string;
}

// ============================================================================
// STATUS HELPERS
// ============================================================================

const statusConfig: Record<
  CreditNoteStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    icon: typeof Clock;
  }
> = {
  draft: { label: 'Draft', variant: 'secondary', icon: Clock },
  issued: { label: 'Issued', variant: 'default', icon: FileText },
  applied: { label: 'Applied', variant: 'outline', icon: CheckCircle },
  voided: { label: 'Voided', variant: 'destructive', icon: Ban },
};

function StatusBadge({ status }: { status: CreditNoteStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// ============================================================================
// CREATE DIALOG (Presenter Sub-Component)
// ============================================================================

interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string;
  onCreate: (data: CreateCreditNoteInput) => void;
  isPending: boolean;
}

function CreateCreditNoteDialog({
  open,
  onOpenChange,
  customerId,
  onCreate,
  isPending,
}: CreateDialogProps) {
  const [formData, setFormData] = useState({
    customerId: customerId ?? '',
    orderId: '',
    amount: '',
    reason: '',
  });

  const handleSubmit = useCallback(() => {
    onCreate({
      customerId: formData.customerId,
      orderId: formData.orderId || undefined,
      amount: Math.round(parseFloat(formData.amount) * 100), // Convert to cents
      reason: formData.reason,
    });
    onOpenChange(false);
    setFormData({ customerId: customerId ?? '', orderId: '', amount: '', reason: '' });
  }, [formData, onCreate, onOpenChange, customerId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Credit Note</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="customerId">Customer ID</Label>
            <Input
              id="customerId"
              value={formData.customerId}
              onChange={(e) => setFormData((prev) => ({ ...prev, customerId: e.target.value }))}
              placeholder="Customer UUID"
              disabled={!!customerId}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="orderId">Order ID (optional)</Label>
            <Input
              id="orderId"
              value={formData.orderId}
              onChange={(e) => setFormData((prev) => ({ ...prev, orderId: e.target.value }))}
              placeholder="Link to order"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount (AUD)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
              placeholder="0.00"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="Reason for credit note"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !formData.amount}>
            {isPending ? 'Creating...' : 'Create Credit Note'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// APPLY TO INVOICE DIALOG (Presenter Sub-Component)
// ============================================================================

interface ApplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditNoteId: string;
  onApply: (creditNoteId: string, orderId: string) => void;
  isPending: boolean;
}

function ApplyToInvoiceDialog({
  open,
  onOpenChange,
  creditNoteId,
  onApply,
  isPending,
}: ApplyDialogProps) {
  const [orderId, setOrderId] = useState('');

  const handleSubmit = useCallback(() => {
    onApply(creditNoteId, orderId);
    onOpenChange(false);
    setOrderId('');
  }, [creditNoteId, orderId, onApply, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply Credit Note to Invoice</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="orderId">Order/Invoice ID</Label>
            <Input
              id="orderId"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="Order UUID to apply credit"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !orderId}>
            {isPending ? 'Applying...' : 'Apply Credit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN COMPONENT (PRESENTER)
// ============================================================================

export const CreditNotesList = memo(function CreditNotesList({
  customerId,
  creditNotes,
  isLoading,
  error,
  onCreate,
  onIssue,
  onApply,
  onVoid,
  isMutating,
  className,
}: CreditNotesListProps) {
  // Local UI state for dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [selectedCreditNoteId, setSelectedCreditNoteId] = useState<string | null>(null);

  const handleApplyClick = useCallback((creditNoteId: string) => {
    setSelectedCreditNoteId(creditNoteId);
    setApplyDialogOpen(true);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return <div className={cn('text-destructive p-4', className)}>Failed to load credit notes</div>;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Credit Notes</h3>
        <Button onClick={() => setCreateDialogOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Create Credit Note
        </Button>
      </div>

      {/* Table */}
      {creditNotes.length === 0 ? (
        <div className="text-muted-foreground py-8 text-center">No credit notes found</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {creditNotes.map((creditNote) => (
              <TableRow key={creditNote.id}>
                <TableCell className="font-medium">{creditNote.creditNoteNumber}</TableCell>
                <TableCell>{format(new Date(creditNote.createdAt), 'dd MMM yyyy')}</TableCell>
                <TableCell>{creditNote.customer?.name ?? 'Unknown'}</TableCell>
                <TableCell className="text-right">
                  <FormatAmount amount={creditNote.amount} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={creditNote.status} />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={isMutating}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {creditNote.status === 'draft' && (
                        <DropdownMenuItem onClick={() => onIssue(creditNote.id)}>
                          <FileText className="mr-2 h-4 w-4" />
                          Issue
                        </DropdownMenuItem>
                      )}
                      {creditNote.status === 'issued' && (
                        <DropdownMenuItem onClick={() => handleApplyClick(creditNote.id)}>
                          <Receipt className="mr-2 h-4 w-4" />
                          Apply to Invoice
                        </DropdownMenuItem>
                      )}
                      {(creditNote.status === 'draft' || creditNote.status === 'issued') && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onVoid(creditNote.id)}
                            className="text-destructive"
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Void
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Dialogs */}
      <CreateCreditNoteDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        customerId={customerId}
        onCreate={onCreate}
        isPending={isMutating}
      />
      {selectedCreditNoteId && (
        <ApplyToInvoiceDialog
          open={applyDialogOpen}
          onOpenChange={setApplyDialogOpen}
          creditNoteId={selectedCreditNoteId}
          onApply={onApply}
          isPending={isMutating}
        />
      )}
    </div>
  );
});
