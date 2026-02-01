/**
 * Suppliers Index Route
 *
 * Main supplier directory page with search, filtering, and management.
 * Implements SUPP-SUPPLIER-DIRECTORY story.
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { Plus } from 'lucide-react';
import { z } from 'zod';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { AdminTableSkeleton } from '@/components/skeletons/admin';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import {
  SupplierDirectory,
  type SupplierTableData,
  DEFAULT_SUPPLIER_FILTERS,
  type SupplierFiltersState,
} from '@/components/domain/suppliers';
import { useSuppliers, useDeleteSupplier } from '@/hooks/suppliers';
import { useConfirmation } from '@/hooks';
import { useTransformedFilterUrlState } from '@/hooks/filters/use-filter-url-state';

// ============================================================================
// URL SEARCH SCHEMA
// ============================================================================

const supplierSearchSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).optional().default(20),
  search: z.string().optional().default(''),
  status: z.string().optional(),
  supplierType: z.string().optional(),
  ratingMin: z.coerce.number().optional(),
  ratingMax: z.coerce.number().optional(),
  sortBy: z.enum(['name', 'status', 'overallRating', 'createdAt', 'lastOrderDate']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

type SupplierSearchParams = z.infer<typeof supplierSearchSchema>;

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/suppliers/')({
  component: SuppliersPage,
  validateSearch: supplierSearchSchema,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/suppliers" />
  ),
  pendingComponent: () => <AdminTableSkeleton />,
});

// ============================================================================
// URL FILTER TRANSFORMERS
// ============================================================================

/** Transform URL search params to SupplierFiltersState */
const fromUrlParams = (search: SupplierSearchParams): SupplierFiltersState => ({
  search: search.search ?? '',
  status: search.status ? [search.status] as SupplierFiltersState['status'] : [],
  supplierType: search.supplierType ? [search.supplierType] as SupplierFiltersState['supplierType'] : [],
  ratingRange: search.ratingMin !== undefined || search.ratingMax !== undefined
    ? { min: search.ratingMin ?? null, max: search.ratingMax ?? null }
    : null,
});

/** Transform SupplierFiltersState to URL search params */
const toUrlParams = (filters: SupplierFiltersState): Record<string, unknown> => ({
  search: filters.search || undefined,
  status: filters.status.length > 0 ? filters.status[0] : undefined,
  supplierType: filters.supplierType.length > 0 ? filters.supplierType[0] : undefined,
  ratingMin: filters.ratingRange?.min ?? undefined,
  ratingMax: filters.ratingRange?.max ?? undefined,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function SuppliersPage() {
  const navigate = useNavigate();
  const confirm = useConfirmation();
  const search = Route.useSearch();

  // URL-synced filter state with transformations
  const { filters, setFilters } = useTransformedFilterUrlState({
    currentSearch: search,
    navigate,
    defaults: DEFAULT_SUPPLIER_FILTERS,
    fromUrlParams,
    toUrlParams,
    resetPageOnChange: ['search', 'status', 'supplierType', 'ratingRange'],
  });

  // Pagination from URL
  const page = search.page;
  const pageSize = search.pageSize;
  const sortBy = search.sortBy;
  const sortOrder = search.sortOrder;

  // Fetch suppliers using centralized hook
  const { data: suppliersData, isLoading: isLoadingSuppliers } = useSuppliers({
    page,
    pageSize,
    sortBy,
    sortOrder,
    search: filters.search || undefined,
    status: filters.status.length > 0 ? filters.status[0] : undefined,
    supplierType: filters.supplierType.length > 0 ? filters.supplierType[0] : undefined,
    ratingMin: filters.ratingRange?.min ?? undefined,
    ratingMax: filters.ratingRange?.max ?? undefined,
  });

  // Delete mutation using centralized hook
  const deleteMutation = useDeleteSupplier();

  // Handlers
  const handleFiltersChange = useCallback((newFilters: SupplierFiltersState) => {
    setFilters(newFilters);
  }, [setFilters]);

  const handlePageChange = useCallback((newPage: number) => {
    navigate({
      to: '.',
      search: { ...search, page: newPage },
    });
  }, [navigate, search]);

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

  const handleEdit = useCallback(
    (id: string) => {
      navigate({ to: '/suppliers/$supplierId', params: { supplierId: id } });
    },
    [navigate]
  );

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
        <SupplierDirectory
          suppliers={suppliers}
          isLoading={isLoadingSuppliers}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          pagination={pagination}
          onPageChange={handlePageChange}
          onDelete={handleDelete}
          onEdit={handleEdit}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
