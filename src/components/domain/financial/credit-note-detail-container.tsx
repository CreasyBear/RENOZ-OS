/**
 * Credit Note Detail Container
 *
 * Thin orchestration layer that handles loading/error states and actions.
 * Uses useCreditNote hook for data.
 *
 * @source creditNote from useCreditNote hook
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  MoreHorizontal,
  FileCheck,
  Receipt,
  Ban,
  Loader2,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ErrorState } from '@/components/shared/error-state';
import { OrderCombobox, type OrderSummary } from '@/components/shared';
import { useCreditNote, useIssueCreditNote, useApplyCreditNote, useVoidCreditNote } from '@/hooks/financial';
import { toastSuccess, toastError } from '@/hooks';
import { useDetailBreadcrumb } from '@/components/layout/use-detail-breadcrumb';
import { cn } from '@/lib/utils';
import { CreditNoteDetailView } from './credit-note-detail-view';
import { FinancialTableSkeleton } from '@/components/skeletons/financial';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================================
// TYPES
// ============================================================================

export interface CreditNoteDetailContainerRenderProps {
  /** Header actions (CTAs) for PageLayout.Header when using layout pattern */
  headerActions?: React.ReactNode;
  /** Main content */
  content: React.ReactNode;
}

export interface CreditNoteDetailContainerProps {
  creditNoteId: string;
  /** Render props pattern for layout composition */
  children?: (props: CreditNoteDetailContainerRenderProps) => React.ReactNode;
  className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CreditNoteDetailContainer({
  creditNoteId,
  children,
  className,
}: CreditNoteDetailContainerProps) {
  const navigate = useNavigate();
  const { data: creditNote, isLoading, error, refetch } = useCreditNote(creditNoteId);
  const issueMutation = useIssueCreditNote();
  const applyMutation = useApplyCreditNote();
  const voidMutation = useVoidCreditNote();

  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);

  useDetailBreadcrumb(
    `/financial/credit-notes/${creditNoteId}`,
    creditNote ? (creditNote.creditNoteNumber ?? `CN-${creditNoteId.slice(0, 8)}`) : undefined,
    !!creditNote
  );

  const handleIssue = useCallback(() => {
    issueMutation.mutate(creditNoteId, {
      onSuccess: () => {
        toastSuccess('Credit note issued successfully');
        refetch();
      },
      onError: (err) => toastError(err.message || 'Failed to issue credit note'),
    });
  }, [creditNoteId, issueMutation, refetch]);

  const handleApplyClick = useCallback(() => {
    setSelectedOrder(null);
    setApplyDialogOpen(true);
  }, []);

  const handleApplySubmit = useCallback(() => {
    if (!selectedOrder) return;
    applyMutation.mutate(
      { creditNoteId, orderId: selectedOrder.id },
      {
        onSuccess: () => {
          setApplyDialogOpen(false);
          setSelectedOrder(null);
          toastSuccess('Credit note applied successfully', {
            description: 'Invoice balance has been updated.',
            action: {
              label: 'View Order',
              onClick: () => navigate({ to: '/orders/$orderId', params: { orderId: selectedOrder.id } }),
            },
          });
          refetch();
        },
        onError: (err) => toastError(err.message || 'Failed to apply credit note'),
      }
    );
  }, [creditNoteId, selectedOrder, applyMutation, refetch, navigate]);

  const handleVoidClick = useCallback(() => setVoidDialogOpen(true), []);

  const handleVoidConfirm = useCallback(() => {
    voidMutation.mutate(
      { id: creditNoteId },
      {
        onSuccess: () => {
          setVoidDialogOpen(false);
          toastSuccess('Credit note voided successfully');
          refetch();
        },
        onError: (err) => toastError(err.message || 'Failed to void credit note'),
      }
    );
  }, [creditNoteId, voidMutation, refetch]);

  // Loading
  if (isLoading) {
    const loadingContent = <FinancialTableSkeleton />;
    if (children) {
      return <>{children({ headerActions: <Skeleton className="h-10 w-32" />, content: loadingContent })}</>;
    }
    return loadingContent;
  }

  // Error
  if (error || !creditNote) {
    const errorContent = (
      <ErrorState
        title="Credit note not found"
        message="The credit note you're looking for doesn't exist or has been deleted."
        onRetry={() => refetch()}
        retryLabel="Try Again"
      />
    );
    if (children) {
      return <>{children({ headerActions: null, content: errorContent })}</>;
    }
    return errorContent;
  }

  const canIssue = creditNote.status === 'draft';
  const canApply = creditNote.status === 'issued';
  const canVoid = creditNote.status === 'draft' || creditNote.status === 'issued';
  const isMutating = issueMutation.isPending || applyMutation.isPending || voidMutation.isPending;

  const ctasOnly = (
    <div className="flex items-center gap-2">
      {canIssue && (
        <Button onClick={handleIssue} disabled={isMutating}>
          {issueMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileCheck className="h-4 w-4 mr-2" />}
          Issue
        </Button>
      )}

      {canApply && (
        <Button onClick={handleApplyClick} disabled={isMutating}>
          <Receipt className="h-4 w-4 mr-2" />
          Apply to Invoice
        </Button>
      )}

      {canVoid && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={handleVoidClick}
              className="text-destructive"
              disabled={isMutating}
            >
              <Ban className="h-4 w-4 mr-2" />
              Void Credit Note
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  const headerActionsWithBack = (
    <div className="flex items-center gap-2">
      <Link
        to="/financial/credit-notes"
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="sr-only">Back to credit notes</span>
      </Link>
      {ctasOnly}
    </div>
  );

  const content = (
    <>
      <CreditNoteDetailView
        creditNote={creditNote}
        headerActions={children ? null : headerActionsWithBack}
        hideBack={!!children}
        className={className}
      />

      {/* Apply to Invoice Dialog */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
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
                customerId={creditNote.customerId}
                placeholder="Search orders by number..."
                disabled={applyMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Search by order number or customer name
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyDialogOpen(false)} disabled={applyMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleApplySubmit} disabled={applyMutation.isPending || !selectedOrder}>
              {applyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {applyMutation.isPending ? 'Applying...' : 'Apply Credit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Confirmation */}
      <AlertDialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Credit Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to void this credit note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVoidConfirm}
              disabled={voidMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {voidMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {voidMutation.isPending ? 'Voiding...' : 'Void'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  if (children) {
    return <>{children({ headerActions: ctasOnly, content })}</>;
  }

  return content;
}
