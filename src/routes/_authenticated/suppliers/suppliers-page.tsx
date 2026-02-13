/**
 * Suppliers Page Component
 *
 * Main supplier directory page with search, filtering, and management.
 * Implements SUPP-SUPPLIER-DIRECTORY story.
 *
 * Uses SuppliersListPresenter with URL-synced sort, filters, and pagination.
 * Follows Purchase Orders pattern for data ownership and presenter composition.
 *
 * @source suppliers from useSuppliers hook
 * @source deleteMutation from useDeleteSupplier hook
 * @source filters from useTransformedFilterUrlState hook
 *
 * @see src/routes/_authenticated/suppliers/index.tsx - Route definition
 */

import { useNavigate } from '@tanstack/react-router';
import { useCallback, useMemo } from 'react';
import { Plus, Trash2, CheckCircle, Ban } from 'lucide-react';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { DomainFilterBar } from '@/components/shared/filters';
import { BulkActionsBar } from '@/components/shared/data-table';
import { toastSuccess, toastError, useConfirmation } from '@/hooks';
import { confirmations } from '@/hooks/_shared/use-confirmation';
import {
  SuppliersListPresenter,
  SUPPLIER_FILTER_CONFIG,
  DEFAULT_SUPPLIER_FILTERS,
  type SupplierFiltersState,
} from '@/components/domain/suppliers';
import { useTableSelection } from '@/components/shared/data-table';
import { useSuppliers, useDeleteSupplier, useUpdateSupplier } from '@/hooks/suppliers';
import { useTransformedFilterUrlState } from '@/hooks/filters/use-filter-url-state';
import type { supplierSearchSchema } from './index';
import type { z } from 'zod';
import {
  type SupplierTableItem,
  isSupplierSortField,
} from '@/lib/schemas/suppliers';

type SupplierSearchParams = z.infer<typeof supplierSearchSchema>;

/** Transform URL search params to SupplierFiltersState */
const fromUrlParams = (search: SupplierSearchParams): SupplierFiltersState => ({
  search: search.search ?? '',
  status: search.status ? (search.status as SupplierFiltersState['status']) : null,
  supplierType: search.supplierType ? (search.supplierType as SupplierFiltersState['supplierType']) : null,
  ratingRange:
    search.ratingMin !== undefined || search.ratingMax !== undefined
      ? { min: search.ratingMin ?? null, max: search.ratingMax ?? null }
      : null,
});

/** Transform SupplierFiltersState to URL search params */
const toUrlParams = (filters: SupplierFiltersState): Record<string, unknown> => ({
  search: filters.search || undefined,
  status: filters.status ?? undefined,
  supplierType: filters.supplierType ?? undefined,
  ratingMin: filters.ratingRange?.min ?? undefined,
  ratingMax: filters.ratingRange?.max ?? undefined,
});

interface SuppliersPageProps {
  search: SupplierSearchParams;
}

