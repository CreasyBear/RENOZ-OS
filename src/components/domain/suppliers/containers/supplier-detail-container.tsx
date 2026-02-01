/**
 * Supplier Detail Container
 *
 * Handles data fetching, mutations, and state management for supplier detail view.
 * Implements render props pattern for flexible header/action composition.
 *
 * @source supplier from useSupplier hook
 * @source activities from useUnifiedActivities hook
 * @source purchaseOrders from usePurchaseOrders hook
 *
 * @see STANDARDS.md - Container/Presenter pattern
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Edit,
  Printer,
  MoreHorizontal,
  XCircle,
  Building2,
  Package,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ErrorState } from '@/components/shared/error-state';
import { cn } from '@/lib/utils';
import { toastSuccess, toastError } from '@/hooks';
import {
  useSupplier,
  useDeleteSupplier,
  usePurchaseOrders,
} from '@/hooks/suppliers';
import { useUnifiedActivities } from '@/hooks/activities';
import { SupplierDetailView } from '../views/supplier-detail-view';
import { SUPPLIER_STATUS_CONFIG } from '../supplier-status-config';
import type { SupplierStatus } from '@/lib/schemas/suppliers';

// ============================================================================
// TYPES
// ============================================================================

export interface SupplierDetailContainerRenderProps {
  /** Header title element */
  headerTitle: React.ReactNode;
  /** Header action buttons */
  headerActions: React.ReactNode;
  /** Main content */
  content: React.ReactNode;
}

