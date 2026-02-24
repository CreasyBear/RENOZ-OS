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
import { Printer, Package, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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
import { EntityHeaderActions } from '@/components/shared';
import { EntityActivityLogger } from '@/components/shared/activity';
import { useEntityActivityLogging } from '@/hooks/activities/use-entity-activity-logging';
import { toastSuccess, toastError } from '@/hooks';
import {
  useSupplier,
  useDeleteSupplier,
  usePurchaseOrders,
  usePriceLists,
} from '@/hooks/suppliers';
import { useUnifiedActivities } from '@/hooks/activities';
import { useTrackView } from '@/hooks/search';
import { SupplierDetailView, type SupplierDetailHeaderConfig } from '../views/supplier-detail-view';

// ============================================================================
// TYPES
// ============================================================================

export interface SupplierDetailContainerRenderProps {
  /** Header actions (CTAs) for PageLayout.Header when using layout pattern */
  headerActions?: React.ReactNode;
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

  const { onLogActivity, loggerProps } = useEntityActivityLogging({
    entityType: 'supplier',
    entityId: supplierId,
    entityLabel: `Supplier: ${supplier?.name ?? supplierId}`,
  });

  useTrackView('supplier', supplier?.id, supplier?.name, supplier?.email ?? undefined, `/suppliers/${supplierId}`);

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

  const {
    data: priceListsData,
    isLoading: priceListsLoading,
  } = usePriceLists({
    supplierId,
    status: 'active',
    page: 1,
    pageSize: 50,
    sortBy: 'productName',
    sortOrder: 'asc',
    enabled: !!supplierId,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────────────────────────────────
  const deleteMutation = useDeleteSupplier();

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (deleteMutation.isPending) return;
    try {
      await deleteMutation.mutateAsync({ data: { id: supplierId } });
      toastSuccess('Supplier deleted');
      setDeleteDialogOpen(false);
      onBack?.();
    } catch (error) {
      toastError(
        error instanceof Error ? error.message : 'Failed to delete supplier'
      );
    }
  }, [deleteMutation, supplierId, onBack]);

  const handleDeleteDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open && deleteMutation.isPending) return;
      setDeleteDialogOpen(open);
    },
    [deleteMutation.isPending]
  );

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Derived State
  // ─────────────────────────────────────────────────────────────────────────
  // Transform purchase orders for the view
  const purchaseOrders = useMemo(() => {
    if (!purchaseOrdersData?.items) return [];
    return purchaseOrdersData.items.map((po) => ({
      id: po.id,
      poNumber: po.poNumber,
      status: po.status,
      totalAmount: Number(po.totalAmount),
      currency: po.currency ?? undefined,
      createdAt: po.createdAt,
    }));
  }, [purchaseOrdersData]);

  const priceAgreements = useMemo(() => {
    const items = priceListsData?.items ?? [];
    return items.map((item) => ({
      id: item.id,
      productName: item.productName ?? 'Unknown product',
      productSku: item.productSku ?? undefined,
      agreedPrice: Number(item.effectivePrice ?? item.price ?? item.basePrice ?? 0),
      validFrom: item.effectiveDate,
      validTo: item.expiryDate ?? item.effectiveDate,
    }));
  }, [priceListsData]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Loading
  // ─────────────────────────────────────────────────────────────────────────
  if (isLoading) {
    const loadingContent = <SupplierDetailSkeleton />;
    if (children) {
      return <>{children({ headerActions: <Skeleton className="h-10 w-32" />, content: loadingContent })}</>;
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
      return <>{children({ headerActions: null, content: errorContent })}</>;
    }
    return errorContent;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Header Config (for EntityHeader in SupplierDetailView)
  // ─────────────────────────────────────────────────────────────────────────
  const headerConfig: SupplierDetailHeaderConfig = {
    onEdit: onEdit ?? undefined,
    onDelete: supplier.status === 'active' ? () => setDeleteDialogOpen(true) : undefined,
    secondaryActions: [
      ...(onViewPurchaseOrders
        ? [{ label: 'View Purchase Orders', onClick: onViewPurchaseOrders, icon: <Package className="h-4 w-4" /> }]
        : []),
      ...(onCreatePurchaseOrder
        ? [{ label: 'Create Purchase Order', onClick: onCreatePurchaseOrder, icon: <FileText className="h-4 w-4" /> }]
        : []),
      { label: 'Print', onClick: handlePrint, icon: <Printer className="h-4 w-4" /> },
    ],
  };

  // When using render props (layout pattern), actions go in PageLayout.Header
  const headerConfigForView = children
    ? { onEdit: undefined, onDelete: undefined, secondaryActions: [] as typeof headerConfig.secondaryActions }
    : headerConfig;

  const headerActions = children ? (
    <EntityHeaderActions
      onEdit={headerConfig.onEdit}
      onDelete={headerConfig.onDelete}
      secondaryActions={headerConfig.secondaryActions}
    />
  ) : undefined;

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
        headerConfig={headerConfigForView}
        purchaseOrders={purchaseOrders}
        purchaseOrdersLoading={purchaseOrdersLoading}
        priceAgreements={priceAgreements}
        priceAgreementsLoading={priceListsLoading}
        activities={activities}
        activitiesLoading={activitiesLoading}
        activitiesError={activitiesError}
        onLogActivity={onLogActivity}
        className={className}
      />

      <EntityActivityLogger {...loggerProps} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {supplier.name}? This action cannot
              be undone and will affect any associated purchase orders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
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
    return <>{children({ headerActions, content })}</>;
  }

  // Default rendering (standalone usage)
  return <div className={className}>{content}</div>;
}

export default SupplierDetailContainer;
