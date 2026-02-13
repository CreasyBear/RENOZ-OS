/* eslint-disable react-refresh/only-export-components -- Container exports component + constants */
/**
 * Credit Notes List Container
 *
 * Handles data fetching, selection state, filters, and mutations
 * for the credit notes list.
 *
 * @source creditNotes from useCreditNotes hook
 * @source selection from useTableSelection hook
 * @source mutations from useCreateCreditNote, useIssueCreditNote, etc.
 */

import { useCallback, useMemo, useState } from 'react';
import { z } from 'zod';
import { useNavigate } from '@tanstack/react-router';
import { toastSuccess, toastError, useConfirmation } from '@/hooks';
import {
  useCreditNotes,
  useCreateCreditNote,
  useIssueCreditNote,
  useApplyCreditNote,
  useVoidCreditNote,
  useGenerateCreditNotePdf,
} from '@/hooks/financial';
import { useTableSelection } from '@/components/shared/data-table';
import { DomainFilterBar } from '@/components/shared/filters';
import { CreditNotesListPresenter } from './credit-notes-list-presenter';
import {
  DEFAULT_CREDIT_NOTE_FILTERS,
  createCreditNoteFilterConfig,
} from './credit-note-filter-config';
import type { CreditNoteFiltersState } from './credit-note-filter-config';
import { useCustomers } from '@/hooks/customers';
import type { CreditNoteListQuery } from '@/lib/schemas/financial/credit-notes';
import type { CreditNoteTableItem } from './credit-note-columns';
import { queryKeys } from '@/lib/query-keys';
import { useQueryClient } from '@tanstack/react-query';
import type { OrderSummary } from '@/components/shared';

const DISPLAY_PAGE_SIZE = 20;

export interface CreditNotesListContainerProps {
  filters: CreditNoteFiltersState;
  onFiltersChange: (filters: CreditNoteFiltersState) => void;
  /** Callbacks for actions - parent route owns the UI */
  onCreateCreditNote?: () => void;
  onRefresh?: () => void;
}

const sortFieldValues = ['createdAt', 'amount', 'status'] as const; // Server doesn't support creditNoteNumber sorting
const sortFieldSchema = z.enum(sortFieldValues);
type SortField = z.infer<typeof sortFieldSchema>;

export function buildCreditNoteQuery(
  filters: CreditNoteFiltersState
): Pick<CreditNoteListQuery, 'search' | 'status' | 'customerId'> {
  return {
    search: filters.search || undefined,
    status: filters.status ?? undefined,
    customerId: filters.customerId ?? undefined,
  };
}

