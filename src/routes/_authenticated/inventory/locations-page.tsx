/**
 * Inventory Locations Page Component
 *
 * Warehouse location management with hierarchical tree view and detail panel.
 *
 * @source hierarchy from useLocationHierarchy hook
 * @source locationDetail from useLocationDetail hook
 *
 * @see src/routes/_authenticated/inventory/locations.tsx - Route definition
 */
import { useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Upload, Download, RefreshCw } from "lucide-react";
import { PageLayout } from "@/components/layout";
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
  LocationTree,
  LocationForm,
  LocationDetail,
  type WarehouseLocation,
  type LocationContents,
} from "@/components/domain/inventory";
import type {
  WarehouseLocationWithChildren,
  LocationDetailApiResult,
  CreateWarehouseLocationInput,
  UpdateWarehouseLocationInput,
} from "@/lib/schemas/inventory/inventory";
import {
  useLocationHierarchy,
  useLocationDetail,
  useCreateWarehouseLocation,
  useUpdateWarehouseLocation,
  useDeleteWarehouseLocation,
} from "@/hooks/inventory";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function LocationsPage() {
  const navigate = useNavigate();

  // State
  const [selectedLocation, setSelectedLocation] = useState<WarehouseLocation | null>(null);

  // Dialog states
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formParent, setFormParent] = useState<WarehouseLocation | null>(null);
  const [editingLocation, setEditingLocation] = useState<WarehouseLocation | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingLocation, setDeletingLocation] = useState<WarehouseLocation | null>(null);

  // Data hooks - using TanStack Query via hooks
  const {
    data: hierarchyData,
    isLoading,
    refetch: refetchHierarchy,
  } = useLocationHierarchy();

  const {
    data: locationDetailData,
    isLoading: isLoadingDetail,
  } = useLocationDetail(selectedLocation?.id ?? "", !!selectedLocation);

  // Mutation hooks
  const createMutation = useCreateWarehouseLocation();
  const updateMutation = useUpdateWarehouseLocation();
  const deleteMutation = useDeleteWarehouseLocation();

  // Transform data (hierarchy data may have nullable isActive, coerce to required)
  const locations: WarehouseLocation[] = (hierarchyData ?? []).map((loc: WarehouseLocationWithChildren) => ({
    ...loc,
    isActive: loc.isActive ?? true,
  }));

  // Aggregate location contents by SKU for better readability
  // Multiple inventory items of the same SKU at the same location should be grouped
  type LocationContentItem = NonNullable<LocationDetailApiResult['contents']>[number];
  const rawContents = (locationDetailData?.contents ?? []).map((item: LocationContentItem) => ({
    id: item.id,
    productId: item.productId,
    productName: item.product?.name ?? "Unknown",
    productSku: item.product?.sku ?? "N/A",
    quantityOnHand: Number(item.quantityOnHand ?? 0),
    quantityAllocated: Number(item.quantityAllocated ?? 0),
    quantityAvailable: Number(item.quantityAvailable ?? 0),
    unitCost: Number(item.unitCost ?? 0),
    totalValue: Number(item.totalValue ?? 0),
  }));

  // Group by SKU (or productId if SKU is missing)
  const aggregatedContentsMap = new Map<string, {
    productId: string;
    productName: string;
    productSku: string;
    quantityOnHand: number;
    quantityAllocated: number;
    quantityAvailable: number;
    unitCost: number;
    totalValue: number;
    itemCount: number;
  }>();

  rawContents.forEach((item) => {
    const key = item.productSku !== "N/A" && item.productSku 
      ? item.productSku 
      : item.productId;
    const existing = aggregatedContentsMap.get(key);
    
    if (existing) {
      // Aggregate quantities and values
      existing.quantityOnHand += item.quantityOnHand;
      existing.quantityAllocated += item.quantityAllocated;
      existing.quantityAvailable += item.quantityAvailable;
      existing.totalValue += item.totalValue;
      existing.itemCount += 1;
      // Use weighted average for unit cost
      const totalQuantity = existing.quantityOnHand;
      if (totalQuantity > 0) {
        existing.unitCost = existing.totalValue / totalQuantity;
      }
    } else {
      aggregatedContentsMap.set(key, {
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        quantityOnHand: item.quantityOnHand,
        quantityAllocated: item.quantityAllocated,
        quantityAvailable: item.quantityAvailable,
        unitCost: item.unitCost,
        totalValue: item.totalValue,
        itemCount: 1,
      });
    }
  });

  const locationContents: LocationContents[] = Array.from(aggregatedContentsMap.entries())
    .map(([_key, agg]) => ({
      id: agg.productId, // Use productId as ID for aggregated items
      productId: agg.productId,
      productName: agg.productName,
      productSku: agg.productSku,
      quantityOnHand: agg.quantityOnHand,
      quantityAllocated: agg.quantityAllocated,
      quantityAvailable: agg.quantityAvailable,
      unitCost: agg.unitCost,
      totalValue: agg.totalValue,
    }))
    .sort((a, b) => b.totalValue - a.totalValue); // Sort by total value descending

  const locationMetrics = locationDetailData?.metrics ?? null;

  // Handlers
  const handleSelect = useCallback((location: WarehouseLocation) => {
    setSelectedLocation(location);
  }, []);

  const handleAdd = useCallback((parentId: string | null) => {
    const parent = parentId
      ? findLocation(locations, parentId)
      : null;
    setFormParent(parent);
    setEditingLocation(null);
    setFormMode("create");
    setShowFormDialog(true);
  }, [locations]);

  const handleEdit = useCallback((location: WarehouseLocation) => {
    const parent = location.parentId
      ? findLocation(locations, location.parentId)
      : null;
    setFormParent(parent);
    setEditingLocation(location);
    setFormMode("edit");
    setShowFormDialog(true);
  }, [locations]);

  const handleDelete = useCallback((location: WarehouseLocation) => {
    setDeletingLocation(location);
    setShowDeleteDialog(true);
  }, []);

  const handleFormSubmit = useCallback(
    async (data: CreateWarehouseLocationInput | UpdateWarehouseLocationInput) => {
      if (formMode === "edit" && editingLocation) {
        await updateMutation.mutateAsync({
          id: editingLocation.id,
          data,
        });
      } else {
        await createMutation.mutateAsync(data as CreateWarehouseLocationInput);
      }
      setShowFormDialog(false);
    },
    [formMode, editingLocation, createMutation, updateMutation]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingLocation) return;
    await deleteMutation.mutateAsync(deletingLocation.id);
    setShowDeleteDialog(false);
    setDeletingLocation(null);
    if (selectedLocation?.id === deletingLocation.id) {
      setSelectedLocation(null);
    }
  }, [deletingLocation, selectedLocation, deleteMutation]);

  const handleItemClick = useCallback(
    (item: LocationContents) => {
      navigate({
        to: "/inventory/$itemId",
        params: { itemId: item.id },
      });
    },
    [navigate]
  );

  // Use refetch from hook instead of queryClient.invalidateQueries
  const handleRefresh = useCallback(async () => {
    await refetchHierarchy();
    toast.success("Refreshed");
  }, [refetchHierarchy]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Warehouse Locations"
        description="Manage warehouse layout and storage locations"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
              Import
            </Button>
            <Button onClick={() => handleAdd(null)}>
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Add Warehouse
            </Button>
          </div>
        }
      />

      <PageLayout.Content>
        <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
          {/* Tree View */}
          <div className="border rounded-lg p-4">
            <LocationTree
              locations={locations}
              isLoading={isLoading}
              selectedId={selectedLocation?.id}
              onSelect={handleSelect}
              onAdd={handleAdd}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>

          {/* Detail Panel */}
          <LocationDetail
            location={selectedLocation}
            contents={locationContents}
            metrics={locationMetrics ?? undefined}
            isLoading={false}
            isLoadingContents={isLoadingDetail}
            onItemClick={handleItemClick}
          />
        </div>
      </PageLayout.Content>

      {/* Form Dialog */}
      <LocationForm
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        location={editingLocation}
        parentLocation={formParent}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingLocation?.name}&quot;? This
              action cannot be undone. The location must be empty and have no
              child locations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
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

// Helper to find a location in the tree
function findLocation(
  locations: WarehouseLocation[],
  id: string
): WarehouseLocation | null {
  for (const loc of locations) {
    if (loc.id === id) return loc;
    if (loc.children) {
      const found = findLocation(loc.children, id);
      if (found) return found;
    }
  }
  return null;
}
