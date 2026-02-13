/**
 * Credit Note Detail View (Presenter)
 *
 * Displays credit note details with status, amount, and relationships.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { ArrowLeft, FileText, User, Receipt } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { FormatAmount } from '@/components/shared/format';
import { StatusCell } from '@/components/shared/data-table';
import { CREDIT_NOTE_STATUS_CONFIG } from './credit-note-status-config';
import type { CreditNoteWithCustomer } from '@/lib/schemas/financial/credit-notes';

// ============================================================================
// TYPES
// ============================================================================

export interface CreditNoteDetailViewProps {
  creditNote: CreditNoteWithCustomer;
  headerActions?: React.ReactNode;
  /** When true, Back link is omitted (route provides it in leading) */
  hideBack?: boolean;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CreditNoteDetailView({
  creditNote,
  headerActions,
  hideBack = false,
  className,
}: CreditNoteDetailViewProps) {
  const displayNumber = creditNote.creditNoteNumber ?? `CN-${creditNote.id.slice(0, 8)}`;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {!hideBack && (
            <Link
              to="/financial/credit-notes"
              className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to credit notes</span>
            </Link>
          )}
          <div>
            <h1 className="text-2xl font-bold">{displayNumber}</h1>
            <p className="text-muted-foreground text-sm">
              Created {format(new Date(creditNote.createdAt), 'd MMM yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusCell
            status={creditNote.status}
            statusConfig={CREDIT_NOTE_STATUS_CONFIG}
            showIcon
          />
          {headerActions}
        </div>
      </div>

      {/* Main content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Details card */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Credit Note Details
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-muted-foreground text-sm">Amount</label>
              <p className="text-xl font-semibold">
                <FormatAmount amount={creditNote.amount} />
              </p>
              {creditNote.gstAmount != null && creditNote.gstAmount > 0 && (
                <p className="text-muted-foreground text-sm">
                  includes GST: <FormatAmount amount={creditNote.gstAmount ?? 0} />
                </p>
              )}
            </div>
            {creditNote.reason && (
              <div>
                <label className="text-muted-foreground text-sm">Reason</label>
                <p>{creditNote.reason}</p>
              </div>
            )}
            {creditNote.internalNotes && (
              <div>
                <label className="text-muted-foreground text-sm">Internal Notes</label>
                <p className="whitespace-pre-wrap">{creditNote.internalNotes}</p>
              </div>
            )}
            {creditNote.appliedAt && (
              <div>
                <label className="text-muted-foreground text-sm">Applied</label>
                <p>{format(new Date(creditNote.appliedAt), 'd MMM yyyy')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Related entities */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Related</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {creditNote.customer && (
              <div>
                <label className="text-muted-foreground text-sm flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Customer
                </label>
                <Link
                  to="/customers/$customerId"
                  params={{ customerId: creditNote.customer.id }}
                  search={{}}
                  className="font-medium text-primary hover:underline"
                >
                  {creditNote.customer.name}
                </Link>
              </div>
            )}
            {creditNote.order && (
              <div>
                <label className="text-muted-foreground text-sm flex items-center gap-1">
                  <Receipt className="h-4 w-4" />
                  Related Order
                </label>
                <Link
                  to="/orders/$orderId"
                  params={{ orderId: creditNote.order.id }}
                  className="font-medium text-primary hover:underline"
                >
                  {creditNote.order.orderNumber ?? creditNote.order.id.slice(0, 8)}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
