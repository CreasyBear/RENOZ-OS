'use client';

/**
 * Invoice List Container
 *
 * ARCHITECTURE: Container Component - handles data fetching.
 * Fetches invoice data and passes to presenter.
 *
 * @source invoices from useInvoices hook
 * @source summary from useInvoiceSummary hook
 *
 * @see docs/design-system/INVOICE-STANDARDS.md
 * @see STANDARDS.md Section 3.2 (Container/Presenter Pattern)
 */

import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { useInvoices, useInvoiceSummary } from '@/hooks/invoices';
import { logger } from '@/lib/logger';
import { useBulkSendReminders, useBulkUpdateInvoiceStatus } from '@/hooks/invoices/use-bulk-invoice-operations';
import { useCustomers } from '@/hooks/customers';
import { DomainFilterBar } from '@/components/shared/filters';
import { useTableSelection, BulkActionsBar } from '@/components/shared/data-table';
import { InvoiceListPresenter } from './invoice-list-presenter';
import { InvoiceListSkeleton } from '@/components/skeletons/invoices';
import { ErrorState } from '@/components/shared/error-state';
import type { InvoiceFilter, InvoiceSummaryData } from '@/lib/schemas/invoices';
import type { InvoiceStatus } from '@/lib/constants/invoice-status';
import {
  DEFAULT_INVOICE_FILTERS,
  createInvoiceFilterConfig,
  type InvoiceFiltersState,
} from '../invoice-filter-config';
import {
  InvoiceBulkOperationsDialog,
  OPERATION_CONFIGS,
  type BulkOperationConfig,
  type InvoiceBulkOperation,
} from '../bulk/invoice-bulk-operations-dialog';

type SortField = 'createdAt' | 'dueDate' | 'total' | 'invoiceNumber' | 'customer';
type SortDirection = 'asc' | 'desc';

/**
 * Type guard for sort field validation
 */
function isValidSortField(field: string): field is SortField {
  return ['createdAt', 'dueDate', 'total', 'invoiceNumber', 'customer'].includes(field);
}

/**
 * Validate and normalize amount range
 * - Ensures min <= max (swaps if needed)
 * - Ensures amounts are non-negative
 * - Filters out NaN values
 */
function validateAmountRange(
  min: number | null | undefined,
  max: number | null | undefined
): { min: number | null; max: number | null } | null {
  // Filter out NaN and invalid values
  const validMin = typeof min === 'number' && !isNaN(min) && min >= 0 ? min : null;
  const validMax = typeof max === 'number' && !isNaN(max) && max >= 0 ? max : null;

  if (validMin === null && validMax === null) return null;
  if (validMin === null || validMax === null) {
    return { min: validMin, max: validMax };
  }
  // Ensure min <= max (swap if needed)
  if (validMin > validMax) {
    return { min: validMax, max: validMin };
  }
  return { min: validMin, max: validMax };
}

/**
 * Validate and normalize date range
 * - Ensures from <= to (swaps if needed)
 * - Filters out invalid dates
 */
function validateDateRange(
  from: Date | null | undefined,
  to: Date | null | undefined
): { from: Date | null; to: Date | null } | null {
  const validFrom = from && !isNaN(from.getTime()) ? from : null;
  const validTo = to && !isNaN(to.getTime()) ? to : null;

  if (!validFrom && !validTo) return null;
  if (!validFrom || !validTo) {
    return { from: validFrom, to: validTo };
  }
  // Ensure from <= to (swap if needed)
  if (validFrom > validTo) {
    return { from: validTo, to: validFrom };
  }
  return { from: validFrom, to: validTo };
}

// ============================================================================
// TYPES
// ============================================================================

