/**
 * Suppliers Index Route
 *
 * Main supplier directory page with search, filtering, and management.
 * Implements SUPP-SUPPLIER-DIRECTORY story.
 */

import { createFileRoute } from '@tanstack/react-router';
import { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { AdminTableSkeleton } from '@/components/skeletons/admin';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { SupplierDirectory, type SupplierTableData } from '@/components/domain/suppliers';
import { useSuppliers, useDeleteSupplier } from '@/hooks/suppliers';
import type { SupplierFiltersState } from '@/lib/schemas/suppliers';
import { useConfirmation } from '@/hooks/use-confirmation';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/suppliers/')({
  component: SuppliersPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/suppliers" />
  ),
  pendingComponent: () => <AdminTableSkeleton />,
});

// ============================================================================
// DEFAULT FILTERS
// ============================================================================

const defaultFilters: SupplierFiltersState = {
  search: '',
  status: [],
  supplierType: [],
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function SuppliersPage() {
  const navigate = Route.useNavigate();
  const confirm = useConfirmation();

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortBy] = useState<'name' | 'status' | 'overallRating' | 'createdAt' | 'lastOrderDate'>(
    'name'
  );
  const [sortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter state
  const [filters, setFilters] = useState<SupplierFiltersState>(defaultFilters);

  // Fetch suppliers using centralized hook
  const { data: suppliersData, isLoading: isLoadingSuppliers } = useSuppliers({
    page,
    pageSize,
    sortBy,
    sortOrder,
    search: filters.search || undefined,
    status: filters.status.length > 0 ? filters.status[0] : undefined,
    supplierType: filters.supplierType.length > 0 ? filters.supplierType[0] : undefined,
    ratingMin: filters.ratingMin,
    ratingMax: filters.ratingMax,
  });

  // Delete mutation using centralized hook
  const deleteMutation = useDeleteSupplier();

  // Handlers
  const handleFiltersChange = useCallback((newFilters: SupplierFiltersState) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page on filter change
  }, []);

  const handleSearch = useCallback((search: string) => {
    setFilters((prev: SupplierFiltersState) => ({ ...prev, search }));
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      const result = await confirm.confirm({
        title: 'Delete Supplier',
        description: 'Are you sure you want to delete this supplier? This action cannot be undone.',
        confirmLabel: 'Delete',
        variant: 'destructive',
      });

      if (result.confirmed) {
        deleteMutation.mutate(
          { data: { id } },
          {
            onSuccess: () => {
              toast.success('Supplier deleted successfully');
            },
            onError: (error) => {
              toast.error(error instanceof Error ? error.message : 'Failed to delete supplier');
            },
          }
        );
      }
    },
    [deleteMutation, confirm]
  );

  // TODO: Implement supplier detail route at src/routes/_authenticated/suppliers/$supplierId.tsx
  // const handleEdit = useCallback(
  //   (id: string) => {
  //     navigate({ to: '/suppliers/$supplierId', params: { supplierId: id } });
  //   },
  //   [navigate]
  // );

  // Transform data for table
  const suppliers: SupplierTableData[] = (suppliersData?.items ?? []).map((supplier) => ({
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
  }));

  const pagination = {
    page,
    pageSize,
    totalItems: suppliersData?.pagination?.totalItems ?? 0,
    totalPages: suppliersData?.pagination?.totalPages ?? 1,
  };

  return (
    <PageLayout>
      <PageLayout.Header
        title="Suppliers"
        description="Manage your supplier relationships"
        actions={
          <Button onClick={() => navigate({ to: '/suppliers' })}>
            <Plus className="mr-2 h-4 w-4" />
            Add Supplier
          </Button>
        }
      />
      <PageLayout.Content>
        <SupplierDirectory
          suppliers={suppliers}
          isLoading={isLoadingSuppliers}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearch={handleSearch}
          pagination={pagination}
          onPageChange={handlePageChange}
          onDelete={handleDelete}
          // onEdit={handleEdit} // TODO: Re-enable once $supplierId route exists
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