export default function SuppliersPage({ search }: SuppliersPageProps) {
  const navigate = useNavigate();
  const confirm = useConfirmation();

  // URL-synced filter state with transformations
  const { filters, setFilters } = useTransformedFilterUrlState({
    currentSearch: search,
    navigate,
    defaults: DEFAULT_SUPPLIER_FILTERS,
    fromUrlParams,
    toUrlParams,
    resetPageOnChange: ['search', 'status', 'supplierType', 'ratingRange'],
  });

  // Pagination and sort from URL
  const page = search.page;
  const pageSize = search.pageSize;
  const sortBy = search.sortBy;
  const sortOrder = search.sortOrder;

  // Fetch suppliers using centralized hook
  const {
    data: suppliersData,
    isLoading: isLoadingSuppliers,
    error: suppliersError,
    refetch,
  } = useSuppliers({
    page,
    pageSize,
    sortBy,
    sortOrder,
    search: filters.search || undefined,
    status: filters.status ?? undefined,
    supplierType: filters.supplierType ?? undefined,
    ratingMin: filters.ratingRange?.min ?? undefined,
    ratingMax: filters.ratingRange?.max ?? undefined,
  });

  // Transform data for table
  const suppliers: SupplierTableItem[] = useMemo(
    () =>
      (suppliersData?.items ?? []).map((supplier) => ({
        id: supplier.id,
        supplierCode: supplier.supplierCode,
        name: supplier.name,
        email: supplier.email,
        phone: supplier.phone,
        status: supplier.status,
        supplierType: supplier.supplierType,
        overallRating: supplier.overallRating,
        totalPurchaseOrders: supplier.totalPurchaseOrders,
        leadTimeDays: supplier.leadTimeDays,
        lastOrderDate: supplier.lastOrderDate,
      })),
    [suppliersData?.items]
  );

  const total = suppliersData?.pagination?.totalItems ?? 0;

  // Selection state using shared hook
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
  } = useTableSelection({ items: suppliers });

  // Mutations
  const deleteMutation = useDeleteSupplier();
  const updateMutation = useUpdateSupplier();

  // Handlers
  const handleFiltersChange = useCallback(
    (newFilters: SupplierFiltersState) => {
      clearSelection();
      setFilters(newFilters);
    },
    [setFilters, clearSelection]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      navigate({
        to: '.',
        search: { ...search, page: newPage },
      });
    },
    [navigate, search]
  );

  const handleSortChange = useCallback(
    (field: string) => {
      const safeField = isSupplierSortField(field) ? field : sortBy;
      const newDirection =
        safeField === sortBy && sortOrder === 'asc' ? 'desc' : 'asc';
      navigate({
        to: '.',
        search: { ...search, sortBy: safeField, sortOrder: newDirection, page: 1 },
      });
    },
    [navigate, search, sortBy, sortOrder]
  );

  const handleViewSupplier = useCallback(
    (supplierId: string) => {
      navigate({
        to: '/suppliers/$supplierId',
        params: { supplierId },
      });
    },
    [navigate]
  );

  const handleEditSupplier = useCallback(
    (supplierId: string) => {
      navigate({
        to: '/suppliers/$supplierId/edit',
        params: { supplierId },
      });
    },
    [navigate]
  );

  const handleDeleteSupplier = useCallback(
    async (id: string) => {
      const supplier = suppliers.find((s) => s.id === id);
      const { confirmed } = await confirm.confirm({
        ...confirmations.delete(supplier?.name ?? 'this supplier', 'supplier'),
      });
      if (!confirmed) return;

      try {
        await deleteMutation.mutateAsync({ data: { id } });
        toastSuccess('Supplier deleted successfully', {
          action: {
            label: 'Add Supplier',
            onClick: () => navigate({ to: '/suppliers/create' }),
          },
        });
      } catch (error) {
        toastError(
          error instanceof Error ? error.message : 'Failed to delete supplier'
        );
      }
    },
    [deleteMutation, confirm, navigate, suppliers]
  );

  // Bulk action handlers
  const handleBulkDelete = useCallback(async () => {
    const count = selectedItems.length;
    const { confirmed } = await confirm.confirm({
      title: `Delete ${count} supplier${count > 1 ? 's' : ''}?`,
      description: `This will permanently delete the selected supplier${count > 1 ? 's' : ''}. This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'destructive',
    });
    if (!confirmed) return;

    try {
      await Promise.all(
        selectedItems.map((s) => deleteMutation.mutateAsync({ data: { id: s.id } }))
      );
      toastSuccess(`Deleted ${count} supplier${count > 1 ? 's' : ''}`, {
        action: {
          label: 'Add Supplier',
          onClick: () => navigate({ to: '/suppliers/create' }),
        },
      });
      clearSelection();
    } catch (error) {
      toastError(
        error instanceof Error ? error.message : 'Failed to delete some suppliers'
      );
    }
  }, [selectedItems, confirm, deleteMutation, clearSelection, navigate]);

  const handleBulkStatusUpdate = useCallback(
    async (status: 'active' | 'inactive') => {
      if (selectedItems.length === 0) return;

      try {
        await Promise.all(
          selectedItems.map((s) =>
            updateMutation.mutateAsync({ data: { id: s.id, status } })
          )
        );
        toastSuccess(
          `${status === 'active' ? 'Activated' : 'Deactivated'} ${selectedItems.length} supplier${
            selectedItems.length > 1 ? 's' : ''
          }`
        );
        clearSelection();
      } catch (error) {
        toastError(
          error instanceof Error ? error.message : 'Failed to update supplier status'
        );
      }
    },
    [selectedItems, updateMutation, clearSelection]
  );

  // Shift-click range handler that updates lastClickedIndex
  const handleShiftClickRangeWithIndex = useCallback(
    (rowIndex: number) => {
      if (lastClickedIndex !== null) {
        handleShiftClickRange(lastClickedIndex, rowIndex);
      }
      setLastClickedIndex(rowIndex);
    },
    [lastClickedIndex, handleShiftClickRange, setLastClickedIndex]
  );

  // Single select handler that updates lastClickedIndex
  const handleSelectWithIndex = useCallback(
    (id: string, checked: boolean) => {
      handleSelect(id, checked);
      const idx = suppliers.findIndex((s) => s.id === id);
      if (idx !== -1) {
        setLastClickedIndex(idx);
      }
    },
    [handleSelect, suppliers, setLastClickedIndex]
  );

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Suppliers"
        description="Manage your supplier relationships"
        actions={
          <Button onClick={() => navigate({ to: '/suppliers/create' })}>
            <Plus className="mr-2 h-4 w-4" />
            Add Supplier
          </Button>
        }
      />
      <PageLayout.Content>
        <div className="space-y-4">
          <DomainFilterBar<SupplierFiltersState>
            config={SUPPLIER_FILTER_CONFIG}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            defaultFilters={DEFAULT_SUPPLIER_FILTERS}
          />

          <BulkActionsBar
            selectedCount={selectedItems.length}
            onClear={clearSelection}
          >
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkStatusUpdate('active')}
            >
              <CheckCircle className="mr-1 h-4 w-4" />
              Activate
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkStatusUpdate('inactive')}
            >
              <Ban className="mr-1 h-4 w-4" />
              Deactivate
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkDelete}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          </BulkActionsBar>

          <SuppliersListPresenter
            suppliers={suppliers}
            isLoading={isLoadingSuppliers}
            error={suppliersError instanceof Error ? suppliersError : null}
            selectedIds={selectedIds}
            isAllSelected={isAllSelected}
            isPartiallySelected={isPartiallySelected}
            onSelect={handleSelectWithIndex}
            onSelectAll={handleSelectAll}
            onShiftClickRange={handleShiftClickRangeWithIndex}
            isSelected={isSelected}
            sortField={sortBy}
            sortDirection={sortOrder}
            onSort={handleSortChange}
            onViewSupplier={handleViewSupplier}
            onEditSupplier={handleEditSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={handlePageChange}
            onRetry={() => refetch()}
          />
        </div>
      </PageLayout.Content>
    </PageLayout>
  );
}
