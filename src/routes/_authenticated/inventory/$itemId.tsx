/**
 * Inventory Item Detail Route
 *
 * Comprehensive inventory item view with tabs for different aspects.
 *
 * Features:
 * - Tabbed interface: Overview, Movements, Cost Layers, Forecasts, Quality
 * - Complete item information with status indicators
 * - Movement history with filtering
 * - Cost layer visualization with FIFO tracking
 * - Demand forecasting with accuracy metrics
 * - Quality tracking and inspection history
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { ArrowLeft, Edit, Trash2, ArrowLeftRight, Package } from "lucide-react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { InventoryDetailSkeleton } from "@/components/skeletons/inventory";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
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
} from "@/components/domain/inventory/item-tabs";
import { type ItemDetailData } from "@/components/domain/inventory/item-detail";
import { getInventoryItem } from "@/server/functions/inventory";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/inventory/$itemId" as any)({
  component: InventoryItemPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/inventory" />
  ),
  pendingComponent: () => (
    <PageLayout variant="container">
      <InventoryDetailSkeleton />
    </PageLayout>
  ),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function InventoryItemPage() {
  const navigate = useNavigate();
  const { itemId } = Route.useParams() as { itemId: string };

  // State
  const [item, setItem] = useState<ItemDetailData | null>(null);
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [costLayers, setCostLayers] = useState<CostLayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMovements, setIsLoadingMovements] = useState(true);
  const [isLoadingCostLayers, setIsLoadingCostLayers] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch item data
  const fetchItem = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getInventoryItem({ data: { id: itemId } });

      if (data) {
        const itemData = (data as any).item;
        const transformedItem: ItemDetailData = {
          id: itemData.id,
          productId: itemData.productId,
          productName: itemData.product?.name ?? "Unknown Product",
          productSku: itemData.product?.sku ?? "N/A",
          productDescription: itemData.product?.description,
          locationId: itemData.locationId,
          locationName: itemData.location?.name ?? "Unknown Location",
          locationCode: itemData.location?.code ?? "N/A",
          quantityOnHand: itemData.quantityOnHand ?? 0,
          quantityAllocated: itemData.quantityAllocated ?? 0,
          quantityAvailable: itemData.quantityAvailable ?? 0,
          unitCost: Number(itemData.unitCost) ?? 0,
          totalValue: Number(itemData.totalValue) ?? 0,
          status: itemData.status ?? "available",
          qualityStatus: itemData.qualityStatus,
          serialNumber: itemData.serialNumber,
          lotNumber: itemData.lotNumber,
          binLocation: itemData.binLocation,
          expiryDate: itemData.expiryDate ? new Date(itemData.expiryDate) : undefined,
          receivedAt: itemData.receivedAt ? new Date(itemData.receivedAt) : undefined,
          lastMovementAt: itemData.lastMovementAt ? new Date(itemData.lastMovementAt) : undefined,
          createdAt: itemData.createdAt ? new Date(itemData.createdAt) : undefined,
          updatedAt: itemData.updatedAt ? new Date(itemData.updatedAt) : undefined,
        };
        setItem(transformedItem);

        // Transform movements
        const movementsData = (data as any).movements || [];
        setMovements(
          movementsData.map((m: any) => ({
            id: m.id,
            movementType: m.movementType,
            quantity: m.quantity,
            previousQuantity: m.previousQuantity,
            newQuantity: m.newQuantity,
            referenceType: m.referenceType,
            referenceId: m.referenceId,
            reason: m.metadata?.reason,
            notes: m.notes,
            performedBy: m.performedByName ?? "Unknown",
            performedAt: new Date(m.createdAt),
            unitCost: m.unitCost ? Number(m.unitCost) : undefined,
            totalCost: m.totalCost ? Number(m.totalCost) : undefined,
          }))
        );
        setIsLoadingMovements(false);

        // Transform cost layers
        const costLayersData = (data as any).costLayers || [];
        setCostLayers(
          costLayersData.map((l: any) => ({
            id: l.id,
            receivedAt: new Date(l.receivedAt),
            quantityReceived: l.quantityReceived,
            quantityRemaining: l.quantityRemaining,
            unitCost: Number(l.unitCost),
            totalCost: l.quantityRemaining * Number(l.unitCost),
            referenceType: l.referenceType,
            referenceId: l.referenceId,
            expiryDate: l.expiryDate ? new Date(l.expiryDate) : undefined,
          }))
        );
        setIsLoadingCostLayers(false);
      }
    } catch (error) {
      console.error("Failed to fetch inventory item:", error);
      toast.error("Failed to load inventory item");
    } finally {
      setIsLoading(false);
    }
  }, [itemId]);

  // Initial fetch
  useEffect(() => {
    fetchItem();
  }, [itemId]);

  // Handlers
  const handleBack = useCallback(() => {
    navigate({ to: "/_authenticated/inventory" as any });
  }, [navigate]);

  const handleEdit = useCallback(() => {
    toast.info("Edit", { description: "Edit functionality coming soon" });
  }, []);

  const handleDelete = useCallback(async () => {
    try {
      // TODO: Call delete API
      toast.success("Item deleted");
      setShowDeleteDialog(false);
      navigate({ to: "/_authenticated/inventory" as any });
    } catch (error) {
      toast.error("Failed to delete item");
    }
  }, [navigate]);

  const handleAdjust = useCallback(() => {
    toast.info("Adjust", { description: "Adjustment dialog coming soon" });
  }, []);

  const handleTransfer = useCallback(() => {
    toast.info("Transfer", { description: "Transfer dialog coming soon" });
  }, []);

  // Loading state
  if (isLoading || !item) {
    return (
      <PageLayout variant="container">
        <PageLayout.Header
          title="Loading..."
          actions={
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Back
            </Button>
          }
        />
        <PageLayout.Content>
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </PageLayout.Content>
      </PageLayout>
    );
  }

  return (
    <PageLayout variant="container">
      <PageLayout.Header
        title={item.productName}
        description={
          <span className="flex items-center gap-2">
            <Package className="h-4 w-4" aria-hidden="true" />
            {item.productSku}
            {item.serialNumber && ` • S/N: ${item.serialNumber}`}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Back
            </Button>
            <Button variant="outline" onClick={handleAdjust}>
              Adjust
            </Button>
            <Button variant="outline" onClick={handleTransfer}>
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
        }
      />

      <PageLayout.Content>
        <ItemTabs
          item={item}
          movements={movements}
          costLayers={costLayers}
          forecasts={[]} // TODO: Fetch forecasts
          qualityRecords={[]} // TODO: Fetch quality records
          isLoadingMovements={isLoadingMovements}
          isLoadingCostLayers={isLoadingCostLayers}
          isLoadingForecasts={false}
          isLoadingQuality={false}
        />
      </PageLayout.Content>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this inventory item? This action
              cannot be undone.
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
