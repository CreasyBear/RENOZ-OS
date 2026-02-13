/**
 * Credit Notes List Presenter
 *
 * Unified presenter with responsive table view and empty states.
 */

import { memo, useMemo, useCallback } from 'react';
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DataTableEmpty,
  DataTableSkeleton,
} from '@/components/shared/data-table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { OrderCombobox } from '@/components/shared';
import type { OrderSummary } from '@/components/shared/order-combobox';
import { CreditNotesTablePresenter } from './credit-notes-table-presenter';
import type { CreditNoteTableItem } from './credit-note-columns';
import { DEFAULT_CREDIT_NOTE_FILTERS } from './credit-note-filter-config';
import type { CreditNoteFiltersState } from './credit-note-filter-config';

export interface CreditNotesListPresenterProps {
  /** Credit notes to display */
  creditNotes: CreditNoteTableItem[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Retry handler */
  onRetry?: () => void;
  /** Current filters */
  filters: CreditNoteFiltersState;
  /** Filter change handler */
  onFiltersChange: (filters: CreditNoteFiltersState) => void;
  /** Clear all filters */
  onClearFilters: () => void;
  /** Create credit note handler */
  onCreateCreditNote?: () => void;
  /** Selected credit note IDs */
  selectedIds: Set<string>;
  /** Whether all items are selected */
  isAllSelected: boolean;
  /** Whether some items are selected (indeterminate) */
  isPartiallySelected: boolean;
  /** Handle single item selection */
  onSelect: (id: string, checked: boolean) => void;
  /** Handle select all */
  onSelectAll: (checked: boolean) => void;
  /** Handle shift-click range selection */
  onShiftClickRange: (rowIndex: number) => void;
  /** Check if item is selected */
  isSelected: (id: string) => boolean;
  /** Current sort field */
  sortField: string;
  /** Current sort direction */
  sortDirection: 'asc' | 'desc';
  /** Sort change handler */
  onSort: (field: string) => void;
  /** Issue credit note handler */
  onIssue: (id: string) => void;
  /** Apply credit note handler (opens dialog) */
  onApply: (creditNoteId: string) => void;
  /** Void credit note handler */
  onVoid: (id: string) => void;
  /** Apply dialog state (moved to container) */
  applyDialogOpen: boolean;
  selectedCreditNoteId: string | null;
  selectedOrder: OrderSummary | null;
  onApplyDialogOpenChange: (open: boolean) => void;
  onSelectedOrderChange: (order: OrderSummary | null) => void;
  onApplySubmit: (creditNoteId: string, orderId: string) => void;
  isApplying: boolean;
  /** Generate PDF handler */
  onGeneratePdf: (id: string) => void;
  /** Whether mutations are pending */
  isMutating: boolean;
  /** Whether PDF generation is pending */
  isGeneratingPdf: boolean;
  /** Total count */
  total: number;
  /** Current page */
  page?: number;
  /** Page size */
  pageSize?: number;
  /** Page change handler */
  onPageChange?: (page: number) => void;
  /** Additional className */
  className?: string;
}

/**
 * Unified credit notes list presenter with responsive table.
 */
export const CreditNotesListPresenter = memo(function CreditNotesListPresenter({
  creditNotes,
  isLoading,
  error,
  onRetry,
  filters,
  onClearFilters,
  onCreateCreditNote,
  selectedIds,
  isAllSelected,
  isPartiallySelected,
  onSelect,
  onSelectAll,
  onShiftClickRange,
  isSelected,
  sortField,
  sortDirection,
  onSort,
  onIssue,
  onApply,
  onVoid,
  onGeneratePdf,
  isMutating,
  isGeneratingPdf,
  total,
  page,
  pageSize,
  onPageChange,
  applyDialogOpen,
  selectedCreditNoteId,
  selectedOrder,
  onApplyDialogOpenChange,
  onSelectedOrderChange,
  onApplySubmit,
  isApplying,
  className,
}: CreditNotesListPresenterProps) {
  // Handle apply click - open dialog
  const handleApplyClick = useCallback((creditNoteId: string) => {
    onApply(creditNoteId);
  }, [onApply]);

  // Handle apply submit
  const handleApplySubmit = useCallback(() => {
    if (!selectedCreditNoteId || !selectedOrder) return;
    onApplySubmit(selectedCreditNoteId, selectedOrder.id);
  }, [selectedCreditNoteId, selectedOrder, onApplySubmit]);

  // Handle apply dialog close
  const handleApplyDialogClose = useCallback((open: boolean) => {
    if (!open) {
      onSelectedOrderChange(null);
    }
    onApplyDialogOpenChange(open);
  }, [onApplyDialogOpenChange, onSelectedOrderChange]);
  // Check if filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== DEFAULT_CREDIT_NOTE_FILTERS.search ||
      filters.status !== DEFAULT_CREDIT_NOTE_FILTERS.status ||
      filters.customerId !== DEFAULT_CREDIT_NOTE_FILTERS.customerId
    );
  }, [filters]);

  // Error state
  if (error) {
    return (
      <DataTableEmpty
        variant="error"
        title="Failed to load credit notes"
        description={error.message ?? 'An unexpected error occurred'}
        action={onRetry ? { label: 'Try again', onClick: onRetry } : undefined}
        className={className}
      />
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        <DataTableSkeleton columns={Array.from({ length: 6 }, () => ({}))} rows={5} />
      </div>
    );
  }

  // Empty state
  if (creditNotes.length === 0) {
    // If filters are active, show filter empty state
    if (hasActiveFilters) {
      return (
        <DataTableEmpty
          variant="empty"
          icon={FileText}
          title="No credit notes found"
          description="No credit notes match your current search or filters."
          action={{
            label: 'Clear filters',
            onClick: onClearFilters,
          }}
          className={className}
        />
      );
    }

    // First visit / no filters - show empty state with CTA
    return (
      <DataTableEmpty
        variant="empty"
        icon={FileText}
        title="No credit notes yet"
        description={
          total === 0
            ? 'Create your first credit note to get started with refund management.'
            : 'No credit notes match your current search or filters.'
        }
        action={
          onCreateCreditNote
            ? {
                label: 'Create Credit Note',
                onClick: onCreateCreditNote,
              }
            : undefined
        }
        className={className}
      />
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <CreditNotesTablePresenter
          creditNotes={creditNotes}
          selectedIds={selectedIds}
          isAllSelected={isAllSelected}
          isPartiallySelected={isPartiallySelected}
          onSelect={onSelect}
          onSelectAll={onSelectAll}
          onShiftClickRange={onShiftClickRange}
          isSelected={isSelected}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={onSort}
          onIssue={onIssue}
          onApply={handleApplyClick}
          onVoid={onVoid}
          onGeneratePdf={onGeneratePdf}
          isMutating={isMutating}
          isGeneratingPdf={isGeneratingPdf}
        />
      </div>

      {/* Mobile: Show table with horizontal scroll for now */}
      {/* TODO: Add mobile card view if needed */}
      <div className="md:hidden overflow-x-auto">
        <CreditNotesTablePresenter
          creditNotes={creditNotes}
          selectedIds={selectedIds}
          isAllSelected={isAllSelected}
          isPartiallySelected={isPartiallySelected}
          onSelect={onSelect}
          onSelectAll={onSelectAll}
          onShiftClickRange={onShiftClickRange}
          isSelected={isSelected}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={onSort}
          onIssue={onIssue}
          onApply={handleApplyClick}
          onVoid={onVoid}
          onGeneratePdf={onGeneratePdf}
          isMutating={isMutating}
          isGeneratingPdf={isGeneratingPdf}
        />
      </div>

      {/* Pagination */}
      <Pagination
        page={page ?? 1}
        pageSize={pageSize ?? 20}
        total={total}
        onPageChange={onPageChange ?? (() => {})}
      />

      {/* Apply to Invoice Dialog */}
      <Dialog open={applyDialogOpen} onOpenChange={handleApplyDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Credit Note to Invoice</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="order">Select Order/Invoice *</Label>
              <OrderCombobox
                value={selectedOrder}
                onSelect={onSelectedOrderChange}
                placeholder="Search orders by number..."
                disabled={isApplying}
              />
              <p className="text-xs text-muted-foreground">
                Search by order number or customer name
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleApplyDialogClose(false)} disabled={isApplying}>
              Cancel
            </Button>
            <Button onClick={handleApplySubmit} disabled={isApplying || !selectedOrder}>
              {isApplying ? 'Applying...' : 'Apply Credit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

CreditNotesListPresenter.displayName = 'CreditNotesListPresenter';

/**
 * Pagination component
 */
function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-2">
      <p className="text-sm text-muted-foreground">
        Showing {start} to {end} of {total} credit notes
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="text-sm tabular-nums">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
