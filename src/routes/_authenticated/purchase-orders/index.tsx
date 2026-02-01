/**
 * Purchase Orders Index Route
 *
 * Main purchase order list page with search, filtering, and management.
 * Implements SUPP-PO-MANAGEMENT story.
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
  PODirectory,
  DEFAULT_PO_FILTERS,
  type POFiltersState,
} from '@/components/domain/purchase-orders';
import { usePurchaseOrders, useDeletePurchaseOrder } from '@/hooks/suppliers';
import type { PurchaseOrderTableData } from '@/lib/schemas/purchase-orders';
import { useConfirmation } from '@/hooks';
import {
  useTransformedFilterUrlState,
  parseDateFromUrl,
  serializeDateForUrl,
} from '@/hooks/filters/use-filter-url-state';

// ============================================================================
// URL SEARCH SCHEMA
// ============================================================================

const poSearchSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).optional().default(20),
  search: z.string().optional().default(''),
  status: z.string().optional(),
  supplierId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(['poNumber', 'orderDate', 'requiredDate', 'totalAmount', 'status', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

type POSearchParams = z.infer<typeof poSearchSchema>;

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/purchase-orders/')({
  component: PurchaseOrdersPage,
  validateSearch: poSearchSchema,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/purchase-orders" />
  ),
  pendingComponent: () => <AdminTableSkeleton />,
});

// ============================================================================
// URL FILTER TRANSFORMERS
// ============================================================================

/** Transform URL search params to POFiltersState */
const fromUrlParams = (search: POSearchParams): POFiltersState => ({
  search: search.search ?? '',
  status: search.status ? [search.status] as POFiltersState['status'] : [],
  supplierId: search.supplierId ?? null,
  dateRange: search.dateFrom || search.dateTo
    ? {
        from: parseDateFromUrl(search.dateFrom),
        to: parseDateFromUrl(search.dateTo),
      }
    : null,
  totalRange: null, // Not yet in URL schema
});

/** Transform POFiltersState to URL search params */
const toUrlParams = (filters: POFiltersState): Record<string, unknown> => ({
  search: filters.search || undefined,
  status: filters.status.length > 0 ? filters.status[0] : undefined,
  supplierId: filters.supplierId ?? undefined,
  dateFrom: filters.dateRange?.from ? serializeDateForUrl(filters.dateRange.from) : undefined,
  dateTo: filters.dateRange?.to ? serializeDateForUrl(filters.dateRange.to) : undefined,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const confirm = useConfirmation();
  const search = Route.useSearch();

  // URL-synced filter state with transformations
  const { filters, setFilters } = useTransformedFilterUrlState({
    currentSearch: search,
    navigate,
    defaults: DEFAULT_PO_FILTERS,
    fromUrlParams,
    toUrlParams,
    resetPageOnChange: ['search', 'status', 'supplierId', 'dateRange'],
  });

  // Pagination from URL
  const page = search.page;
  const pageSize = search.pageSize;
  const sortBy = search.sortBy;
  const sortOrder = search.sortOrder;

  // Fetch purchase orders using centralized hook
  const { data: ordersData, isLoading: isLoadingOrders } = usePurchaseOrders({
    page,
    pageSize,
    sortBy,
    sortOrder,
    search: filters.search || undefined,
    status: filters.status.length > 0 ? filters.status[0] : undefined,
    supplierId: filters.supplierId || undefined,
    startDate: filters.dateRange?.from?.toISOString(),
    endDate: filters.dateRange?.to?.toISOString(),
  });

  // Delete mutation using centralized hook
  const deleteMutation = useDeletePurchaseOrder();

  // Handlers
  const handleFiltersChange = useCallback((newFilters: POFiltersState) => {
    setFilters(newFilters);
  }, [setFilters]);

  const handlePageChange = useCallback((newPage: number) => {
    navigate({
      to: '.',
      search: { ...search, page: newPage },
    });
  }, [navigate, search]);

  const handleView = useCallback(
    (id: string) => {
      navigate({ to: '/purchase-orders/$poId', params: { poId: id } });
    },
    [navigate]
  );

  const handleEdit = useCallback(
    (id: string) => {
      navigate({ to: '/purchase-orders/$poId', params: { poId: id } });
    },
    [navigate]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const result = await confirm.confirm({
        title: 'Delete Purchase Order',
        description:
          'Are you sure you want to delete this purchase order? This action cannot be undone.',
        confirmLabel: 'Delete',
        variant: 'destructive',
      });

      if (result.confirmed) {
        deleteMutation.mutate(
          { id },
          {
            onSuccess: () => {
              toast.success('Purchase order deleted successfully');
            },
            onError: (error) => {
              toast.error(
                error instanceof Error ? error.message : 'Failed to delete purchase order'
              );
            },
          }
        );
      }
    },
    [deleteMutation, confirm]
  );

  const handleReceive = useCallback(
    (id: string) => {
      navigate({ to: '/purchase-orders/$poId', params: { poId: id } });
    },
    [navigate]
  );

  const handleCreate = useCallback(() => {
    navigate({ to: '/purchase-orders/create' });
  }, [navigate]);

  // Transform data for table
  const orders: PurchaseOrderTableData[] = (ordersData?.items ?? []).map((po) => ({
    id: po.id,
    poNumber: po.poNumber,
    supplierId: po.supplierId,
    supplierName: po.supplierName,
    status: po.status,
    totalAmount: Number(po.totalAmount) || 0,
    currency: po.currency || 'AUD',
    orderDate: po.orderDate ? String(po.orderDate) : null,
    requiredDate: po.requiredDate ? String(po.requiredDate) : null,
    expectedDeliveryDate: po.expectedDeliveryDate ? String(po.expectedDeliveryDate) : null,
    createdAt: String(po.createdAt),
  }));

  const pagination = {
    page,
    pageSize,
    totalItems: ordersData?.pagination?.totalItems ?? 0,
    totalPages: ordersData?.pagination?.totalPages ?? 1,
  };

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Purchase Orders"
        description="Track and manage your supplier orders"
        actions={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Order
          </Button>
        }
      />
      <PageLayout.Content>
        <PODirectory
          orders={orders}
          isLoading={isLoadingOrders}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          pagination={pagination}
          onPageChange={handlePageChange}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onReceive={handleReceive}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