export function CreditNotesListContainer({
  filters,
  onFiltersChange,
  onCreateCreditNote,
}: CreditNotesListContainerProps) {
  const confirmation = useConfirmation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Apply dialog state (moved from presenter per container/presenter pattern)
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [selectedCreditNoteId, setSelectedCreditNoteId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null);

  const queryFilters = useMemo<CreditNoteListQuery>(
    () => ({
      ...buildCreditNoteQuery(filters),
      page,
      pageSize: DISPLAY_PAGE_SIZE,
      sortBy: sortField,
      sortOrder: sortDirection,
    }),
    [filters, page, sortField, sortDirection]
  );

  const {
    data: creditNotesData,
    isLoading,
    error,
    refetch: refetchCreditNotes,
  } = useCreditNotes(queryFilters);

  // Fetch customers for filter dropdown (limited to active customers)
  const { data: customersData } = useCustomers({
    search: '',
    status: 'active',
    page: 1,
    pageSize: 100, // Reasonable limit for filter dropdown
    sortBy: 'name',
    sortOrder: 'asc',
  });

  // Build dynamic filter config with customer options
  const filterConfig = useMemo(
    () =>
      createCreditNoteFilterConfig(
        customersData?.items?.map((c) => ({ id: c.id, name: c.name ?? 'Unnamed Customer' })) ?? []
      ),
    [customersData]
  );

  // Credit notes - type is already correct from server function
  const creditNotes = useMemo<CreditNoteTableItem[]>(
    () => creditNotesData?.items ?? [],
    [creditNotesData]
  );
  const total = creditNotesData?.total ?? 0;

  // Selection state using shared hook
  const {
    selectedIds,
    selectedItems: _selectedItems,
    isAllSelected,
    isPartiallySelected,
    lastClickedIndex,
    setLastClickedIndex,
    handleSelect,
    handleSelectAll,
    handleShiftClickRange,
    clearSelection,
    isSelected,
  } = useTableSelection({ items: creditNotes });

  // Mutations
  const createMutation = useCreateCreditNote();
  const issueMutation = useIssueCreditNote();
  const applyMutation = useApplyCreditNote();
  const voidMutation = useVoidCreditNote();
  const generatePdfMutation = useGenerateCreditNotePdf();

  // Combined pending state
  const isMutating =
    createMutation.isPending ||
    issueMutation.isPending ||
    applyMutation.isPending ||
    voidMutation.isPending;

  // Handle sort toggle
  const handleSort = useCallback(
    (field: string) => {
      const parsed = sortFieldSchema.safeParse(field);
      if (!parsed.success) return; // Ignore invalid sort fields

      const validField = parsed.data;
      setSortField((currentField) => {
        if (currentField === validField) {
          // Toggle direction
          setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
          return currentField;
        }
        // New field, default to descending for dates/numbers, ascending for text
        setSortDirection(
          ['createdAt', 'amount'].includes(validField) ? 'desc' : 'asc'
        );
        return validField;
      });
      setPage(1); // Reset to first page on sort change
    },
    []
  );

  // Handle issue credit note
  const handleIssue = useCallback(
    (id: string) => {
      issueMutation.mutate(id, {
        onSuccess: () => {
          toastSuccess('Credit note issued successfully');
          refetchCreditNotes();
        },
        onError: (error) => {
          toastError(error.message || 'Failed to issue credit note');
        },
      });
    },
    [issueMutation, refetchCreditNotes]
  );

  // Handle apply click - open dialog
  const handleApplyClick = useCallback((creditNoteId: string) => {
    setSelectedCreditNoteId(creditNoteId);
    setApplyDialogOpen(true);
  }, []);

  // Handle apply dialog close
  const handleApplyDialogClose = useCallback((open: boolean) => {
    if (!open) {
      setSelectedOrder(null);
      setSelectedCreditNoteId(null);
    }
    setApplyDialogOpen(open);
  }, []);

  // Handle apply credit note (orderId comes from dialog)
  const handleApply = useCallback(
    (creditNoteId: string, orderId: string) => {
      applyMutation.mutate(
        { creditNoteId, orderId },
        {
          onSuccess: () => {
            // Close dialog on success
            setApplyDialogOpen(false);
            setSelectedCreditNoteId(null);
            setSelectedOrder(null);
            
            // Invalidate both credit notes and the affected order
            queryClient.invalidateQueries({ queryKey: queryKeys.financial.creditNotes() });
            queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
            
            toastSuccess('Credit note applied successfully', {
              description: 'Invoice balance has been updated.',
              action: {
                label: 'View Invoice',
                onClick: () => {
                  navigate({ to: '/orders/$orderId', params: { orderId } });
                },
              },
            });
            refetchCreditNotes();
          },
          onError: (error) => {
            toastError(error.message || 'Failed to apply credit note');
            // Keep dialog open on error so user can retry
          },
        }
      );
    },
    [applyMutation, refetchCreditNotes, queryClient, navigate]
  );

  // Handle void credit note with confirmation
  const handleVoid = useCallback(
    async (id: string) => {
      const creditNote = creditNotes.find((cn) => cn.id === id);
      const { confirmed, reason } = await confirmation.confirm({
        title: 'Void Credit Note',
        description: `Are you sure you want to void credit note ${creditNote?.creditNoteNumber ?? id}? This action cannot be undone.`,
        confirmLabel: 'Void',
        variant: 'destructive',
        requireReason: true,
        reasonLabel: 'Void Reason',
        reasonPlaceholder: 'Please provide a reason for voiding this credit note...',
      });
      if (!confirmed || !reason) return;

      voidMutation.mutate(
        { id, voidReason: reason },
        {
          onSuccess: () => {
            toastSuccess('Credit note voided successfully');
            refetchCreditNotes();
          },
          onError: (error) => {
            toastError(error.message || 'Failed to void credit note');
          },
        }
      );
    },
    [voidMutation, creditNotes, confirmation, refetchCreditNotes]
  );

  // Handle PDF generation
  const handleGeneratePdf = useCallback(
    (id: string) => {
      generatePdfMutation.mutate(id, {
        onSuccess: (result) => {
          // Create download link and trigger download
          const link = document.createElement('a');
          link.href = result.url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          toastSuccess('Credit note PDF generated successfully', {
            description: 'PDF download started.',
          });
        },
        onError: (error) => {
          toastError(error.message || 'Failed to generate PDF');
        },
      });
    },
    [generatePdfMutation]
  );

  // Shared filter change handler
  const handleFiltersChange = useCallback(
    (nextFilters: CreditNoteFiltersState) => {
      setPage(1);
      clearSelection();
      onFiltersChange(nextFilters);
    },
    [onFiltersChange, clearSelection]
  );

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    handleFiltersChange(DEFAULT_CREDIT_NOTE_FILTERS);
  }, [handleFiltersChange]);

  return (
    <>
      <div className="space-y-3">
        {/* Filter Bar */}
              <DomainFilterBar<CreditNoteFiltersState>
                filters={filters}
                onFiltersChange={handleFiltersChange}
                config={filterConfig}
                defaultFilters={DEFAULT_CREDIT_NOTE_FILTERS}
                resultCount={total}
              />

        {/* List Presenter */}
        <CreditNotesListPresenter
          creditNotes={creditNotes}
          isLoading={isLoading}
          error={error instanceof Error ? error : error ? new Error('Unknown error') : null}
          onRetry={() => refetchCreditNotes()}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
          onCreateCreditNote={onCreateCreditNote}
          selectedIds={selectedIds}
          isAllSelected={isAllSelected}
          isPartiallySelected={isPartiallySelected}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
          onShiftClickRange={(rowIndex) => {
            if (lastClickedIndex !== null) {
              handleShiftClickRange(lastClickedIndex, rowIndex);
            }
            setLastClickedIndex(rowIndex);
          }}
          isSelected={isSelected}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          onIssue={handleIssue}
          onApply={handleApplyClick}
          onVoid={handleVoid}
          onGeneratePdf={handleGeneratePdf}
          isMutating={isMutating}
          isGeneratingPdf={generatePdfMutation.isPending}
          total={total}
          page={page}
          pageSize={DISPLAY_PAGE_SIZE}
          onPageChange={setPage}
          // Apply dialog props (moved to container)
          applyDialogOpen={applyDialogOpen}
          selectedCreditNoteId={selectedCreditNoteId}
          selectedOrder={selectedOrder}
          onApplyDialogOpenChange={handleApplyDialogClose}
          onSelectedOrderChange={setSelectedOrder}
          onApplySubmit={handleApply}
          isApplying={applyMutation.isPending}
        />
      </div>
    </>
  );
}
