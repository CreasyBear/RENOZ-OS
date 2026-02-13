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
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '../_shared/use-toast';
import {
  listLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,
} from '@/server/functions/inventory/locations';
import { listInventory } from '@/server/functions/inventory/inventory';
import type {
  LocationType,
  HookWarehouseLocation,
  HookLocationHierarchy,
  HookLocationContents,
  HookLocationFilters,
  CreateLocationInput,
  UpdateLocationInput,
  CreateWarehouseLocationInput,
  UpdateWarehouseLocationInput,
} from '@/lib/schemas/inventory';

// ============================================================================
// TYPE RE-EXPORTS FOR BACKWARDS COMPATIBILITY
// ============================================================================

export type { LocationType } from '@/lib/schemas/inventory';
export type WarehouseLocation = HookWarehouseLocation;
export type LocationHierarchy = HookLocationHierarchy;
export type LocationContents = HookLocationContents;
export type LocationFilters = HookLocationFilters;

// ============================================================================
// HOOK INTERFACE TYPES
// ============================================================================

interface UseLocationsOptions {
  initialFilters?: HookLocationFilters;
  includeHierarchy?: boolean;
  autoFetch?: boolean;
}

interface UseLocationsResult {
  // Data
  locations: HookWarehouseLocation[];
  hierarchy: HookLocationHierarchy[];
  currentLocation: HookWarehouseLocation | null;
  contents: HookLocationContents | null;

  // State
  isLoading: boolean;
  isLoadingContents: boolean;
  isSubmitting: boolean;

  // Actions
  fetchLocations: (filters?: HookLocationFilters) => Promise<void>;
  fetchLocation: (locationId: string) => Promise<HookWarehouseLocation | null>;
  fetchContents: (locationId: string) => Promise<HookLocationContents | null>;
  createNewLocation: (data: CreateLocationInput) => Promise<HookWarehouseLocation | null>;
  updateExistingLocation: (
    locationId: string,
    data: UpdateLocationInput
  ) => Promise<HookWarehouseLocation | null>;
  deleteExistingLocation: (locationId: string) => Promise<boolean>;

  // Hierarchy helpers
  getParentChain: (locationId: string) => HookWarehouseLocation[];
  getChildren: (parentId: string) => HookWarehouseLocation[];
  findLocation: (locationId: string) => HookWarehouseLocation | undefined;

  // Optimization
  getSuggestedLocation: (productId: string, quantity: number) => Promise<HookWarehouseLocation | null>;

  // Filters
  filters: HookLocationFilters;
  setFilters: (filters: HookLocationFilters) => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useLocations(options: UseLocationsOptions = {}): UseLocationsResult {
  const { initialFilters = {}, includeHierarchy = false, autoFetch = false } = options;
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<HookLocationFilters>(initialFilters);

  // Query for locations list
  const locationsQuery = useQuery({
    queryKey: queryKeys.locations.list(filters),
    queryFn: async () => {
      const data = await listLocations({
        data: {
          page: 1,
          pageSize: 200,
          ...(filters.parentId && { parentId: filters.parentId }),
          ...(filters.type && { locationType: filters.type }),
          ...(filters.active !== undefined && { isActive: filters.active }),
          ...(filters.search && { search: filters.search }),
        },
      });

      if (data?.locations) {
        const mappedLocations = data.locations.map(mapLocationFromApi);
        return {
          locations: mappedLocations,
          hierarchy: includeHierarchy ? buildHierarchy(mappedLocations) : [],
        };
      }
      return { locations: [], hierarchy: [] };
    },
    enabled: autoFetch,
    staleTime: 30 * 1000, // 30 seconds
  });

  const { data: locationsData, isLoading } = locationsQuery;
  const locations = useMemo(() => locationsData?.locations ?? [], [locationsData]);
  const hierarchy = useMemo(() => locationsData?.hierarchy ?? [], [locationsData]);

  // Query for single location details
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);
  const currentLocationQuery = useQuery({
    queryKey: queryKeys.locations.detail(currentLocationId || ''),
    queryFn: async () => {
      if (!currentLocationId) return null;
      const data = await getLocation({
        data: { id: currentLocationId },
      });
      return data?.location ? mapLocationDetailFromApi(data.location) : null;
    },
    enabled: !!currentLocationId,
    staleTime: 30 * 1000,
  });

  const currentLocation = currentLocationQuery.data ?? null;

