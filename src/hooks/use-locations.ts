/**
 * Locations Hook
 *
 * Composable hook for warehouse location management.
 *
 * Features:
 * - Location hierarchy navigation
 * - Location CRUD operations
 * - Capacity and utilization tracking
 * - Location optimization suggestions
 *
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json
 */
import { useState, useCallback, useMemo, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import {
  listLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,
} from "@/server/functions/locations";
import { listInventory } from "@/server/functions/inventory";

// ============================================================================
// TYPES
// ============================================================================

export type LocationType = "warehouse" | "zone" | "aisle" | "rack" | "shelf" | "bin";

export interface WarehouseLocation {
  id: string;
  code: string;
  name: string;
  locationType: LocationType;
  parentId: string | null;
  parentPath: string[];
  capacity: number | null;
  currentOccupancy: number;
  utilization: number;
  isActive: boolean;
  attributes: Record<string, any>;
  childCount: number;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocationHierarchy extends WarehouseLocation {
  children: LocationHierarchy[];
}

export interface LocationContents {
  items: Array<{
    inventoryId: string;
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    totalValue: number;
  }>;
  totalItems: number;
  totalValue: number;
  utilization: number;
}

export interface LocationFilters {
  parentId?: string;
  type?: LocationType;
  active?: boolean;
  search?: string;
}

interface UseLocationsOptions {
  initialFilters?: LocationFilters;
  includeHierarchy?: boolean;
  autoFetch?: boolean;
}

interface UseLocationsResult {
  // Data
  locations: WarehouseLocation[];
  hierarchy: LocationHierarchy[];
  currentLocation: WarehouseLocation | null;
  contents: LocationContents | null;

  // State
  isLoading: boolean;
  isLoadingContents: boolean;
  isSubmitting: boolean;

  // Actions
  fetchLocations: (filters?: LocationFilters) => Promise<void>;
  fetchLocation: (locationId: string) => Promise<WarehouseLocation | null>;
  fetchContents: (locationId: string) => Promise<LocationContents | null>;
  createNewLocation: (data: CreateLocationData) => Promise<WarehouseLocation | null>;
  updateExistingLocation: (
    locationId: string,
    data: UpdateLocationData
  ) => Promise<WarehouseLocation | null>;
  deleteExistingLocation: (locationId: string) => Promise<boolean>;

  // Hierarchy helpers
  getParentChain: (locationId: string) => WarehouseLocation[];
  getChildren: (parentId: string) => WarehouseLocation[];
  findLocation: (locationId: string) => WarehouseLocation | undefined;

  // Optimization
  getSuggestedLocation: (productId: string, quantity: number) => Promise<WarehouseLocation | null>;

  // Filters
  filters: LocationFilters;
  setFilters: (filters: LocationFilters) => void;
}

interface CreateLocationData {
  code: string;
  name: string;
  locationType: LocationType;
  parentId?: string;
  capacity?: number;
  attributes?: Record<string, any>;
}

interface UpdateLocationData {
  code?: string;
  name?: string;
  capacity?: number;
  isActive?: boolean;
  attributes?: Record<string, any>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useLocations(options: UseLocationsOptions = {}): UseLocationsResult {
  const {
    initialFilters = {},
    includeHierarchy = false,
    autoFetch = false,
  } = options;

  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [hierarchy, setHierarchy] = useState<LocationHierarchy[]>([]);
  const [currentLocation, setCurrentLocation] = useState<WarehouseLocation | null>(null);
  const [contents, setContents] = useState<LocationContents | null>(null);
  const [filters, setFilters] = useState<LocationFilters>(initialFilters);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingContents, setIsLoadingContents] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch locations list
  const fetchLocations = useCallback(async (newFilters?: LocationFilters) => {
    try {
      setIsLoading(true);
      const activeFilters = newFilters ?? filters;
      if (newFilters) {
        setFilters(newFilters);
      }

      const data = (await (listLocations as any)({
        data: {
          page: 1,
          pageSize: 200,
          ...(activeFilters.parentId && { parentId: activeFilters.parentId }),
          ...(activeFilters.type && { type: activeFilters.type }),
          ...(activeFilters.active !== undefined && { active: activeFilters.active }),
          ...(activeFilters.search && { search: activeFilters.search }),
        },
      })) as any;

      if (data?.locations) {
        const mappedLocations = data.locations.map(mapLocationFromApi);
        setLocations(mappedLocations);

        // Build hierarchy if requested
        if (includeHierarchy) {
          setHierarchy(buildHierarchy(mappedLocations));
        }
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error);
      toast.error("Failed to load locations");
    } finally {
      setIsLoading(false);
    }
  }, [filters, includeHierarchy]);

  // Fetch single location
  const fetchLocation = useCallback(
    async (locationId: string): Promise<WarehouseLocation | null> => {
      try {
        setIsLoading(true);
        const data = (await (getLocation as any)({
          data: { id: locationId },
        })) as any;

        if (data?.location) {
          const location = mapLocationFromApi(data.location);
          setCurrentLocation(location);
          return location;
        }
        return null;
      } catch (error) {
        console.error("Failed to fetch location:", error);
        toast.error("Failed to load location");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Fetch location contents
  const fetchContents = useCallback(
    async (locationId: string): Promise<LocationContents | null> => {
      try {
        setIsLoadingContents(true);
        // Use listInventory to get items at this location
        const data = (await listInventory({
          data: { locationId, page: 1, pageSize: 100 },
        })) as any;

        if (data?.items) {
          const items = data.items.map((item: any) => ({
            inventoryId: item.id,
            productId: item.productId,
            productName: item.product?.name ?? "Unknown",
            productSku: item.product?.sku ?? "",
            quantity: item.quantityOnHand ?? 0,
            totalValue: Number(item.totalValue ?? 0),
          }));

          const totalValue = items.reduce(
            (sum: number, item: any) => sum + item.totalValue,
            0
          );

          // Get location capacity for utilization
          const loc = locations.find((l) => l.id === locationId);
          const totalQty = items.reduce(
            (sum: number, item: any) => sum + item.quantity,
            0
          );
          const utilization =
            loc?.capacity ? (totalQty / loc.capacity) * 100 : 0;

          const locationContents: LocationContents = {
            items,
            totalItems: items.length,
            totalValue,
            utilization,
          };
          setContents(locationContents);
          return locationContents;
        }
        return null;
      } catch (error) {
        console.error("Failed to fetch location contents:", error);
        return null;
      } finally {
        setIsLoadingContents(false);
      }
    },
    [locations]
  );

  // Create new location
  const createNewLocation = useCallback(
    async (data: CreateLocationData): Promise<WarehouseLocation | null> => {
      try {
        setIsSubmitting(true);
        const result = (await (createLocation as any)({
          data: {
            code: data.code,
            name: data.name,
            locationType: data.locationType,
            ...(data.parentId && { parentId: data.parentId }),
            ...(data.capacity !== undefined && { capacity: data.capacity }),
            ...(data.attributes && { attributes: data.attributes }),
          },
        })) as any;

        if (result?.location) {
          const location = mapLocationFromApi(result.location);
          toast.success("Location created", {
            description: `${location.name} (${location.code})`,
          });
          await fetchLocations();
          return location;
        }
        return null;
      } catch (error: any) {
        console.error("Failed to create location:", error);
        toast.error(error.message ?? "Failed to create location");
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchLocations]
  );

  // Update location
  const updateExistingLocation = useCallback(
    async (
      locationId: string,
      data: UpdateLocationData
    ): Promise<WarehouseLocation | null> => {
      try {
        setIsSubmitting(true);
        const result = (await (updateLocation as any)({
          data: {
            id: locationId,
            data: {
              ...(data.code && { code: data.code }),
              ...(data.name && { name: data.name }),
              ...(data.capacity !== undefined && { capacity: data.capacity }),
              ...(data.isActive !== undefined && { isActive: data.isActive }),
              ...(data.attributes && { attributes: data.attributes }),
            },
          },
        })) as any;

        if (result?.location) {
          const location = mapLocationFromApi(result.location);
          toast.success("Location updated");
          await fetchLocations();
          return location;
        }
        return null;
      } catch (error: any) {
        console.error("Failed to update location:", error);
        toast.error(error.message ?? "Failed to update location");
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchLocations]
  );

  // Delete location
  const deleteExistingLocation = useCallback(
    async (locationId: string): Promise<boolean> => {
      try {
        setIsSubmitting(true);
        await deleteLocation({
          data: { id: locationId },
        });

        toast.success("Location deleted");
        await fetchLocations();
        return true;
      } catch (error: any) {
        console.error("Failed to delete location:", error);
        toast.error(error.message ?? "Failed to delete location. Ensure it is empty.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchLocations]
  );

  // Get parent chain for a location
  const getParentChain = useCallback(
    (locationId: string): WarehouseLocation[] => {
      const chain: WarehouseLocation[] = [];
      let current = locations.find((l) => l.id === locationId);

      while (current) {
        chain.unshift(current);
        current = current.parentId
          ? locations.find((l) => l.id === current!.parentId)
          : undefined;
      }

      return chain;
    },
    [locations]
  );

  // Get children of a location
  const getChildren = useCallback(
    (parentId: string): WarehouseLocation[] => {
      return locations.filter((l) => l.parentId === parentId);
    },
    [locations]
  );

  // Find a location by ID
  const findLocation = useCallback(
    (locationId: string): WarehouseLocation | undefined => {
      return locations.find((l) => l.id === locationId);
    },
    [locations]
  );

  // Get suggested location for a product (optimization algorithm)
  const getSuggestedLocation = useCallback(
    async (_productId: string, quantity: number): Promise<WarehouseLocation | null> => {
      // Simple algorithm: find location with best fit (capacity - occupancy >= quantity)
      // Prioritize bins > shelves > racks with lowest utilization
      const availableLocations = locations
        .filter(
          (l) =>
            l.isActive &&
            l.capacity !== null &&
            l.capacity - l.currentOccupancy >= quantity
        )
        .sort((a, b) => {
          // Priority by type (more granular = better)
          const typePriority: Record<LocationType, number> = {
            bin: 1,
            shelf: 2,
            rack: 3,
            aisle: 4,
            zone: 5,
            warehouse: 6,
          };
          const typeCompare = typePriority[a.locationType] - typePriority[b.locationType];
          if (typeCompare !== 0) return typeCompare;

          // Then by utilization (lower = better)
          return a.utilization - b.utilization;
        });

      return availableLocations[0] ?? null;
    },
    [locations]
  );

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchLocations();
    }
  }, [autoFetch, fetchLocations]);

  return useMemo(
    () => ({
      locations,
      hierarchy,
      currentLocation,
      contents,
      isLoading,
      isLoadingContents,
      isSubmitting,
      fetchLocations,
      fetchLocation,
      fetchContents,
      createNewLocation,
      updateExistingLocation,
      deleteExistingLocation,
      getParentChain,
      getChildren,
      findLocation,
      getSuggestedLocation,
      filters,
      setFilters,
    }),
    [
      locations,
      hierarchy,
      currentLocation,
      contents,
      isLoading,
      isLoadingContents,
      isSubmitting,
      fetchLocations,
      fetchLocation,
      fetchContents,
      createNewLocation,
      updateExistingLocation,
      deleteExistingLocation,
      getParentChain,
      getChildren,
      findLocation,
      getSuggestedLocation,
      filters,
    ]
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function mapLocationFromApi(data: any): WarehouseLocation {
  return {
    id: data.id,
    code: data.code ?? "",
    name: data.name ?? "",
    locationType: data.locationType ?? "bin",
    parentId: data.parentId ?? null,
    parentPath: data.parentPath ?? [],
    capacity: data.capacity ?? null,
    currentOccupancy: data.currentOccupancy ?? 0,
    utilization: data.utilization ?? 0,
    isActive: data.isActive ?? true,
    attributes: data.attributes ?? {},
    childCount: data.childCount ?? 0,
    itemCount: data.itemCount ?? 0,
    createdAt: new Date(data.createdAt ?? Date.now()),
    updatedAt: new Date(data.updatedAt ?? Date.now()),
  };
}

function buildHierarchy(locations: WarehouseLocation[]): LocationHierarchy[] {
  const map = new Map<string, LocationHierarchy>();
  const roots: LocationHierarchy[] = [];

  // Create hierarchy nodes
  locations.forEach((loc) => {
    map.set(loc.id, { ...loc, children: [] });
  });

  // Build tree
  locations.forEach((loc) => {
    const node = map.get(loc.id)!;
    if (loc.parentId && map.has(loc.parentId)) {
      map.get(loc.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export default useLocations;
