/**
 * Invoice Detail Container
 *
 * Thin orchestration layer that handles loading/error states.
 * Uses useInvoiceDetail hook for all data and actions.
 *
 * @source invoice from useInvoice hook (via useInvoiceDetail)
 * @source alerts computed from invoice data
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md (Container Pattern)
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  MoreHorizontal,
  CheckCircle,
  Send,
  Download,
  Printer,
  FileText,
  Loader2,
  Clock,
  Undo2,
  RefreshCcw,
  DollarSign,
  Ban,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { ErrorState } from '@/components/shared/error-state';
import { EntityActivityLogger } from '@/components/shared/activity';
import { useEntityActivityLogging } from '@/hooks/activities/use-entity-activity-logging';
import { DisabledMenuItem } from '@/components/shared/disabled-with-tooltip';
import { useInvoiceDetail } from '@/hooks/invoices/use-invoice-detail';
import { useGenerateOrderInvoice } from '@/hooks/documents';
import { useVoidInvoice } from '@/hooks/invoices';
import { useCreateCreditNote } from '@/hooks/financial';
import { toastSuccess, toastError } from '@/hooks';
import { useTrackView } from '@/hooks/search';
import { toast } from '@/lib/toast';
import { useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { useDetailBreadcrumb } from '@/components/layout/use-detail-breadcrumb';
import { InvoiceDetailView } from './invoice-detail-view';
import { InvoiceDetailSkeleton } from '@/components/skeletons/invoices';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateCreditNoteDialog } from '@/components/domain/financial/credit-note-dialogs';
import {
  INVOICE_STATUS_CONFIG,
  type InvoiceStatus,
} from '@/lib/constants/invoice-status';

// ============================================================================
// TYPES
// ============================================================================

export interface InvoiceDetailContainerRenderProps {
  /** Header actions (CTAs) for PageLayout.Header when using layout pattern */
  headerActions?: React.ReactNode;
  /** Main content */
  content: React.ReactNode;
}