  // Query for location contents
  const [currentContentsId, setCurrentContentsId] = useState<string | null>(null);
  const contentsQuery = useQuery({
    queryKey: queryKeys.locations.contents(currentContentsId || ''),
    queryFn: async (): Promise<HookLocationContents | null> => {
      if (!currentContentsId) return null;
      const data = await listInventory({
        data: { locationId: currentContentsId, page: 1, pageSize: 100 },
      });

      if (data?.items) {
        // ListInventoryResult.items contains inventory items with product/location relations
        // The items match the Inventory type from schema which includes all needed fields
        const items = data.items;
        const totalValue = items.reduce(
          (sum, item) => sum + (item.totalValue || 0),
          0
        );
        const quantities = items.map(item => item.quantityOnHand ?? 0);
        const capacities = items.map(item => item.location?.capacity ?? 1);
        const utilization =
          items.length > 0
            ? (quantities.reduce((sum, q) => sum + q, 0) /
                Math.max(...capacities)) *
              100
            : 0;

        return {
          items: items.map((item) => ({
            inventoryId: item.id,
            productId: item.productId,
            productName: item.product?.name ?? '',
            productSku: item.product?.sku ?? '',
            quantity: item.quantityOnHand ?? 0,
            totalValue: item.totalValue ?? 0,
          })),
          totalItems: items.length,
          totalValue,
          utilization,
        };
      }
      return null;
    },
    enabled: !!currentContentsId,
    staleTime: 30 * 1000,
  });

  const contents = contentsQuery.data ?? null;

