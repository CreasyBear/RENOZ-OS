/**
 * Inventory Detail Container
 *
 * Handles data fetching, mutations, and state management for inventory detail view.
 * Uses the useInventoryDetail composite hook following DETAIL-VIEW-STANDARDS.md.
 *
 * @source useInventoryDetail composite hook
 *
 * @see STANDARDS.md - Container/Presenter pattern
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { useMemo } from 'react';
import {
  Edit,
  ArrowLeftRight,
  SlidersHorizontal,
  Trash2,
  MoreHorizontal,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { EntityActivityLogger } from '@/components/shared/activity';
import { useEntityActivityLogging } from '@/hooks/activities/use-entity-activity-logging';
import { DisabledButtonWithTooltip } from '@/components/shared/disabled-with-tooltip';
import { useAlertDismissals } from '@/hooks/_shared/use-alert-dismissals';
import { useInventoryDetail } from '@/hooks/inventory/use-inventory-detail';
import { useTrackView } from '@/hooks/search';
import { InventoryDetailView } from '../views/inventory-detail-view';
import type { ItemDetailData } from '../item-detail';
import type { MovementRecord, CostLayer, QualityRecord } from '../item-tabs';
import type { MovementWithRelations, InventoryCostLayerRow } from '@/lib/schemas/inventory';
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
  // Composite Hook
  // ─────────────────────────────────────────────────────────────────────────
  const detail = useInventoryDetail(itemId);
  const { dismiss, isAlertDismissed } = useAlertDismissals();

  const { onLogActivity, loggerProps } = useEntityActivityLogging({
    entityType: 'inventory',
    entityId: itemId,
    entityLabel: `Inventory: ${detail.item?.product?.name ?? itemId}`,
  });

  useTrackView('inventory', detail.item?.id, detail.item?.product?.name, detail.item?.product?.sku ?? undefined, `/inventory/${itemId}`);

  // ─────────────────────────────────────────────────────────────────────────
  // Filter Dismissed Alerts
  // ─────────────────────────────────────────────────────────────────────────
  const visibleAlerts = useMemo(() => {
    return detail.alerts.filter((alert) => !isAlertDismissed(alert.id));
  }, [detail.alerts, isAlertDismissed]);

  // ─────────────────────────────────────────────────────────────────────────
  // Transform item to ItemDetailData
  // ─────────────────────────────────────────────────────────────────────────
  const itemDetailData: ItemDetailData | null = useMemo(() => {
    if (!detail.item) return null;
    const item = detail.item;
    return {
      id: item.id,
      productId: item.productId,
      productName: item.product?.name ?? 'Unknown Product',
      productSku: item.product?.sku ?? 'N/A',
      productDescription: typeof item.product?.description === 'string' ? item.product.description : undefined,
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
  }, [detail.item]);

  // ─────────────────────────────────────────────────────────────────────────
  // Transform movements for view
  // ─────────────────────────────────────────────────────────────────────────
  const MOVEMENT_TYPES = ['receive', 'allocate', 'deallocate', 'pick', 'ship', 'adjust', 'return', 'transfer'] as const;
  const movements: MovementRecord[] = useMemo(() => {
    return (detail.movements as MovementWithRelations[]).map((m) => {
      const movementType = MOVEMENT_TYPES.includes(m.movementType as (typeof MOVEMENT_TYPES)[number])
        ? (m.movementType as MovementRecord['movementType'])
        : 'adjust';
      return {
        id: m.id,
        movementType,
        quantity: m.quantity,
        previousQuantity: m.previousQuantity ?? 0,
        newQuantity: m.newQuantity ?? 0,
        referenceType: m.referenceType ?? undefined,
        referenceId: m.referenceId ?? undefined,
        referenceNumber: m.referenceNumber ?? undefined,
        reason: (typeof m.metadata?.reason === 'string' ? m.metadata.reason : m.notes) ?? undefined,
        notes: m.notes ?? undefined,
        performedBy: m.performedByName ?? 'Unknown',
        performedAt: new Date(m.createdAt),
        unitCost: m.unitCost ? Number(m.unitCost) : undefined,
        totalCost: m.totalCost ? Number(m.totalCost) : undefined,
      };
    });
  }, [detail.movements]);

  // ─────────────────────────────────────────────────────────────────────────
  // Transform cost layers for view
  // ─────────────────────────────────────────────────────────────────────────
  const costLayers: CostLayer[] = useMemo(() => {
    return (detail.costLayers as InventoryCostLayerRow[]).map((l) => ({
      id: l.id,
      receivedAt: new Date(l.receivedAt),
      quantityReceived: l.quantityReceived,
      quantityRemaining: l.quantityRemaining,
      unitCost: Number(l.unitCost),
      totalCost: l.quantityRemaining * Number(l.unitCost),
      referenceType: l.referenceType ?? undefined,
      referenceId: l.referenceId ?? undefined,
      expiryDate: l.expiryDate ? new Date(l.expiryDate) : undefined,
    }));
  }, [detail.costLayers]);

  // NOTE: Forecasts removed - product-level concern
  // See Product Inventory View at /products/{productId}?tab=inventory

  // ─────────────────────────────────────────────────────────────────────────
  // Transform quality records for view
  // ─────────────────────────────────────────────────────────────────────────
  const qualityRecords: QualityRecord[] = useMemo(() => {
    return detail.qualityRecords;
  }, [detail.qualityRecords]);

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleAdjust = async (data: AdjustmentFormData) => {
    await detail.handleAdjust({
      productId: data.productId,
      locationId: data.locationId,
      adjustmentQty: data.adjustmentQty,
      reason: data.reason,
      notes: data.notes,
    });
  };

  const handleTransfer = async (data: TransferFormData) => {
    await detail.handleTransfer({
      productId: data.productId,
      fromLocationId: data.fromLocationId,
      toLocationId: data.toLocationId,
      quantity: data.quantity,
      reason: data.reason,
      notes: data.reason,
    });
    onBack?.();
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else {
      detail.setEditDialogOpen(true);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Loading
  // ─────────────────────────────────────────────────────────────────────────
  if (detail.isLoading) {
    const loadingContent = <InventoryDetailSkeleton />;
    if (children) {
      return (
        <>
          {children({
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
  if (detail.error || !detail.item || !itemDetailData) {
    const errorContent = (
      <ErrorState
        title="Inventory item not found"
        message="The inventory item you're looking for doesn't exist or has been deleted."
        onRetry={() => detail.refetch()}
        retryLabel="Try Again"
      />
    );
    if (children) {
      return (
        <>
          {children({
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
  const headerActions = (
    <div className="flex items-center gap-2">
      {/* Primary Actions */}
      <Button variant="outline" onClick={detail.actions.onAdjust}>
        <SlidersHorizontal className="h-4 w-4 mr-2" />
        Adjust
      </Button>
      <DisabledButtonWithTooltip
        variant="outline"
        onClick={detail.actions.onTransfer}
        disabledReason={detail.transferDisabledReason}
      >
        <ArrowLeftRight className="h-4 w-4 mr-2" />
        Transfer
      </DisabledButtonWithTooltip>

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
          <DropdownMenuItem onClick={detail.actions.onPrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={detail.actions.onDelete}
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
        qualityRecords={qualityRecords}
        alerts={visibleAlerts}
        onDismissAlert={dismiss}
        activeTab={detail.activeTab}
        onTabChange={detail.onTabChange}
        showMetaPanel={detail.showSidebar}
        onToggleMetaPanel={detail.toggleSidebar}
        activities={detail.activities}
        activitiesLoading={detail.activitiesLoading}
        activitiesError={detail.activitiesError}
        onLogActivity={onLogActivity}
        isLoadingMovements={detail.movementsLoading}
        isLoadingCostLayers={detail.costLayersLoading}
        isLoadingQuality={detail.qualityLoading}
        counts={detail.counts}
        className={className}
      />

      <EntityActivityLogger {...loggerProps} />

      {/* Transfer Dialog */}
      <StockTransferDialog
        open={detail.transferDialogOpen}
        onClose={() => detail.setTransferDialogOpen(false)}
        item={{
          id: detail.item.id,
          productId: detail.item.productId,
          productName: detail.item.product?.name ?? 'Unknown Product',
          productSku: detail.item.product?.sku ?? 'N/A',
          locationId: detail.item.locationId,
          locationName: detail.item.location?.name ?? 'Unknown Location',
          quantityOnHand: detail.item.quantityOnHand ?? 0,
          quantityAvailable: detail.item.quantityAvailable ?? 0,
          unitCost: detail.item.unitCost ? Number(detail.item.unitCost) : undefined,
        }}
        locations={detail.locations}
        onTransfer={handleTransfer}
        isLoading={detail.isTransferring}
      />

      {/* Adjustment Dialog */}
      <StockAdjustmentDialog
        open={detail.adjustDialogOpen}
        onClose={() => detail.setAdjustDialogOpen(false)}
        item={{
          id: detail.item.id,
          productId: detail.item.productId,
          productName: detail.item.product?.name ?? 'Unknown Product',
          productSku: detail.item.product?.sku ?? 'N/A',
          locationId: detail.item.locationId,
          locationName: detail.item.location?.name ?? 'Unknown Location',
          quantityOnHand: detail.item.quantityOnHand ?? 0,
          quantityAvailable: detail.item.quantityAvailable ?? 0,
          unitCost: detail.item.unitCost ? Number(detail.item.unitCost) : undefined,
        }}
        onAdjust={handleAdjust}
        isLoading={detail.isAdjusting}
      />

      {/* Edit Dialog */}
      {detail.item?.product && (
        <InventoryItemEditDialog
          open={detail.editDialogOpen}
          onClose={() => detail.setEditDialogOpen(false)}
          product={{
            id: detail.item.productId,
            sku: detail.item.product.sku,
            name: detail.item.product.name,
            description: typeof detail.item.product.description === 'string' ? detail.item.product.description : undefined,
            barcode: typeof detail.item.product.barcode === 'string' ? detail.item.product.barcode : undefined,
            basePrice: typeof detail.item.product.basePrice === 'number' ? detail.item.product.basePrice : 0,
            costPrice: typeof detail.item.product.costPrice === 'number' ? detail.item.product.costPrice : undefined,
            weight: typeof detail.item.product.weight === 'number' ? detail.item.product.weight : undefined,
            isActive: Boolean(detail.item.product.isActive),
            isSellable: Boolean(detail.item.product.isSellable),
            trackInventory: Boolean(detail.item.product.trackInventory),
          }}
          onSubmit={detail.handleEditProduct}
          isLoading={detail.isUpdatingProduct}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={detail.deleteDialogOpen} onOpenChange={detail.setDeleteDialogOpen}>
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
              onClick={detail.handleDelete}
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
    return <>{children({ headerActions, content })}</>;
  }

  // Default rendering (standalone usage)
  return (
    <div className={className}>
      {headerActions && (
        <div className="flex items-center justify-end mb-4">
          {headerActions}
        </div>
      )}
      {content}
    </div>
  );
}

export default InventoryDetailContainer;
