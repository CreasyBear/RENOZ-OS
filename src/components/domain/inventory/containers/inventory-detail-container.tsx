/**
 * Inventory Detail Container
 *
 * Handles data fetching, mutations, and state management for inventory detail view.
 * Implements render props pattern for flexible header/action composition.
 *
 * @source item from useInventoryItem hook
 * @source movements from useInventoryMovements hook
 * @source activities from useUnifiedActivities hook
 *
 * @see STANDARDS.md - Container/Presenter pattern
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Edit,
  ArrowLeftRight,
  SlidersHorizontal,
  Trash2,
  MoreHorizontal,
  Printer,
  Package,
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
import { toastSuccess, toastError, toast } from '@/hooks';
import {
  useInventoryItem,
  useInventoryMovements,
  useAdjustInventory,
  useTransferInventory,
  useProductForecast,
  useQualityInspections,
} from '@/hooks/inventory';
import { useLocations } from '@/hooks/inventory/use-locations';
import { useUpdateProduct } from '@/hooks/products';
import { useUnifiedActivities } from '@/hooks/activities';
import type { UpdateProduct } from '@/lib/schemas/products';
import { InventoryDetailView } from '../views/inventory-detail-view';
import type { ItemDetailData } from '../item-detail';
import type { MovementRecord, CostLayer, ForecastData, QualityRecord } from '../item-tabs';
import {
  StockTransferDialog,
  type TransferFormData,
} from '../stock-transfer-dialog';
import {
  StockAdjustmentDialog,
  type AdjustmentFormData,
} from '../stock-adjustment-dialog';
import { InventoryItemEditDialog } from '../inventory-item-edit-dialog';

// ============================================================================
// TYPES
// ============================================================================

export interface InventoryDetailContainerRenderProps {
  /** Header title element */
  headerTitle: React.ReactNode;
  /** Header action buttons */
  headerActions: React.ReactNode;
  /** Main content */
  content: React.ReactNode;
}

export interface InventoryDetailContainerProps {
  /** Inventory item ID to display */
  itemId: string;
  /** Callback when user navigates back */
  onBack?: () => void;
  /** Callback when user clicks edit */
  onEdit?: () => void;
  /** Render props pattern for layout composition */
  children?: (props: InventoryDetailContainerRenderProps) => React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// STATUS DETAIL CONFIG (for header badge)
// ============================================================================

const INVENTORY_STATUS_DETAIL_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  available: {
    label: 'Available',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
  },
  allocated: {
    label: 'Allocated',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  },
  sold: {
    label: 'Sold',
    color: 'bg-secondary text-secondary-foreground',
  },
  damaged: {
    label: 'Damaged',
    color: 'bg-destructive/10 text-destructive',
  },
  returned: {
    label: 'Returned',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  },
  quarantined: {
    label: 'Quarantined',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
  },
};

// ============================================================================
// LOADING SKELETON
// ============================================================================

function InventoryDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function InventoryDetailContainer({
  itemId,
  onBack,
  onEdit,
  children,
  className,
}: InventoryDetailContainerProps) {
  // ─────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('overview');
  const [showMetaPanel, setShowMetaPanel] = useState(true);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
    data: itemData,
    isLoading: isLoadingItem,
    error: itemError,
    refetch: refetchItem,
  } = useInventoryItem(itemId);

  const { data: movementsData, isLoading: isLoadingMovements } =
    useInventoryMovements(itemId);

  const { locations } = useLocations({
    autoFetch: true,
    initialFilters: { active: true },
  });

  // Fetch product forecasts
  const productId = itemData?.item?.productId;
  const { data: forecastData, isLoading: isLoadingForecasts } = useProductForecast(
    productId ?? '',
    { period: 'weekly', days: 90 },
    !!productId
  );

  // Fetch quality inspections
  const { data: qualityData, isLoading: isLoadingQuality } =
    useQualityInspections(itemId);

  // Fetch activities
  const {
    activities,
    isLoading: activitiesLoading,
    error: activitiesError,
  } = useUnifiedActivities({
    entityType: 'inventory',
    entityId: itemId,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────────────────────────────────
  const adjustMutation = useAdjustInventory();
  const transferMutation = useTransferInventory();
  const updateProductMutation = useUpdateProduct();

  // ─────────────────────────────────────────────────────────────────────────
  // Data Transformation
  // ─────────────────────────────────────────────────────────────────────────
  const item = itemData?.item;

  // Transform to ItemDetailData
  const itemDetailData: ItemDetailData | null = useMemo(() => {
    if (!item) return null;
    return {
      id: item.id,
      productId: item.productId,
      productName: item.product?.name ?? 'Unknown Product',
      productSku: item.product?.sku ?? 'N/A',
      productDescription: item.product?.description ?? undefined,
      locationId: item.locationId,
      locationName: item.location?.name ?? 'Unknown Location',
      locationCode: item.location?.locationCode ?? 'N/A',
      quantityOnHand: item.quantityOnHand ?? 0,
      quantityAllocated: item.quantityAllocated ?? 0,
      quantityAvailable: item.quantityAvailable ?? 0,
      unitCost: item.unitCost ? Number(item.unitCost) : 0,
      totalValue: item.totalValue ? Number(item.totalValue) : 0,
      status: (item.status as ItemDetailData['status']) ?? 'available',
      serialNumber: item.serialNumber ?? undefined,
      lotNumber: item.lotNumber ?? undefined,
      expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
      createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
    };
  }, [item]);

  // Transform movements data
  const movements: MovementRecord[] = useMemo(() => {
    return (
      movementsData?.movements?.map((m: any) => ({
        id: m.id,
        movementType: m.movementType,
        quantity: m.quantity,
        previousQuantity: m.previousQuantity,
        newQuantity: m.newQuantity,
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        reason: m.metadata?.reason ?? m.notes,
        notes: m.notes,
        performedBy: m.performedByName ?? 'Unknown',
        performedAt: new Date(m.createdAt),
        unitCost: m.unitCost ? Number(m.unitCost) : undefined,
        totalCost: m.totalCost ? Number(m.totalCost) : undefined,
      })) ?? []
    );
  }, [movementsData]);

  // Transform cost layers from item data
  const costLayers: CostLayer[] = useMemo(() => {
    return (
      itemData?.costLayers?.map((l: any) => ({
        id: l.id,
        receivedAt: new Date(l.receivedAt),
        quantityReceived: l.quantityReceived,
        quantityRemaining: l.quantityRemaining,
        unitCost: Number(l.unitCost),
        totalCost: l.quantityRemaining * Number(l.unitCost),
        referenceType: l.referenceType,
        referenceId: l.referenceId,
        expiryDate: l.expiryDate ? new Date(l.expiryDate) : undefined,
      })) ?? []
    );
  }, [itemData]);

  // Transform forecasts data
  const forecasts: ForecastData[] = useMemo(() => {
    if (!forecastData?.forecasts) return [];
    return forecastData.forecasts.map((f: any) => ({
      period: new Date(f.forecastDate).toLocaleDateString('en-AU', {
        month: 'short',
        day: 'numeric',
      }),
      forecastedDemand: f.demandQuantity,
      actualDemand: f.actualDemand ?? undefined,
      variance: f.actualDemand ? f.demandQuantity - f.actualDemand : undefined,
      variancePercent: f.actualDemand
        ? ((f.demandQuantity - f.actualDemand) / f.actualDemand) * 100
        : undefined,
      accuracy: f.forecastAccuracy ?? undefined,
    }));
  }, [forecastData]);

  // Transform quality inspections data
  const qualityRecords: QualityRecord[] = useMemo(() => {
    if (!qualityData?.inspections) return [];
    return qualityData.inspections.map((q: any) => ({
      id: q.id,
      inspectionDate: new Date(q.inspectionDate),
      inspectorName: q.inspectorName,
      result: q.result,
      notes: q.notes ?? undefined,
      defects: q.defects ?? undefined,
    }));
  }, [qualityData]);

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleAdjust = useCallback(
    async (data: AdjustmentFormData) => {
      try {
        await adjustMutation.mutateAsync({
          productId: data.productId,
          locationId: data.locationId,
          adjustmentQty: data.adjustmentQty,
          reason: data.reason,
          notes: data.notes,
        });
        toastSuccess('Inventory adjusted successfully');
        await refetchItem();
        setShowAdjustmentDialog(false);
      } catch {
        toastError('Failed to adjust inventory');
      }
    },
    [adjustMutation, refetchItem]
  );

  const handleTransfer = useCallback(
    async (data: TransferFormData) => {
      try {
        await transferMutation.mutateAsync({
          productId: data.productId,
          fromLocationId: data.fromLocationId,
          toLocationId: data.toLocationId,
          quantity: data.quantity,
          reason: data.reason,
          notes: data.reason,
        });
        toastSuccess('Inventory transferred successfully');
        setShowTransferDialog(false);
        onBack?.();
      } catch {
        toastError('Failed to transfer inventory');
      }
    },
    [transferMutation, onBack]
  );

  const handleEdit = useCallback(() => {
    if (onEdit) {
      onEdit();
    } else {
      setShowEditDialog(true);
    }
  }, [onEdit]);

  const handleEditSubmit = useCallback(
    async (data: UpdateProduct) => {
      if (!item?.productId) {
        throw new Error('Product ID not found');
      }
      try {
        await updateProductMutation.mutateAsync({
          id: item.productId,
          data,
        });
        toastSuccess('Product updated successfully');
        await refetchItem();
        setShowEditDialog(false);
      } catch {
        toastError('Failed to update product');
      }
    },
    [item?.productId, updateProductMutation, refetchItem]
  );

  const handleDelete = useCallback(async () => {
    toast.info('Delete functionality not available', {
      description:
        'To remove inventory, use the Adjust feature to set quantity to zero.',
    });
    setShowDeleteDialog(false);
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Derived State
  // ─────────────────────────────────────────────────────────────────────────
  const statusConfig = useMemo(() => {
    if (!itemDetailData) return null;
    return (
      INVENTORY_STATUS_DETAIL_CONFIG[itemDetailData.status] ??
      INVENTORY_STATUS_DETAIL_CONFIG.available
    );
  }, [itemDetailData]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Loading
  // ─────────────────────────────────────────────────────────────────────────
  if (isLoadingItem) {
    const loadingContent = <InventoryDetailSkeleton />;
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
  if (itemError || !item || !itemDetailData) {
    const errorContent = (
      <ErrorState
        title="Inventory item not found"
        message="The inventory item you're looking for doesn't exist or has been deleted."
        onRetry={() => refetchItem()}
        retryLabel="Try Again"
      />
    );
    if (children) {
      return (
        <>
          {children({
            headerTitle: 'Item Not Found',
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
  const headerTitle = (
    <div className="flex items-center gap-3">
      <span className="text-xl font-semibold">{itemDetailData.productName}</span>
      {statusConfig && (
        <Badge className={cn('gap-1', statusConfig.color)}>
          <Package className="h-3 w-3" />
          {statusConfig.label}
        </Badge>
      )}
    </div>
  );

  const headerActions = (
    <div className="flex items-center gap-2">
      {/* Primary Actions */}
      <Button variant="outline" onClick={() => setShowAdjustmentDialog(true)}>
        <SlidersHorizontal className="h-4 w-4 mr-2" />
        Adjust
      </Button>
      <Button variant="outline" onClick={() => setShowTransferDialog(true)}>
        <ArrowLeftRight className="h-4 w-4 mr-2" />
        Transfer
      </Button>

      {/* More Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Product
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Main Content
  // ─────────────────────────────────────────────────────────────────────────
  const content = (
    <>
      <InventoryDetailView
        item={itemDetailData}
        movements={movements}
        costLayers={costLayers}
        forecasts={forecasts}
        qualityRecords={qualityRecords}
        reorderPoint={10}
        maxStockLevel={100}
        safetyStock={5}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showMetaPanel={showMetaPanel}
        onToggleMetaPanel={handleToggleMetaPanel}
        activities={activities}
        activitiesLoading={activitiesLoading}
        activitiesError={activitiesError}
        isLoadingMovements={isLoadingMovements}
        isLoadingCostLayers={false}
        isLoadingForecasts={isLoadingForecasts}
        isLoadingQuality={isLoadingQuality}
        className={className}
      />

      {/* Transfer Dialog */}
      <StockTransferDialog
        open={showTransferDialog}
        onClose={() => setShowTransferDialog(false)}
        item={{
          id: item.id,
          productId: item.productId,
          productName: item.product?.name ?? 'Unknown Product',
          productSku: item.product?.sku ?? 'N/A',
          locationId: item.locationId,
          locationName: item.location?.name ?? 'Unknown Location',
          quantityOnHand: item.quantityOnHand ?? 0,
          quantityAvailable: item.quantityAvailable ?? 0,
          unitCost: item.unitCost ? Number(item.unitCost) : undefined,
        }}
        locations={locations}
        onTransfer={handleTransfer}
        isLoading={transferMutation.isPending}
      />

      {/* Adjustment Dialog */}
      <StockAdjustmentDialog
        open={showAdjustmentDialog}
        onClose={() => setShowAdjustmentDialog(false)}
        item={{
          id: item.id,
          productId: item.productId,
          productName: item.product?.name ?? 'Unknown Product',
          productSku: item.product?.sku ?? 'N/A',
          locationId: item.locationId,
          locationName: item.location?.name ?? 'Unknown Location',
          quantityOnHand: item.quantityOnHand ?? 0,
          quantityAvailable: item.quantityAvailable ?? 0,
          unitCost: item.unitCost ? Number(item.unitCost) : undefined,
        }}
        onAdjust={handleAdjust}
        isLoading={adjustMutation.isPending}
      />

      {/* Edit Dialog */}
      {item?.product && (
        <InventoryItemEditDialog
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          product={{
            id: item.productId,
            sku: item.product.sku,
            name: item.product.name,
            description: item.product.description,
            barcode: item.product.barcode,
            basePrice: item.product.basePrice,
            costPrice: item.product.costPrice,
            weight: item.product.weight,
            isActive: item.product.isActive,
            isSellable: item.product.isSellable,
            trackInventory: item.product.trackInventory,
          }}
          onSubmit={handleEditSubmit}
          isLoading={updateProductMutation.isPending}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this inventory item? This action
              cannot be undone.
              <br />
              <br />
              <strong>Note:</strong> Inventory items should generally not be
              deleted. Consider using the Adjust feature to set quantity to zero
              instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
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

export default InventoryDetailContainer;