export interface SupplierDetailContainerProps {
  /** Supplier ID to display */
  supplierId: string;
  /** Callback when user navigates back */
  onBack?: () => void;
  /** Callback when user clicks edit */
  onEdit?: () => void;
  /** Callback to navigate to create PO */
  onCreatePurchaseOrder?: () => void;
  /** Callback to view purchase orders */
  onViewPurchaseOrders?: () => void;
  /** Render props pattern for layout composition */
  children?: (props: SupplierDetailContainerRenderProps) => React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function SupplierDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SupplierDetailContainer({
  supplierId,
  onBack,
  onEdit,
  onCreatePurchaseOrder,
  onViewPurchaseOrders,
  children,
  className,
}: SupplierDetailContainerProps) {
  // ─────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('overview');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showMetaPanel, setShowMetaPanel] = useState(true);

  // ─────────────────────────────────────────────────────────────────────────
  // Panel Toggle Handler
  // ─────────────────────────────────────────────────────────────────────────
  const handleToggleMetaPanel = useCallback(() => {
    setShowMetaPanel((prev) => !prev);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────────────────
  const {
    data: supplier,
    isLoading,
    error,
    refetch,
  } = useSupplier(supplierId);

  const {
    data: purchaseOrdersData,
    isLoading: purchaseOrdersLoading,
  } = usePurchaseOrders({
    supplierId,
    pageSize: 100, // Fetch enough for display
    enabled: !!supplierId,
  });

  const {
    activities,
    isLoading: activitiesLoading,
    error: activitiesError,
  } = useUnifiedActivities({
    entityType: 'supplier',
    entityId: supplierId,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────────────────────────────────
  const deleteMutation = useDeleteSupplier();

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    try {
      await deleteMutation.mutateAsync({ data: { id: supplierId } });
      toastSuccess('Supplier deleted');
      setDeleteDialogOpen(false);
      onBack?.();
    } catch {
      toastError('Failed to delete supplier');
    }
  }, [deleteMutation, supplierId, onBack]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Derived State
  // ─────────────────────────────────────────────────────────────────────────
  const statusConfig = useMemo(() => {
    if (!supplier) return null;
    return SUPPLIER_STATUS_CONFIG[supplier.status as SupplierStatus] ?? SUPPLIER_STATUS_CONFIG.active;
  }, [supplier]);

  // Transform purchase orders for the view
  const purchaseOrders = useMemo(() => {
    if (!purchaseOrdersData?.items) return [];
    return purchaseOrdersData.items.map((po) => ({
      id: po.id,
      poNumber: po.poNumber,
      status: po.status,
      totalAmount: Number(po.totalAmount),
      createdAt: po.createdAt,
    }));
  }, [purchaseOrdersData]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Loading
  // ─────────────────────────────────────────────────────────────────────────
  if (isLoading) {
    const loadingContent = <SupplierDetailSkeleton />;
    if (children) {
      return (
        <>
          {children({
            headerTitle: <Skeleton className="h-8 w-48" />,
            headerActions: <Skeleton className="h-10 w-32" />,
            content: loadingContent,
          })}
        </>
      );
    }
    return loadingContent;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Error
  // ─────────────────────────────────────────────────────────────────────────
  if (error || !supplier) {
    const errorContent = (
      <ErrorState
        title="Supplier not found"
        message="The supplier you're looking for doesn't exist or has been deleted."
        onRetry={() => refetch()}
        retryLabel="Try Again"
      />
    );
    if (children) {
      return (
        <>
          {children({
            headerTitle: 'Supplier Not Found',
            headerActions: null,
            content: errorContent,
          })}
        </>
      );
    }
    return errorContent;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Header Elements
  // ─────────────────────────────────────────────────────────────────────────
  const StatusIcon = statusConfig?.icon ?? Building2;

  const headerTitle = (
    <div className="flex items-center gap-3">
      <span className="text-xl font-semibold">{supplier.name}</span>
      {statusConfig && (
        <Badge className={cn('gap-1', statusConfig.color)}>
          <StatusIcon className="h-3 w-3" />
          {statusConfig.label}
        </Badge>
      )}
    </div>
  );

  const headerActions = (
    <div className="flex items-center gap-2">
      {/* Primary Action */}
      {onEdit && (
        <Button variant="outline" onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      )}

      {/* More Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onViewPurchaseOrders && (
            <DropdownMenuItem onClick={onViewPurchaseOrders}>
              <Package className="h-4 w-4 mr-2" />
              View Purchase Orders
            </DropdownMenuItem>
          )}
          {onCreatePurchaseOrder && (
            <DropdownMenuItem onClick={onCreatePurchaseOrder}>
              <FileText className="h-4 w-4 mr-2" />
              Create Purchase Order
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </DropdownMenuItem>
          {supplier.status === 'active' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Main Content
  // ─────────────────────────────────────────────────────────────────────────
  const content = (
    <>
      <SupplierDetailView
        supplier={{
          ...supplier,
          overallRating: supplier.overallRating ? Number(supplier.overallRating) : null,
          qualityRating: supplier.qualityRating ? Number(supplier.qualityRating) : null,
          deliveryRating: supplier.deliveryRating ? Number(supplier.deliveryRating) : null,
          communicationRating: supplier.communicationRating ? Number(supplier.communicationRating) : null,
          minimumOrderValue: supplier.minimumOrderValue ? Number(supplier.minimumOrderValue) : null,
          maximumOrderValue: supplier.maximumOrderValue ? Number(supplier.maximumOrderValue) : null,
          totalPurchaseValue: supplier.totalPurchaseValue ? Number(supplier.totalPurchaseValue) : null,
          averageOrderValue: supplier.averageOrderValue ? Number(supplier.averageOrderValue) : null,
        }}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showMetaPanel={showMetaPanel}
        onToggleMetaPanel={handleToggleMetaPanel}
        purchaseOrders={purchaseOrders}
        purchaseOrdersLoading={purchaseOrdersLoading}
        priceAgreements={[]} // TODO: Add price agreements hook when available
        priceAgreementsLoading={false}
        activities={activities}
        activitiesLoading={activitiesLoading}
        activitiesError={activitiesError}
        className={className}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {supplier.name}? This action cannot
              be undone and will affect any associated purchase orders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render: With Render Props or Default
  // ─────────────────────────────────────────────────────────────────────────
  if (children) {
    return <>{children({ headerTitle, headerActions, content })}</>;
  }

  // Default rendering (standalone usage)
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        {headerTitle}
        {headerActions}
      </div>
      {content}
    </div>
  );
}

export default SupplierDetailContainer;
