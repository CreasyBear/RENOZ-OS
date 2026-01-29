/**
 * Inventory Item Detail Route
 *
 * Comprehensive inventory item view with tabs for different aspects.
 *
 * LAYOUT: full-width (data-rich detail view)
 *
 * @see UI_UX_STANDARDIZATION_PRD.md
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useMemo } from "react";
import {
  ArrowLeft,
  Edit,
  Trash2,
  ArrowLeftRight,
  SlidersHorizontal,
} from "lucide-react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { InventoryDetailSkeleton } from "@/components/skeletons/inventory";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ItemTabs,
  type MovementRecord,
  type CostLayer,
  type ForecastData,
  InventoryItemEditDialog,
} from "@/components/domain/inventory";
import {
  StockTransferDialog,
  type TransferFormData,
} from "@/components/domain/inventory/stock-transfer-dialog";
import {
  StockAdjustmentDialog,
  type AdjustmentFormData,
} from "@/components/domain/inventory/stock-adjustment-dialog";
import {
  useInventoryItem,
  useInventoryMovements,
  useAdjustInventory,
  useTransferInventory,
  useProductForecast,
  useQualityInspections,
} from "@/hooks/inventory";
import { useLocations } from "@/hooks/inventory/use-locations";
import { useUpdateProduct } from "@/hooks/products";
import type { UpdateProduct } from "@/lib/schemas/products";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/inventory/$itemId" as any)({
  component: InventoryItemPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/inventory" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Loading..." />
      <PageLayout.Content>
        <InventoryDetailSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// MAIN COMPONENT (Container)
// ============================================================================

function InventoryItemPage() {
  const navigate = useNavigate();
  const { itemId } = Route.useParams() as { itemId: string };

  // ============================================================================
  // LOCAL UI STATE
  // ============================================================================
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // ============================================================================
  // DATA FETCHING (TanStack Query Hooks)
  // ============================================================================

  // Fetch inventory item details
  const {
    data: itemData,
    isLoading: isLoadingItem,
    refetch: refetchItem,
  } = useInventoryItem(itemId);

  // Fetch inventory movements
  const {
    data: movementsData,
    isLoading: isLoadingMovements,
  } = useInventoryMovements(itemId);

  // Fetch locations for transfer dialog
  const {
    locations,
  } = useLocations({
    autoFetch: true,
    initialFilters: { active: true },
  });

  // Fetch product forecasts (SPRINT-01-004)
  const productId = itemData?.item?.productId;
  const {
    data: forecastData,
    isLoading: isLoadingForecasts,
  } = useProductForecast(
    productId ?? "",
    { period: "weekly", days: 90 },
    !!productId
  );

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const adjustMutation = useAdjustInventory();
  const transferMutation = useTransferInventory();
  const updateProductMutation = useUpdateProduct();

  // ============================================================================
  // DATA TRANSFORMATION
  // ============================================================================

  const item = itemData?.item;

  // Transform movements data
  const movements: MovementRecord[] =
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
      performedBy: m.performedByName ?? "Unknown",
      performedAt: new Date(m.createdAt),
      unitCost: m.unitCost ? Number(m.unitCost) : undefined,
      totalCost: m.totalCost ? Number(m.totalCost) : undefined,
    })) ?? [];

  // Transform cost layers from item data
  const costLayers: CostLayer[] =
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
    })) ?? [];

  // Transform forecasts data (SPRINT-01-004)
  const forecasts: ForecastData[] = useMemo(() => {
    if (!forecastData?.forecasts) return [];
    return forecastData.forecasts.map((f: any) => ({
      period: new Date(f.forecastDate).toLocaleDateString("en-AU", {
        month: "short",
        day: "numeric",
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

  // Fetch quality inspections (SPRINT-01-004)
  const {
    data: qualityData,
    isLoading: isLoadingQuality,
  } = useQualityInspections(itemId);

  // Transform quality inspections data
  const qualityRecords = useMemo(() => {
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

  // ============================================================================
  // HANDLERS (useCallback for stability)
  // ============================================================================

  const handleBack = useCallback(() => {
    navigate({ to: "/inventory" });
  }, [navigate]);

  const handleAdjust = useCallback(async (data: AdjustmentFormData) => {
    await adjustMutation.mutateAsync({
      productId: data.productId,
      locationId: data.locationId,
      adjustmentQty: data.adjustmentQty,
      reason: data.reason,
      notes: data.notes,
    });
    // Refetch to get updated data
    await refetchItem();
  }, [adjustMutation, refetchItem]);

  const handleTransfer = useCallback(async (data: TransferFormData) => {
    await transferMutation.mutateAsync({
      productId: data.productId,
      fromLocationId: data.fromLocationId,
      toLocationId: data.toLocationId,
      quantity: data.quantity,
      reason: data.reason,
      notes: data.reason, // Use reason as notes for compatibility
    });
    // After transfer, navigate back to inventory list since item may no longer exist at this location
    toast.success("Inventory transferred successfully");
    navigate({ to: "/inventory" });
  }, [transferMutation, navigate]);

  const handleEdit = useCallback(() => {
    setShowEditDialog(true);
  }, []);

  const handleEditSubmit = useCallback(
    async (data: UpdateProduct) => {
      if (!item?.productId) {
        throw new Error("Product ID not found");
      }
      await updateProductMutation.mutateAsync({
        id: item.productId,
        data,
      });
      // Refetch to get updated data
      await refetchItem();
    },
    [item?.productId, updateProductMutation, refetchItem]
  );

  const handleDelete = useCallback(async () => {
    // Delete functionality not yet implemented - inventory items should generally not be deleted
    // Instead, they can be adjusted to zero or transferred
    toast.info("Delete functionality not available", {
      description: "To remove inventory, use the Adjust feature to set quantity to zero.",
    });
    setShowDeleteDialog(false);
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  const title = isLoadingItem || !item ? "Loading..." : (item.product?.name ?? "Unknown Product");
  const description = !isLoadingItem && item ? (
    <span className="flex items-center gap-2">
      SKU: {item.product?.sku ?? "N/A"}
      {item.serialNumber && ` • S/N: ${item.serialNumber}`}
    </span>
  ) : undefined;

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title={title}
        description={description}
        actions={
          !isLoadingItem && item ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAdjustmentDialog(true)}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden="true" />
                Adjust
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowTransferDialog(true)}
              >
                <ArrowLeftRight className="mr-2 h-4 w-4" aria-hidden="true" />
                Transfer
              </Button>
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" aria-hidden="true" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Delete
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Back
            </Button>
          )
        }
      />

      <PageLayout.Content>
        {isLoadingItem || !item ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
          </div>
        ) : (
          <ItemTabs
            item={{
              id: item.id,
              productId: item.productId,
              productName: item.product?.name ?? "Unknown Product",
              productSku: item.product?.sku ?? "N/A",
              productDescription: item.product?.description ?? undefined,
              locationId: item.locationId,
              locationName: item.location?.name ?? "Unknown Location",
              locationCode: item.location?.locationCode ?? "N/A",
              quantityOnHand: item.quantityOnHand ?? 0,
              quantityAllocated: item.quantityAllocated ?? 0,
              quantityAvailable: item.quantityAvailable ?? 0,
              unitCost: item.unitCost ? Number(item.unitCost) : 0,
              totalValue: item.totalValue ? Number(item.totalValue) : 0,
              status: (item.status as any) ?? "available",
              serialNumber: item.serialNumber ?? undefined,
              lotNumber: item.lotNumber ?? undefined,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
              receivedAt: undefined, // Not available in current schema
              lastMovementAt: undefined, // Not available in current schema
              createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
              updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
            }}
            movements={movements}
            costLayers={costLayers}
            forecasts={forecasts}
            qualityRecords={qualityRecords}
            isLoadingMovements={isLoadingMovements}
            isLoadingCostLayers={false}
            isLoadingForecasts={isLoadingForecasts}
            isLoadingQuality={isLoadingQuality}
          />
        )}
      </PageLayout.Content>

      {/* Transfer Dialog */}
      <StockTransferDialog
        open={showTransferDialog}
        onClose={() => setShowTransferDialog(false)}
        item={{
          id: item.id,
          productId: item.productId,
          productName: item.product?.name ?? "Unknown Product",
          productSku: item.product?.sku ?? "N/A",
          locationId: item.locationId,
          locationName: item.location?.name ?? "Unknown Location",
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
          productName: item.product?.name ?? "Unknown Product",
          productSku: item.product?.sku ?? "N/A",
          locationId: item.locationId,
          locationName: item.location?.name ?? "Unknown Location",
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

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this inventory item? This action
              cannot be undone.
              <br /><br />
              <strong>Note:</strong> Inventory items should generally not be deleted.
              Consider using the Adjust feature to set quantity to zero instead.
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
    </PageLayout>
  );
}

export default InventoryItemPage;