export interface InvoiceListContainerProps {
  /** Controlled filter state (from useTransformedFilterUrlState) */
  filters: InvoiceFiltersState;
  /** Called when filters change; parent updates URL */
  onFiltersChange: (filters: InvoiceFiltersState) => void;
  /** Current page (from URL) */
  page: number;
  /** Called when page changes; parent updates URL */
  onPageChange: (page: number) => void;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

// ============================================================================
// FILTER CONVERSION HELPERS
// ============================================================================

/**
 * Validate and convert Date to ISO string, handling invalid dates
 */
function safeDateToISO(date: Date | null | undefined): string | undefined {
  if (!date) return undefined;
  const d = new Date(date);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

/**
 * Convert InvoiceFiltersState (UI format) to InvoiceFilter (query format)
 */
function convertToQueryFilters(
  filters: InvoiceFiltersState,
  page: number,
  pageSize: number,
  sortBy?: string,
  sortOrder?: 'asc' | 'desc'
): Partial<InvoiceFilter> {
  // Normalize and validate date range
  const normalizedDateRange = validateDateRange(
    filters.dateRange?.from,
    filters.dateRange?.to
  );

  // Validate and normalize amount range
  const normalizedAmountRange = validateAmountRange(
    filters.amountRange?.min,
    filters.amountRange?.max
  );

  // Validate sortBy field
  const validSortBy = sortBy && isValidSortField(sortBy) ? sortBy : undefined;
  const validSortOrder = sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : undefined;

  // Normalize search (trim and convert empty to undefined)
  const normalizedSearch = filters.search?.trim() || undefined;

  return {
    search: normalizedSearch,
    status: filters.status ?? undefined,
    customerId: filters.customerId ?? undefined,
    fromDate: safeDateToISO(normalizedDateRange?.from),
    toDate: safeDateToISO(normalizedDateRange?.to),
    minAmount: normalizedAmountRange?.min ?? undefined,
    maxAmount: normalizedAmountRange?.max ?? undefined,
    page,
    pageSize,
    sortBy: validSortBy as InvoiceFilter['sortBy'] | undefined,
    sortOrder: validSortOrder,
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function InvoiceListContainer({
  filters: filterState,
  onFiltersChange,
  page,
  onPageChange,
}: InvoiceListContainerProps) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>(() => {
    const field = filterState?.sortBy;
    return typeof field === 'string' && isValidSortField(field) ? field : 'createdAt';
  });
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    const order = filterState?.sortOrder;
    return typeof order === 'string' && (order === 'asc' || order === 'desc') ? order : 'desc';
  });
  const pageSize = 20;

  // Fetch customers for filter dropdown
  const {
    data: customersData,
    error: customersError,
    isLoading: customersLoading,
  } = useCustomers({
    search: '',
    status: 'active',
    page: 1,
    pageSize: 100, // Reasonable limit for filter dropdown
    sortBy: 'name',
    sortOrder: 'asc',
  });

  // Build dynamic filter config with customer options
  // Handle customer fetch errors gracefully - show empty options but don't break
  const filterConfig = useMemo(() => {
    const customerOptions =
      customersError || !customersData
        ? [] // Empty options if fetch fails
        : customersData.items?.map((c) => ({
            id: c.id,
            name: c.name ?? 'Unnamed Customer',
          })) ?? [];

    const config = createInvoiceFilterConfig(customerOptions);
    
    // Disable customer filter if loading or if fetch failed
    const isCustomerFilterDisabled = customersLoading || !!customersError;
    
    return {
      ...config,
      filters: config.filters.map((filter) =>
        filter.key === 'customerId'
          ? { ...filter, disabled: isCustomerFilterDisabled }
          : filter
      ),
    };
  }, [customersData, customersError, customersLoading]);

  // Map sort field names from table sort fields to query field names
  // Stable function - no dependencies needed
  const mapSortField = useCallback((field: SortField): InvoiceFilter['sortBy'] => {
    return field as InvoiceFilter['sortBy'];
  }, []);

  // Convert filter state to query format
  const queryFilters = useMemo<Partial<InvoiceFilter>>(
    () => convertToQueryFilters(filterState, page, pageSize, mapSortField(sortField), sortDirection),
    [filterState, page, pageSize, sortField, sortDirection, mapSortField]
  );

  // Fetch invoices
  const {
    data: invoicesData,
    isLoading: invoicesLoading,
    error: invoicesError,
  } = useInvoices(queryFilters);

  // Fetch summary
  const { data: summaryData } = useInvoiceSummary();

  // Selection state using shared hook
  const invoices = invoicesData?.invoices ?? [];
  const {
    selectedIds,
    selectedItems,
    isAllSelected,
    isPartiallySelected,
    lastClickedIndex,
    setLastClickedIndex,
    handleSelect,
    handleSelectAll,
    handleShiftClickRange,
    clearSelection,
    isSelected,
  } = useTableSelection({ items: invoices });

  // Bulk operations dialog state
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkOperation, setBulkOperation] = useState<BulkOperationConfig | null>(null);

