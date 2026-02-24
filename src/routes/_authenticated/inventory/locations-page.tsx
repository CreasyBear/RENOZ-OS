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
import { useState, useCallback, useMemo, useRef, type ChangeEvent } from "react";
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
import { LocationTree, type WarehouseLocation } from "@/components/domain/inventory/locations/location-tree";
import { LocationForm } from "@/components/domain/inventory/locations/location-form";
import { LocationDetail, type LocationContents } from "@/components/domain/inventory/locations/location-detail";
import type {
  WarehouseLocationWithChildren,
  LocationDetailApiResult,
  CreateWarehouseLocationInput,
  UpdateWarehouseLocationInput,
} from "@/lib/schemas/inventory/inventory";
import { locationTypeSchema } from "@/lib/schemas/inventory/inventory";
import {
  useLocationHierarchy,
  useLocationDetail,
  useCreateWarehouseLocation,
  useUpdateWarehouseLocation,
  useDeleteWarehouseLocation,
} from "@/hooks/inventory";
import { bulkCreateLocations } from "@/server/functions/inventory/locations";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function LocationsPage() {
  const navigate = useNavigate();
  const importInputRef = useRef<HTMLInputElement | null>(null);

  // State
  const [selectedLocation, setSelectedLocation] = useState<WarehouseLocation | null>(null);

  // Dialog states
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formParent, setFormParent] = useState<WarehouseLocation | null>(null);
  const [editingLocation, setEditingLocation] = useState<WarehouseLocation | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingLocation, setDeletingLocation] = useState<WarehouseLocation | null>(null);
  const [isImporting, setIsImporting] = useState(false);

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
  const flatLocations = useMemo(() => flattenLocations(locations), [locations]);

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
      try {
        if (formMode === "edit" && editingLocation) {
          await updateMutation.mutateAsync({
            id: editingLocation.id,
            data,
          });
        } else {
          await createMutation.mutateAsync(data as CreateWarehouseLocationInput);
        }
        setShowFormDialog(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save location");
      }
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

  const handleExport = useCallback(() => {
    const headers = [
      "locationCode",
      "name",
      "locationType",
      "parentCode",
      "capacity",
      "isActive",
      "isPickable",
      "isReceivable",
    ];
    const lines = [headers.join(",")];

    for (const location of flatLocations) {
      const row = [
        location.locationCode,
        location.name,
        location.locationType,
        location.parentCode ?? "",
        location.capacity != null ? String(location.capacity) : "",
        String(location.isActive ?? true),
        String(location.isPickable ?? true),
        String(location.isReceivable ?? true),
      ].map(escapeCsvValue);
      lines.push(row.join(","));
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `warehouse-locations-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success(`Exported ${flatLocations.length} location${flatLocations.length === 1 ? "" : "s"}`);
  }, [flatLocations]);

  const handleImportClick = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        setIsImporting(true);
        const text = await file.text();
        const rows = parseCsvRows(text);
        if (rows.length === 0) {
          toast.error("CSV is empty");
          return;
        }

        const headers = rows[0].map((h) => h.trim().toLowerCase());
        const getColumn = (name: string) => headers.indexOf(name.toLowerCase());
        const idxCode = getColumn("locationcode");
        const idxName = getColumn("name");
        const idxType = getColumn("locationtype");
        const idxParentCode = getColumn("parentcode");
        const idxCapacity = getColumn("capacity");
        const idxActive = getColumn("isactive");
        const idxPickable = getColumn("ispickable");
        const idxReceivable = getColumn("isreceivable");

        if (idxCode === -1 || idxName === -1 || idxType === -1) {
          toast.error("CSV must include headers: locationCode, name, locationType");
          return;
        }

        const parsedRows: Array<{
          locationCode: string;
          name: string;
          locationType: CreateWarehouseLocationInput["locationType"];
          parentCode: string | null;
          capacity: number | null;
          isActive: boolean;
          isPickable: boolean;
          isReceivable: boolean;
        }> = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length === 0 || row.every((cell) => cell.trim() === "")) continue;

          const locationCode = (row[idxCode] ?? "").trim();
          const name = (row[idxName] ?? "").trim();
          const locationTypeRaw = (row[idxType] ?? "").trim();
          const parentCodeRaw = idxParentCode >= 0 ? (row[idxParentCode] ?? "").trim() : "";
          const capacityRaw = idxCapacity >= 0 ? (row[idxCapacity] ?? "").trim() : "";
          const isActiveRaw = idxActive >= 0 ? (row[idxActive] ?? "").trim() : "true";
          const isPickableRaw = idxPickable >= 0 ? (row[idxPickable] ?? "").trim() : "true";
          const isReceivableRaw = idxReceivable >= 0 ? (row[idxReceivable] ?? "").trim() : "true";

          if (!locationCode || !name || !locationTypeRaw) {
            throw new Error(`Row ${i + 1}: locationCode, name, and locationType are required`);
          }

          const typeParse = locationTypeSchema.safeParse(locationTypeRaw);
          if (!typeParse.success) {
            throw new Error(`Row ${i + 1}: invalid locationType "${locationTypeRaw}"`);
          }

          const capacity =
            capacityRaw === "" ? null : Number.isFinite(Number(capacityRaw)) ? Number(capacityRaw) : NaN;
          if (Number.isNaN(capacity)) {
            throw new Error(`Row ${i + 1}: invalid capacity "${capacityRaw}"`);
          }

          parsedRows.push({
            locationCode,
            name,
            locationType: typeParse.data,
            parentCode: parentCodeRaw || null,
            capacity,
            isActive: parseBooleanCsv(isActiveRaw, true),
            isPickable: parseBooleanCsv(isPickableRaw, true),
            isReceivable: parseBooleanCsv(isReceivableRaw, true),
          });
        }

        if (parsedRows.length === 0) {
          toast.error("No import rows found");
          return;
        }

        const fileCodeSet = new Set<string>();
        for (const row of parsedRows) {
          const normalized = row.locationCode.toLowerCase();
          if (fileCodeSet.has(normalized)) {
            throw new Error(`Duplicate locationCode in file: ${row.locationCode}`);
          }
          fileCodeSet.add(normalized);
        }

        const knownByCode = new Map(
          flatLocations.map((loc) => [loc.locationCode.toLowerCase(), loc.id])
        );
        const pending = [...parsedRows];
        let createdCount = 0;

        while (pending.length > 0) {
          const creatable = pending.filter(
            (row) => !row.parentCode || knownByCode.has(row.parentCode.toLowerCase())
          );

          if (creatable.length === 0) {
            const unresolved = pending.map((row) => `${row.locationCode} -> ${row.parentCode}`).slice(0, 10);
            throw new Error(`Unresolved parentCode references: ${unresolved.join(", ")}`);
          }

          const payload: CreateWarehouseLocationInput[] = creatable.map((row) => ({
            locationCode: row.locationCode,
            name: row.name,
            locationType: row.locationType,
            parentId: row.parentCode ? knownByCode.get(row.parentCode.toLowerCase()) ?? null : null,
            capacity: row.capacity,
            isActive: row.isActive,
            isPickable: row.isPickable,
            isReceivable: row.isReceivable,
          }));

          const result = await bulkCreateLocations({ data: { locations: payload } });
          createdCount += result.createdCount;
          for (const loc of result.locations) {
            knownByCode.set(loc.locationCode.toLowerCase(), loc.id);
          }

          const createdCodeSet = new Set(creatable.map((row) => row.locationCode.toLowerCase()));
          for (let i = pending.length - 1; i >= 0; i--) {
            if (createdCodeSet.has(pending[i].locationCode.toLowerCase())) {
              pending.splice(i, 1);
            }
          }
        }

        await refetchHierarchy();
        toast.success(`Imported ${createdCount} location${createdCount === 1 ? "" : "s"}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to import locations");
      } finally {
        setIsImporting(false);
        event.target.value = "";
      }
    },
    [flatLocations, refetchHierarchy]
  );

  const isSubmitting =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || isImporting;

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
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportClick}
              disabled={isImporting}
            >
              <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
              {isImporting ? "Importing..." : "Import"}
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleImportFileChange}
            />
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
        submitError={(createMutation.error ?? updateMutation.error)?.message ?? null}
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

function flattenLocations(
  locations: WarehouseLocation[],
  parentCode: string | null = null
): Array<{
  id: string;
  locationCode: string;
  name: string;
  locationType: string;
  parentCode: string | null;
  capacity: number | null | undefined;
  isActive: boolean | undefined;
  isPickable: boolean | undefined;
  isReceivable: boolean | undefined;
}> {
  return locations.flatMap((loc) => [
    {
      id: loc.id,
      locationCode: loc.locationCode,
      name: loc.name,
      locationType: loc.locationType,
      parentCode,
      capacity: loc.capacity,
      isActive: loc.isActive,
      isPickable: loc.isPickable,
      isReceivable: loc.isReceivable,
    },
    ...flattenLocations(loc.children ?? [], loc.locationCode),
  ]);
}

function escapeCsvValue(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }
  return value;
}

function parseCsvRows(content: string): string[][] {
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        currentCell += "\"";
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

function parseBooleanCsv(value: string, defaultValue: boolean): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return defaultValue;
  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;
  return defaultValue;
}
