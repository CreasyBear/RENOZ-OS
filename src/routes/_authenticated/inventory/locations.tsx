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
import { useState, useCallback, useEffect } from "react";
import { Plus, Upload, Download, RefreshCw } from "lucide-react";
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
  type WarehouseLocation,
} from "@/components/domain/inventory";
import { LocationForm } from "@/components/domain/inventory";
import {
  LocationDetail,
  type LocationContents,
} from "@/components/domain/inventory";
import {
  getWarehouseLocationHierarchy,
  getLocation,
  createWarehouseLocation,
  updateWarehouseLocation,
  deleteWarehouseLocation,
} from "@/server/functions/locations";

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

  // State
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<WarehouseLocation | null>(null);
  const [locationContents, setLocationContents] = useState<LocationContents[]>([]);
  const [locationMetrics, setLocationMetrics] = useState<{
    itemCount: number;
    totalQuantity: number;
    totalValue: number;
  } | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog states
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formParent, setFormParent] = useState<WarehouseLocation | null>(null);
  const [editingLocation, setEditingLocation] = useState<WarehouseLocation | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingLocation, setDeletingLocation] = useState<WarehouseLocation | null>(null);

  // Fetch location hierarchy
  const fetchLocations = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getWarehouseLocationHierarchy({ data: {} });
      if (data && typeof data === 'object' && 'hierarchy' in data && data.hierarchy) {
        setLocations(data.hierarchy as unknown as WarehouseLocation[]);
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error);
      toast.error("Failed to load locations");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch location detail
  const fetchLocationDetail = useCallback(async (locationId: string) => {
    try {
      setIsLoadingDetail(true);
      const data = await getLocation({ data: { id: locationId } });
      if (data) {
        setLocationContents(
          (data.contents || []).map((item: any) => ({
            id: item.id,
            productId: item.productId,
            productName: item.product?.name ?? "Unknown",
            productSku: item.product?.sku ?? "N/A",
            quantityOnHand: item.quantityOnHand ?? 0,
            quantityAllocated: item.quantityAllocated ?? 0,
            quantityAvailable: item.quantityAvailable ?? 0,
            unitCost: Number(item.unitCost) ?? 0,
            totalValue: Number(item.totalValue) ?? 0,
          }))
        );
        setLocationMetrics(data.metrics);
      }
    } catch (error) {
      console.error("Failed to fetch location detail:", error);
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchLocations();
  }, []);

  // Fetch detail when selection changes
  useEffect(() => {
    if (selectedLocation) {
      fetchLocationDetail(selectedLocation.id);
    } else {
      setLocationContents([]);
      setLocationMetrics(null);
    }
  }, [selectedLocation, fetchLocationDetail]);

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
      try {
        setIsSubmitting(true);
        if (formMode === "edit" && editingLocation) {
          await updateWarehouseLocation({
            data: { id: editingLocation.id, data },
          });
          toast.success("Location updated");
        } else {
          await createWarehouseLocation({ data });
          toast.success("Location created");
        }
        setShowFormDialog(false);
        fetchLocations();
      } catch (error: any) {
        toast.error(error.message || "Failed to save location");
      } finally {
        setIsSubmitting(false);
      }
    },
    [formMode, editingLocation, fetchLocations]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingLocation) return;
    try {
      await deleteWarehouseLocation({ data: { id: deletingLocation.id } });
      toast.success("Location deleted");
      setShowDeleteDialog(false);
      setDeletingLocation(null);
      if (selectedLocation?.id === deletingLocation.id) {
        setSelectedLocation(null);
      }
      fetchLocations();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete location");
    }
  }, [deletingLocation, selectedLocation, fetchLocations]);

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
    fetchLocations();
    if (selectedLocation) {
      fetchLocationDetail(selectedLocation.id);
    }
    toast.success("Refreshed");
  }, [fetchLocations, fetchLocationDetail, selectedLocation]);

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