  // Bulk operations mutations
  const bulkSendRemindersMutation = useBulkSendReminders();
  const bulkUpdateStatusMutation = useBulkUpdateInvoiceStatus();

  // Handle filter changes from DomainFilterBar
  // Normalize filter state to ensure consistency; parent resets page via URL
  const handleFiltersChange = useCallback((nextFilters: InvoiceFiltersState) => {
    const normalized: InvoiceFiltersState = {
      search: nextFilters.search?.trim() ?? '',
      status: nextFilters.status ?? null,
      customerId: nextFilters.customerId ?? null,
      dateRange: validateDateRange(nextFilters.dateRange?.from, nextFilters.dateRange?.to),
      amountRange: validateAmountRange(nextFilters.amountRange?.min, nextFilters.amountRange?.max),
    };
    onFiltersChange(normalized);
    clearSelection(); // Clear selection on filter change
  }, [onFiltersChange, clearSelection]);

  // Handle pagination - delegate to parent for URL sync
  const handlePageChange = useCallback((newPage: number) => {
    onPageChange(newPage);
    clearSelection(); // Clear selection on page change
  }, [onPageChange, clearSelection]);

  // Handle row click - navigate to invoice detail
  const handleViewInvoice = useCallback(
    (invoiceId: string) => {
      navigate({
        to: '/financial/invoices/$invoiceId',
        params: { invoiceId },
      });
    },
    [navigate]
  );

  // Transform summary data - extract totals subset that matches InvoiceSummaryData
  const summary: InvoiceSummaryData | null = summaryData
    ? {
        open: summaryData.totals.open,
        overdue: summaryData.totals.overdue,
        paid: summaryData.totals.paid,
      }
    : null;

  // Handle table sort changes
  const handleSortChange = useCallback((field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
    onPageChange(1); // Reset to first page on sort change
    clearSelection(); // Clear selection on sort change
  }, [onPageChange, clearSelection]);

  // Bulk operation handlers
  const openBulkDialog = useCallback(
    (operationType: 'send_reminder' | 'status_update') => {
      const config = OPERATION_CONFIGS[operationType];
      if (config) {
        setBulkOperation(config);
        setBulkDialogOpen(true);
      }
    },
    []
  );

  const handleBulkConfirm = useCallback(
    async (statusOverride?: InvoiceStatus) => {
      if (!bulkOperation) return;

      // Use selectedIds to get all selected invoice IDs (works across pages)
      const invoiceIds = Array.from(selectedIds);
      if (invoiceIds.length === 0) {
        return;
      }

      try {
        if (bulkOperation.type === 'send_reminder') {
          await bulkSendRemindersMutation.mutateAsync(invoiceIds);
          // Always clear selection and close dialog after operation completes
          clearSelection();
          setBulkDialogOpen(false);
          setBulkOperation(null);
        } else if (bulkOperation.type === 'status_update') {
          if (!statusOverride) {
            return;
          }
          await bulkUpdateStatusMutation.mutateAsync({
            invoiceIds,
            status: statusOverride,
          });
          // Always clear selection and close dialog after operation completes
          clearSelection();
          setBulkDialogOpen(false);
          setBulkOperation(null);
        }
      } catch (error) {
        logger.error('Bulk operation failed', error);
        // Don't toast here - useBulkSendReminders/useBulkUpdateInvoiceStatus onError already toasts
        // Don't clear selection on error - let user retry or manually clear
        throw error;
      }
    },
    [bulkOperation, selectedIds, clearSelection, bulkSendRemindersMutation, bulkUpdateStatusMutation]
  );

