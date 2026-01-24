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

// ============================================================================
// TYPES
// ============================================================================

export type LocationType = 'warehouse' | 'zone' | 'aisle' | 'rack' | 'shelf' | 'bin';

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
  const { initialFilters = {}, includeHierarchy = false, autoFetch = false } = options;
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<LocationFilters>(initialFilters);

  // Query for locations list
  const locationsQuery = useQuery({
    queryKey: queryKeys.locations.list(filters),
    queryFn: async () => {
      const data = (await (listLocations as any)({
        data: {
          page: 1,
          pageSize: 200,
          ...(filters.parentId && { parentId: filters.parentId }),
          ...(filters.type && { type: filters.type }),
          ...(filters.active !== undefined && { active: filters.active }),
          ...(filters.search && { search: filters.search }),
        },
      })) as any;

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
  const locations = locationsData?.locations ?? [];
  const hierarchy = locationsData?.hierarchy ?? [];

  // Query for single location details
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);
  const currentLocationQuery = useQuery({
    queryKey: queryKeys.locations.detail(currentLocationId || ''),
    queryFn: async () => {
      if (!currentLocationId) return null;
      const data = (await (getLocation as any)({
        data: { id: currentLocationId },
      })) as any;
      return data?.location ? mapLocationFromApi(data.location) : null;
    },
    enabled: !!currentLocationId,
    staleTime: 30 * 1000,
  });

  const currentLocation = currentLocationQuery.data ?? null;

  // Query for location contents
  const [currentContentsId, setCurrentContentsId] = useState<string | null>(null);
  const contentsQuery = useQuery({
    queryKey: queryKeys.locations.contents(currentContentsId || ''),
    queryFn: async () => {
      if (!currentContentsId) return null;
      const data = (await listInventory({
        data: { locationId: currentContentsId, page: 1, pageSize: 100 },
      })) as any;

      if (data?.items) {
        const totalValue = data.items.reduce(
          (sum: number, item: any) => sum + (item.totalValue || 0),
          0
        );
        const utilization =
          data.items.length > 0
            ? (data.items.reduce((sum: number, item: any) => sum + item.quantity, 0) /
                Math.max(...data.items.map((item: any) => item.capacity || 1))) *
              100
            : 0;

        return {
          items: data.items.map((item: any) => ({
            inventoryId: item.id,
            productId: item.productId,
            productName: item.productName,
            productSku: item.productSku,
            quantity: item.quantity,
            totalValue: item.totalValue,
          })),
          totalItems: data.items.length,
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
    mutationFn: async (data: CreateLocationData) => {
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
      return result?.location ? mapLocationFromApi(result.location) : null;
    },
    onSuccess: (location) => {
      if (location) {
        toast.success('Location created', {
          description: `${location.name} (${location.code})`,
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
      }
    },
    onError: (error: any) => {
      toast.error(error.message ?? 'Failed to create location');
    },
  });

  const createNewLocation = useCallback(
    async (data: CreateLocationData): Promise<WarehouseLocation | null> => {
      const result = await createLocationMutation.mutateAsync(data);
      return result ?? null;
    },
    [createLocationMutation]
  );

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async ({ locationId, data }: { locationId: string; data: UpdateLocationData }) => {
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
      return result?.location ? mapLocationFromApi(result.location) : null;
    },
    onSuccess: () => {
      toast.success('Location updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
    },
    onError: (error: any) => {
      toast.error(error.message ?? 'Failed to update location');
    },
  });

  const updateExistingLocation = useCallback(
    async (locationId: string, data: UpdateLocationData): Promise<WarehouseLocation | null> => {
      const result = await updateLocationMutation.mutateAsync({ locationId, data });
      return result ?? null;
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
    onError: (error: any) => {
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

function mapLocationFromApi(data: any): WarehouseLocation {
  return {
    id: data.id,
    code: data.code ?? '',
    name: data.name ?? '',
    locationType: data.locationType ?? 'bin',
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
