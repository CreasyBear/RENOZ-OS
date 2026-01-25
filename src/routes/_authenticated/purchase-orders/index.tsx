/**
 * Purchase Orders Index Route
 *
 * Main purchase order list page with search, filtering, and management.
 * Implements SUPP-PO-MANAGEMENT story.
 */

import { createFileRoute } from '@tanstack/react-router';
import { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { AdminTableSkeleton } from '@/components/skeletons/admin';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { PODirectory } from '@/components/domain/purchase-orders';
import { usePurchaseOrders, useDeletePurchaseOrder } from '@/hooks/suppliers';
import type {
  PurchaseOrderFiltersState,
  PurchaseOrderTableData,
} from '@/lib/schemas/purchase-orders';
import { defaultPurchaseOrderFilters } from '@/lib/schemas/purchase-orders';
import { useConfirmation } from '@/hooks';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/purchase-orders/')({
  component: PurchaseOrdersPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/purchase-orders" />
  ),
  pendingComponent: () => <AdminTableSkeleton />,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function PurchaseOrdersPage() {
  const navigate = Route.useNavigate();
  const confirm = useConfirmation();

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortBy] = useState<
    'poNumber' | 'orderDate' | 'requiredDate' | 'totalAmount' | 'status' | 'createdAt'
  >('createdAt');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter state
  const [filters, setFilters] = useState<PurchaseOrderFiltersState>(defaultPurchaseOrderFilters);

  // Fetch purchase orders using centralized hook
  const { data: ordersData, isLoading: isLoadingOrders } = usePurchaseOrders({
    page,
    pageSize,
    sortBy,
    sortOrder,
    search: filters.search || undefined,
    status: filters.status.length > 0 ? filters.status[0] : undefined,
    supplierId: filters.supplierId || undefined,
    startDate: filters.dateFrom?.toISOString(),
    endDate: filters.dateTo?.toISOString(),
  });

  // Delete mutation using centralized hook
  const deleteMutation = useDeletePurchaseOrder();

  // Handlers
  const handleFiltersChange = useCallback((newFilters: PurchaseOrderFiltersState) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handleSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

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
    <PageLayout>
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
          onSearch={handleSearch}
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