  // Convert selected items to bulk operation format for dialog display
  // Note: Uses selectedItems (current page only) for display, but handleBulkConfirm
  // uses selectedIds (all selected) for actual operations
  const bulkOperationInvoices: InvoiceBulkOperation[] = useMemo(
    () =>
      selectedItems.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        orderNumber: invoice.orderNumber,
        customerId: invoice.customer?.id ?? null,
        customerName: invoice.customer?.name ?? 'Unknown',
        total: invoice.total ?? 0,
        balanceDue: invoice.balanceDue ?? 0,
        currentStatus: invoice.invoiceStatus,
      })),
    [selectedItems]
  );

  // Error state for invoices
  if (invoicesError) {
    return (
      <div className="space-y-3">
        <DomainFilterBar
          config={filterConfig}
          filters={filterState}
          onFiltersChange={handleFiltersChange}
          defaultFilters={DEFAULT_INVOICE_FILTERS}
          resultCount={0}
        />
        <ErrorState
          title="Failed to load invoices"
          message={invoicesError.message || "There was an error loading the invoice list. Please try again."}
        />
      </div>
    );
  }

  // Extract icons from config for bulk action buttons
  const SendReminderIcon = OPERATION_CONFIGS.send_reminder.icon;
  const StatusIcon = OPERATION_CONFIGS.status_update.icon;

  return (
    <>
      <div className="space-y-3">
        <DomainFilterBar
          config={filterConfig}
          filters={filterState}
          onFiltersChange={handleFiltersChange}
          defaultFilters={DEFAULT_INVOICE_FILTERS}
          resultCount={invoicesData?.total ?? 0}
        />

        {/* Bulk Actions Bar - only show when items are selected */}
        {selectedIds.size >= 2 && (
          <BulkActionsBar selectedCount={selectedIds.size} onClear={clearSelection}>
          <Button size="sm" variant="outline" onClick={() => openBulkDialog('send_reminder')}>
            <SendReminderIcon className="h-4 w-4 mr-1" />
            Send Reminders
          </Button>
          <Button size="sm" variant="outline" onClick={() => openBulkDialog('status_update')}>
            <StatusIcon className="h-4 w-4 mr-1" />
            Update Status
          </Button>
          </BulkActionsBar>
        )}

        {invoicesLoading ? (
          <InvoiceListSkeleton />
        ) : (
          <InvoiceListPresenter
            invoices={invoices}
            summary={summary}
            total={invoicesData?.total ?? 0}
            page={invoicesData?.page ?? page}
            pageSize={invoicesData?.pageSize ?? pageSize}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            onPageChange={handlePageChange}
            onRowClick={handleViewInvoice}
            isLoading={false}
            // Selection props
            selectedIds={selectedIds}
            isAllSelected={isAllSelected}
            isPartiallySelected={isPartiallySelected}
            onSelect={handleSelect}
            onSelectAll={handleSelectAll}
            onShiftClickRange={handleShiftClickRange}
            lastClickedIndex={lastClickedIndex}
            setLastClickedIndex={setLastClickedIndex}
            isSelected={isSelected}
          />
        )}
      </div>

      {/* Bulk Operations Dialog */}
      <InvoiceBulkOperationsDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        operation={bulkOperation}
        invoices={bulkOperationInvoices}
        onConfirm={handleBulkConfirm}
        isLoading={
          bulkSendRemindersMutation.isPending || bulkUpdateStatusMutation.isPending
        }
      />
    </>
  );
}
