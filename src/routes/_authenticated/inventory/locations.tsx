/**
 * Inventory Locations Route
 *
 * Warehouse location management with hierarchical tree view and detail panel.
 *
 * Features:
 * - Tree view of location hierarchy
 * - Location detail with contents
 * - Create/edit/delete locations
 * - Bulk location import
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { Plus, Upload, Download, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { TreeDetailSkeleton } from "@/components/skeletons/inventory";
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
import {
  useLocationHierarchy,
  useLocationDetail,
  useCreateWarehouseLocation,
  useUpdateWarehouseLocation,
  useDeleteWarehouseLocation,
} from "@/hooks/inventory";
import { queryKeys } from "@/lib/query-keys";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/inventory/locations" as any)({
  component: LocationsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/inventory" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Warehouse Locations" />
      <PageLayout.Content>
        <TreeDetailSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function LocationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
  const locations: WarehouseLocation[] = (hierarchyData ?? []).map((loc: any) => ({
    ...loc,
    isActive: loc.isActive ?? true,
  }));

  const locationContents: LocationContents[] = (locationDetailData?.contents ?? []).map((item: any) => ({
    id: item.id,
    productId: item.productId,
    productName: item.product?.name ?? "Unknown",
    productSku: item.product?.sku ?? "N/A",
    quantityOnHand: item.quantityOnHand ?? 0,
    quantityAllocated: item.quantityAllocated ?? 0,
    quantityAvailable: item.quantityAvailable ?? 0,
    unitCost: Number(item.unitCost) ?? 0,
    totalValue: Number(item.totalValue) ?? 0,
  }));

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
    async (data: any) => {
      if (formMode === "edit" && editingLocation) {
        await updateMutation.mutateAsync({
          id: editingLocation.id,
          data,
        });
      } else {
        await createMutation.mutateAsync(data);
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
        to: "/_authenticated/inventory/$itemId" as any,
        // @ts-expect-error - TanStack Router params type needs itemId, provided correctly
        params: { itemId: item.id },
      });
    },
    [navigate]
  );

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
    toast.success("Refreshed");
  }, [queryClient]);

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
              Are you sure you want to delete "{deletingLocation?.name}"? This
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

export default LocationsPage;
