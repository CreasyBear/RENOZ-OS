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
import { Link } from '@tanstack/react-router';
import { MoreHorizontal, Plus, FileText, Ban, CheckCircle, Clock, Receipt, Download, Loader2, AlertTriangle } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { FormatAmount } from '@/components/shared/format';
import { format } from 'date-fns';
import type { CreditNoteStatus, CreateCreditNoteInput } from '@/lib/schemas';
import type { CreditNoteWithCustomer } from '@/lib/schemas/financial/credit-notes';
import { CreateCreditNoteDialog } from './credit-note-dialogs';
import { OrderCombobox, type OrderSummary, ConfirmationModal } from '@/components/shared';

// ============================================================================
// TYPES
// ============================================================================

// CreditNoteWithCustomer type imported from schemas (SCHEMA-TRACE.md compliance)

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
  /** @source useMutation for generateCreditNotePdf */
  onGeneratePdf: (id: string) => void;
  /** @source Combined pending state from all mutations */
  isMutating: boolean;
  /** @source PDF generation pending state */
  isGeneratingPdf?: boolean;
  /** @source useQuery refetch - for retry without full page reload */
  onRetry?: () => void;
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

// CreateCreditNoteDialog is now imported from ./credit-note-dialogs

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
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null);

  const handleSubmit = useCallback(() => {
    if (!selectedOrder) return;
    onApply(creditNoteId, selectedOrder.id);
    onOpenChange(false);
    setSelectedOrder(null);
  }, [creditNoteId, selectedOrder, onApply, onOpenChange]);

  const handleClose = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setSelectedOrder(null);
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply Credit Note to Invoice</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="order">Select Order/Invoice *</Label>
            <OrderCombobox
              value={selectedOrder}
              onSelect={setSelectedOrder}
              placeholder="Search orders by number..."
            />
            <p className="text-xs text-muted-foreground">
              Search by order number or customer name
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !selectedOrder}>
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
  onGeneratePdf,
  isMutating,
  isGeneratingPdf = false,
  onRetry,
  className,
}: CreditNotesListProps) {
  // Local UI state for dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [selectedCreditNoteId, setSelectedCreditNoteId] = useState<string | null>(null);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [creditNoteToVoid, setCreditNoteToVoid] = useState<CreditNoteWithCustomer | null>(null);

  const handleApplyClick = useCallback((creditNoteId: string) => {
    setSelectedCreditNoteId(creditNoteId);
    setApplyDialogOpen(true);
  }, []);

  const handleVoidClick = useCallback((creditNote: CreditNoteWithCustomer) => {
    setCreditNoteToVoid(creditNote);
    setVoidDialogOpen(true);
  }, []);

  const handleVoidConfirm = useCallback(() => {
    if (creditNoteToVoid) {
      onVoid(creditNoteToVoid.id);
      setVoidDialogOpen(false);
      setCreditNoteToVoid(null);
    }
  }, [creditNoteToVoid, onVoid]);

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
    return (
      <div className={cn('rounded-lg border border-destructive/50 bg-destructive/10 p-4', className)}>
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-destructive">Failed to load credit notes</p>
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
                <TableCell>
                  {creditNote.customer ? (
                    <Link
                      to="/customers/$customerId"
                      params={{ customerId: creditNote.customerId }}
                      search={{}}
                      className="text-primary hover:underline"
                    >
                      {creditNote.customer.name}
                    </Link>
                  ) : (
                    'Unknown'
                  )}
                </TableCell>
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

                      {/* Generate PDF - for issued and applied credit notes */}
                      {(creditNote.status === 'issued' || creditNote.status === 'applied') && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onGeneratePdf(creditNote.id)}
                            disabled={isGeneratingPdf}
                          >
                            {isGeneratingPdf ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="mr-2 h-4 w-4" />
                            )}
                            {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
                          </DropdownMenuItem>
                        </>
                      )}

                      {(creditNote.status === 'draft' || creditNote.status === 'issued') && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleVoidClick(creditNote)}
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
      {creditNoteToVoid && (
        <ConfirmationModal
          open={voidDialogOpen}
          onOpenChange={setVoidDialogOpen}
          title="Void Credit Note"
          message={`Are you sure you want to void credit note ${creditNoteToVoid.creditNoteNumber}? This action cannot be undone. The credit note will be marked as voided and cannot be issued or applied.`}
          confirmLabel="Void Credit Note"
          variant="danger"
          onConfirm={handleVoidConfirm}
          isConfirming={isMutating}
        />
      )}
    </div>
  );
});