export interface InvoiceDetailContainerProps {
  /** Invoice ID to display */
  invoiceId: string;
  /** Render props pattern for layout composition */
  children?: (props: InvoiceDetailContainerRenderProps) => React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// HEADER ACTIONS
// ============================================================================

interface HeaderActionsProps {
  invoiceStatus: InvoiceStatus;
  nextStatusActions: InvoiceStatus[];
  isUpdatingStatus: boolean;
  hasPdf: boolean;
  isGeneratingPdf: boolean;
  isSendingReminder?: boolean;
  onUpdateStatus: (status: InvoiceStatus) => void;
  onMarkPaid: () => void;
  onMarkUnpaid: () => void;
  onSchedule: () => void;
  onSendReminder: () => void;
  onVoidConfirm: () => void;
  onRefund: () => void;
  onRestore: () => void;
  onGeneratePdf: () => void;
  onDownloadPdf: () => void;
  onPrint: () => void;
  onCreateCreditNote: () => void;
  /** When false, Back button is omitted (route provides it in leading) */
  includeBack?: boolean;
}

function HeaderActions({
  invoiceStatus,
  nextStatusActions,
  isUpdatingStatus,
  hasPdf,
  isGeneratingPdf,
  isSendingReminder = false,
  onUpdateStatus,
  onMarkPaid,
  onMarkUnpaid,
  onSchedule,
  onSendReminder,
  onVoidConfirm,
  onRefund,
  onRestore,
  onGeneratePdf,
  onDownloadPdf,
  onPrint,
  onCreateCreditNote,
  includeBack = true,
}: HeaderActionsProps) {
  const canMarkPaid = nextStatusActions.includes('paid');
  const canVoid = nextStatusActions.includes('canceled');
  const canSchedule = nextStatusActions.includes('scheduled');
  const canMarkUnpaid = nextStatusActions.includes('unpaid');
  const canRefund = nextStatusActions.includes('refunded');
  const canRestore = nextStatusActions.includes('draft');

  return (
    <div className="flex items-center gap-2">
      {includeBack && (
        <Link
          to="/financial/invoices"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back to invoices</span>
        </Link>
      )}

      {/* Primary action based on status */}
      {canMarkPaid && (
        <Button onClick={onMarkPaid} disabled={isUpdatingStatus}>
          <CheckCircle className="h-4 w-4 mr-2" />
          {isUpdatingStatus ? 'Processing...' : 'Mark as Paid'}
        </Button>
      )}

      {/* Restore action for canceled invoices */}
      {canRestore && invoiceStatus === 'canceled' && (
        <Button onClick={onRestore} disabled={isUpdatingStatus}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          {isUpdatingStatus ? 'Restoring...' : 'Restore'}
        </Button>
      )}

      {/* Status Update Dropdown - for statuses with multiple options */}
      {nextStatusActions.length > 1 && !canMarkPaid && !(canRestore && invoiceStatus === 'canceled') && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={isUpdatingStatus}>
              {isUpdatingStatus ? 'Updating...' : 'Update Status'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {nextStatusActions.map((nextStatus) => (
              <DropdownMenuItem
                key={nextStatus}
                onClick={() => onUpdateStatus(nextStatus)}
              >
                Mark as{' '}
                {INVOICE_STATUS_CONFIG[nextStatus]?.label || nextStatus}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* More Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* Schedule - for draft invoices */}
          {canSchedule ? (
            <DropdownMenuItem onClick={onSchedule} disabled={isUpdatingStatus}>
              <Clock className="h-4 w-4 mr-2" />
              Schedule
            </DropdownMenuItem>
          ) : invoiceStatus === 'draft' ? null : (
            <DisabledMenuItem disabledReason="Only draft invoices can be scheduled">
              <Clock className="h-4 w-4 mr-2" />
              Schedule
            </DisabledMenuItem>
          )}

          {/* Send Reminder */}
          {invoiceStatus === 'unpaid' || invoiceStatus === 'overdue' ? (
            <DropdownMenuItem onClick={onSendReminder} disabled={isSendingReminder}>
              {isSendingReminder ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {isSendingReminder ? 'Sending...' : 'Send Reminder'}
            </DropdownMenuItem>
          ) : (
            <DisabledMenuItem disabledReason="Can only send reminders for unpaid invoices">
              <Send className="h-4 w-4 mr-2" />
              Send Reminder
            </DisabledMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Generate or Download PDF */}
          {hasPdf ? (
            <DropdownMenuItem onClick={onDownloadPdf}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={onGeneratePdf}
              disabled={isGeneratingPdf}
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              {isGeneratingPdf ? 'Generating...' : 'Generate PDF'}
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={onPrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Mark Unpaid - for paid invoices */}
          {canMarkUnpaid ? (
            <DropdownMenuItem onClick={onMarkUnpaid} disabled={isUpdatingStatus}>
              <Undo2 className="h-4 w-4 mr-2" />
              Mark Unpaid
            </DropdownMenuItem>
          ) : invoiceStatus === 'paid' ? null : (
            <DisabledMenuItem disabledReason="Only paid invoices can be marked unpaid">
              <Undo2 className="h-4 w-4 mr-2" />
              Mark Unpaid
            </DisabledMenuItem>
          )}

          {/* Refund - for paid invoices */}
          {canRefund ? (
            <DropdownMenuItem
              onClick={onRefund}
              className="text-orange-600"
              disabled={isUpdatingStatus}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Issue Refund
            </DropdownMenuItem>
          ) : invoiceStatus === 'paid' ? null : (
            <DisabledMenuItem disabledReason="Only paid invoices can be refunded">
              <DollarSign className="h-4 w-4 mr-2" />
              Issue Refund
            </DisabledMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Create Credit Note */}
          <DropdownMenuItem onClick={onCreateCreditNote}>
            <FileText className="h-4 w-4 mr-2" />
            Create Credit Note
          </DropdownMenuItem>

          {/* Void Invoice */}
          {canVoid ? (
            <DropdownMenuItem
              onClick={onVoidConfirm}
              className="text-destructive"
              disabled={isUpdatingStatus}
            >
              <Ban className="h-4 w-4 mr-2" />
              Void Invoice
            </DropdownMenuItem>
          ) : (
            <DisabledMenuItem
              disabledReason={
                invoiceStatus === 'paid'
                  ? 'Paid invoices cannot be voided'
                  : invoiceStatus === 'canceled'
                    ? 'Invoice is already voided'
                    : invoiceStatus === 'refunded'
                      ? 'Refunded invoices cannot be voided'
                      : 'Cannot void invoice in current status'
              }
              className="text-destructive opacity-50"
            >
              <Ban className="h-4 w-4 mr-2" />
              Void Invoice
            </DisabledMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function InvoiceDetailContainer({
  invoiceId,
  children,
  className,
}: InvoiceDetailContainerProps) {
  const navigate = useNavigate();
  const detail = useInvoiceDetail(invoiceId);
  useTrackView(
    'invoice',
    detail.invoice?.id,
    detail.invoice?.invoiceNumber ?? `Invoice ${invoiceId.slice(0, 8)}`,
    detail.invoice?.customer?.name ?? undefined,
    `/financial/invoices/${invoiceId}`
  );
  useDetailBreadcrumb(
    `/financial/invoices/${invoiceId}`,
    detail.invoice ? (detail.invoice.invoiceNumber ?? invoiceId) : undefined,
    !!detail.invoice
  );
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [creditNoteDialogOpen, setCreditNoteDialogOpen] = useState(false);

  const { onLogActivity, loggerProps } = useEntityActivityLogging({
    entityType: 'order',
    entityId: invoiceId,
    entityLabel: `Invoice: ${detail.invoice?.invoiceNumber ?? invoiceId}`,
  });

  // PDF generation
  const generateInvoicePdf = useGenerateOrderInvoice();

  // Void mutation
  const voidInvoice = useVoidInvoice();

  // Credit note mutation
  const createCreditNote = useCreateCreditNote();

  const handleGeneratePdf = () => {
    generateInvoicePdf.mutate(
      { orderId: invoiceId },
      {
        onSuccess: () => {
          toastSuccess('Invoice PDF generated successfully');
          // Refetch to get the new PDF URL
          detail.refetch();
        },
        onError: (error) => {
          toastError(error.message || 'Failed to generate PDF');
        },
      }
    );
  };

  const handleVoidInvoice = () => {
    voidInvoice.mutate(
      { orderId: invoiceId },
      {
        onSuccess: () => {
          toastSuccess('Invoice voided successfully');
          setVoidDialogOpen(false);
          // Refetch to show updated status
          detail.refetch();
        },
        onError: (error) => {
          toastError(error.message || 'Failed to void invoice');
        },
      }
    );
  };

  const handleCreateCreditNote = () => {
    setCreditNoteDialogOpen(true);
  };

  const handleCreditNoteSubmit = (input: { customerId: string; orderId?: string; amount: number; reason: string }) => {
    createCreditNote.mutate(input, {
      onSuccess: (creditNote) => {
        setCreditNoteDialogOpen(false);
        // Refetch invoice to show updated balance if credit note was applied
        detail.refetch();
        toast.success('Credit note created successfully', {
          description: `Credit note ${creditNote.creditNoteNumber} is ready to issue.`,
          action: {
            label: 'View Credit Notes',
            onClick: () => navigate({ to: '/financial/credit-notes' }),
          },
        });
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to create credit note');
      },
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Loading State
  // ─────────────────────────────────────────────────────────────────────────
  if (detail.isLoading) {
    const loadingContent = <InvoiceDetailSkeleton />;
    if (children) {
      return <>{children({ headerActions: <Skeleton className="h-10 w-32" />, content: loadingContent })}</>;
    }
    return loadingContent;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Error State
  // ─────────────────────────────────────────────────────────────────────────
  if (detail.error || !detail.invoice) {
    const errorContent = (
      <ErrorState
        title="Invoice not found"
        message="The invoice you're looking for doesn't exist or has been deleted."
        onRetry={() => detail.refetch()}
        retryLabel="Try Again"
      />
    );
    if (children) {
      return <>{children({ headerActions: null, content: errorContent })}</>;
    }
    return errorContent;
  }

  // Handle null invoiceStatus - default to 'draft' for invoices without status set
  // This is valid per schema: invoiceStatus is nullable (InvoiceStatus | null)
  const invoiceStatus: InvoiceStatus = detail.invoice.invoiceStatus ?? 'draft';

  // ─────────────────────────────────────────────────────────────────────────
  // Success State
  // ─────────────────────────────────────────────────────────────────────────
  const headerActionsEl = (
    <HeaderActions
      invoiceStatus={invoiceStatus}
      nextStatusActions={detail.nextStatusActions}
      isUpdatingStatus={detail.isUpdatingStatus}
      hasPdf={!!detail.invoice.invoicePdfUrl}
      isGeneratingPdf={generateInvoicePdf.isPending}
      isSendingReminder={detail.isSendingReminder}
      onUpdateStatus={(status) => detail.actions.onUpdateStatus(status)}
      onMarkPaid={detail.actions.onMarkPaid}
      onMarkUnpaid={detail.actions.onMarkUnpaid}
      onSchedule={detail.actions.onSchedule}
      onSendReminder={detail.actions.onSendReminder}
      onVoidConfirm={() => setVoidDialogOpen(true)}
      onRefund={detail.actions.onRefund}
      onRestore={detail.actions.onRestore}
      onGeneratePdf={handleGeneratePdf}
      onDownloadPdf={detail.actions.onDownloadPdf}
      onPrint={detail.actions.onPrint}
      onCreateCreditNote={handleCreateCreditNote}
      includeBack={!children}
    />
  );

  const content = (
    <>
      <InvoiceDetailView
        invoice={detail.invoice}
        alerts={detail.alerts}
        activeTab={detail.activeTab}
        onTabChange={detail.onTabChange}
        showSidebar={detail.showSidebar}
        onToggleSidebar={detail.toggleSidebar}
        activities={detail.activities}
        activitiesLoading={detail.activitiesLoading}
        activitiesError={detail.activitiesError}
        onLogActivity={onLogActivity}
        headerActions={children ? null : headerActionsEl}
        className={className}
      />

      <EntityActivityLogger {...loggerProps} />

      {/* Void Confirmation Dialog */}
      <AlertDialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to void this invoice? This action cannot be undone. The invoice will be marked as canceled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVoidInvoice}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={voidInvoice.isPending}
            >
              {voidInvoice.isPending ? 'Voiding...' : 'Void Invoice'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Credit Note Dialog */}
      {detail.invoice && (
        <CreateCreditNoteDialog
          open={creditNoteDialogOpen}
          onOpenChange={setCreditNoteDialogOpen}
          customerId={detail.invoice.customer?.id}
          orderId={invoiceId}
          onCreate={handleCreditNoteSubmit}
          isPending={createCreditNote.isPending}
        />
      )}
    </>
  );

  if (children) {
    return <>{children({ headerActions: headerActionsEl, content })}</>;
  }

  return content;
}

export default InvoiceDetailContainer;