  // Fetch locations list
  const fetchLocations = useCallback(
    async (newFilters?: LocationFilters) => {
      if (newFilters) {
        setFilters(newFilters);
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.locations.list(newFilters ?? filters),
      });
    },
    [filters, queryClient]
  );

  // Fetch single location
  const fetchLocation = useCallback(
    async (locationId: string): Promise<WarehouseLocation | null> => {
      setCurrentLocationId(locationId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.locations.detail(locationId) });
      return currentLocationQuery.data ?? null;
    },
    [queryClient, currentLocationQuery.data]
  );

  // Fetch location contents
  const fetchContents = useCallback(
    async (locationId: string): Promise<LocationContents | null> => {
      setCurrentContentsId(locationId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.locations.contents(locationId) });
      return contentsQuery.data ?? null;
    },
    [queryClient, contentsQuery.data]
  );

  // Create location mutation
  const createLocationMutation = useMutation({
    mutationFn: async (data: CreateLocationInput) => {
      const result = await createLocation({
        data: {
          code: data.code,
          name: data.name,
          ...(data.parentId && { parentId: data.parentId }),
          ...(data.capacity !== undefined && { capacity: data.capacity }),
          ...(data.attributes && { attributes: data.attributes }),
        },
      });
      return result?.location ? mapLocationDetailFromApi(result.location) : null;
    },
    onSuccess: (location) => {
      if (location) {
        toast.success('Location created', {
          description: `${location.name} (${location.code})`,
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Failed to create location');
    },
  });

  const createNewLocation = useCallback(
    async (data: CreateLocationInput): Promise<HookWarehouseLocation | null> => {
      const result = await createLocationMutation.mutateAsync(data);
      if (result == null) throw new Error('Query returned no data');

      return result;
    },
    [createLocationMutation]
  );

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async ({ locationId, data }: { locationId: string; data: UpdateLocationInput }) => {
      const result = await updateLocation({
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
      });
      return result?.location ? mapUpdateResultFromApi(result.location) : null;
    },
    onSuccess: () => {
      toast.success('Location updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Failed to update location');
    },
  });

  const updateExistingLocation = useCallback(
    async (locationId: string, data: UpdateLocationInput): Promise<HookWarehouseLocation | null> => {
      const result = await updateLocationMutation.mutateAsync({ locationId, data });
      if (result == null) throw new Error('Query returned no data');

      return result;
    },
    [updateLocationMutation]
  );

  // Delete location mutation
  const deleteLocationMutation = useMutation({
    mutationFn: async (locationId: string) => {
      await deleteLocation({
        data: { id: locationId },
      });
      return locationId;
    },
    onSuccess: () => {
      toast.success('Location deleted');
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Failed to delete location. Ensure it is empty.');
    },
  });

  const deleteExistingLocation = useCallback(
    async (locationId: string): Promise<boolean> => {
      try {
        await deleteLocationMutation.mutateAsync(locationId);
        return true;
      } catch {
        return false;
      }
    },
    [deleteLocationMutation]
  );

  // isSubmitting comes from mutations
  const isSubmitting =
    createLocationMutation.isPending ||
    updateLocationMutation.isPending ||
    deleteLocationMutation.isPending;

  // Get parent chain for a location
  const getParentChain = useCallback(
    (locationId: string): WarehouseLocation[] => {
      const chain: WarehouseLocation[] = [];
      let current = locations.find((l: WarehouseLocation) => l.id === locationId);

      while (current) {
        chain.unshift(current);
        current = current.parentId
          ? locations.find((l: WarehouseLocation) => l.id === current!.parentId)
          : undefined;
      }

      return chain;
    },
    [locations]
  );

  // Get children of a location
  const getChildren = useCallback(
    (parentId: string): WarehouseLocation[] => {
      return locations.filter((l: WarehouseLocation) => l.parentId === parentId);
    },
    [locations]
  );

  // Find a location by ID
  const findLocation = useCallback(
    (locationId: string): WarehouseLocation | undefined => {
      return locations.find((l: WarehouseLocation) => l.id === locationId);
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
          (l: WarehouseLocation) =>
            l.isActive && l.capacity !== null && l.capacity - l.currentOccupancy >= quantity
        )
        .sort((a: WarehouseLocation, b: WarehouseLocation) => {
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

  return useMemo(
    () => ({
      locations,
      hierarchy,
      currentLocation,
      contents,
      isLoading,
      isLoadingContents: contentsQuery.isLoading,
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
      contentsQuery.isLoading,
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

/**
 * Server response types - inferred from server functions for type safety
 * Uses TypeScript type inference to get the actual return types
 */
type ListLocationsResponse = Awaited<ReturnType<typeof listLocations>>;
type GetLocationResponse = Awaited<ReturnType<typeof getLocation>>;
type UpdateLocationResponse = Awaited<ReturnType<typeof updateLocation>>;

// Location record from list response
type ServerLocationRecord = ListLocationsResponse['locations'][number];
// Location record from getLocation response
type ServerLocationDetail = GetLocationResponse['location'];
// Location record from update response
type ServerLocationUpdateResult = UpdateLocationResponse['location'];

/**
 * Maps a server location record from list response to the hook's representation
 */
function mapLocationFromApi(data: ServerLocationRecord): HookWarehouseLocation {
  return {
    id: data.id,
    code: data.locationCode,
    name: data.name,
    locationType: data.locationType,
    parentId: data.parentId,
    parentPath: [],
    capacity: data.capacity,
    currentOccupancy: 0, // Calculated separately via inventory queries
    utilization: 0, // Calculated separately via inventory queries
    isActive: data.isActive ?? true,
    // Spread to convert LocationAttributes to plain Record
    attributes: data.attributes ? { ...data.attributes } : {},
    childCount: 0, // Populated via separate hierarchy query
    itemCount: 0, // Populated via separate inventory query
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/**
 * Maps a server location detail response to the hook's representation
 * (Same underlying type as list, but separate function for type clarity)
 */
function mapLocationDetailFromApi(data: ServerLocationDetail): HookWarehouseLocation {
  return {
    id: data.id,
    code: data.locationCode,
    name: data.name,
    locationType: data.locationType,
    parentId: data.parentId,
    parentPath: [],
    capacity: data.capacity,
    currentOccupancy: 0,
    utilization: 0,
    isActive: data.isActive ?? true,
    attributes: data.attributes ? { ...data.attributes } : {},
    childCount: 0,
    itemCount: 0,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/**
 * Maps an update response location to the hook's representation
 */
function mapUpdateResultFromApi(data: ServerLocationUpdateResult): HookWarehouseLocation {
  return {
    id: data.id,
    code: data.locationCode,
    name: data.name,
    locationType: data.locationType,
    parentId: data.parentId,
    parentPath: [],
    capacity: data.capacity,
    currentOccupancy: 0,
    utilization: 0,
    isActive: data.isActive ?? true,
    attributes: data.attributes ? { ...data.attributes } : {},
    childCount: 0,
    itemCount: 0,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function buildHierarchy(locations: HookWarehouseLocation[]): HookLocationHierarchy[] {
  const map = new Map<string, HookLocationHierarchy>();
  const roots: HookLocationHierarchy[] = [];

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

// ============================================================================
// SIMPLE FOCUSED HOOKS
// ============================================================================

import {
  getWarehouseLocationHierarchy,
  getLocation as getLocationDetail,
  createWarehouseLocation,
  updateWarehouseLocation,
  deleteWarehouseLocation,
} from '@/server/functions/inventory/locations';

/**
 * Fetch warehouse location hierarchy
 */
export function useLocationHierarchy(rootId?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.locations.hierarchy(rootId),
    queryFn: async () => {
      const data = await getWarehouseLocationHierarchy({ data: { id: rootId } });
      return data?.hierarchy ?? [];
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch location detail with contents
 */
export function useLocationDetail(locationId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.locations.detail(locationId),
    queryFn: async () => {
      const data = await getLocationDetail({ data: { id: locationId } });
      return data ?? null;
    },
    enabled: enabled && !!locationId,
    staleTime: 30 * 1000,
  });
}

// Types imported from schema - CreateWarehouseLocationInput, UpdateWarehouseLocationInput

/**
 * Create a warehouse location
 */
export function useCreateWarehouseLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWarehouseLocationInput) =>
      createWarehouseLocation({ data }),
    onSuccess: () => {
      toast.success('Location created');
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create location');
    },
  });
}

/**
 * Update a warehouse location
 */
export function useUpdateWarehouseLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWarehouseLocationInput }) =>
      updateWarehouseLocation({ data: { id, data } }),
    onSuccess: (_data, variables) => {
      toast.success('Location updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.detail(variables.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update location');
    },
  });
}

/**
 * Delete a warehouse location
 */
export function useDeleteWarehouseLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (locationId: string) =>
      deleteWarehouseLocation({ data: { id: locationId } }),
    onSuccess: () => {
      toast.success('Location deleted');
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete location');
    },
  });
}
