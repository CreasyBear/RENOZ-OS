/**
 * Supplier Detail Route
 *
 * Shows the supplier detail view with contact info, performance metrics,
 * purchase orders, and price agreements.
 *
 * @see SUPP-SUPPLIER-DETAIL story
 */
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { ArrowLeft, Edit, Trash2, MoreHorizontal, FileText, Package } from 'lucide-react';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { AdminTableSkeleton } from '@/components/skeletons/admin';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SupplierDetail } from '@/components/domain/suppliers/supplier-detail';
import { useSupplier, useDeleteSupplier } from '@/hooks/suppliers';
import { useConfirmation } from '@/hooks';
import { toast } from '@/lib/toast';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/suppliers/$supplierId')({
  component: SupplierDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/suppliers" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <AdminTableSkeleton />
    </PageLayout>
  ),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function SupplierDetailPage() {
  const { supplierId } = Route.useParams();
  const navigate = useNavigate();
  const confirm = useConfirmation();

  // Fetch supplier using centralized hook
  const {
    data: supplier,
    isLoading,
    error,
  } = useSupplier(supplierId);

  // Delete mutation
  const deleteMutation = useDeleteSupplier();

  // Handle delete
  const handleDelete = async () => {
    const result = await confirm.confirm({
      title: 'Delete Supplier',
      description:
        'Are you sure you want to delete this supplier? This action cannot be undone and will affect any associated purchase orders.',
      confirmLabel: 'Delete',
      variant: 'destructive',
    });

    if (result.confirmed) {
      deleteMutation.mutate(
        { data: { id: supplierId } },
        {
          onSuccess: () => {
            toast.success('Supplier deleted successfully');
            navigate({ to: '/suppliers' });
          },
          onError: (err) => {
            toast.error(err instanceof Error ? err.message : 'Failed to delete supplier');
          },
        }
      );
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Header title="Loading..." />
        <PageLayout.Content>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
            <Skeleton className="h-64" />
          </div>
        </PageLayout.Content>
      </PageLayout>
    );
  }

  // Error state
  if (error || !supplier) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Header title="Supplier Not Found" />
        <PageLayout.Content>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              The supplier you're looking for doesn't exist or you don't have access.
            </p>
            <Button variant="outline" onClick={() => navigate({ to: '/suppliers' })}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </PageLayout.Content>
      </PageLayout>
    );
  }

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title={supplier.name}
        description={
          <span className="text-muted-foreground">
            {supplier.supplierCode} · {supplier.status}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/suppliers">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/suppliers/$supplierId/edit" params={{ supplierId }}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    navigate({ to: '/purchase-orders', search: { supplierId } })
                  }
                >
                  <Package className="mr-2 h-4 w-4" />
                  View Purchase Orders
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    navigate({ to: '/purchase-orders/create', search: { supplierId } })
                  }
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Create Purchase Order
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Supplier
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />
      <PageLayout.Content>
        <SupplierDetail
          supplier={supplier as Parameters<typeof SupplierDetail>[0]['supplier']}
          isLoading={isLoading}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
