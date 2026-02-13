/**
 * Product Bundle Hooks
 *
 * TanStack Query hooks for product bundle operations:
 * - Bundle components list
 * - Bundle component mutations (add, update, remove, set)
 * - Bundle price calculation
 * - Bundle validation
 *
 * @see src/lib/query-keys.ts for centralized query keys
 * @see src/server/functions/products/product-bundles.ts for server functions
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { toast } from 'sonner';
import {
  getBundleComponents,
  addBundleComponent,
  updateBundleComponent,
  removeBundleComponent,
  calculateBundlePrice,
  validateBundle,
  setBundleComponents,
  expandBundle,
  findBundlesContaining,
} from '@/server/functions/products/product-bundles';

// ============================================================================
// TYPES
// ============================================================================

export interface BundleComponent {
  id: string;
  componentProductId: string;
  quantity: number;
  isOptional: boolean;
  sortOrder: number;
  componentProduct: {
    id: string;
    sku: string;
    name: string;
    basePrice: number | null;
    type: string;
    status: string;
  };
}

export interface UseBundleComponentsOptions {
  bundleProductId: string;
  enabled?: boolean;
}

export interface AddBundleComponentInput {
  bundleProductId: string;
  component: {
    componentProductId: string;
    quantity: number;
    isOptional?: boolean;
    sortOrder?: number;
  };
}

export interface UpdateBundleComponentInput {
  id: string;
  quantity?: number;
  isOptional?: boolean;
  sortOrder?: number;
  bundleProductId: string; // For cache invalidation
}

export interface RemoveBundleComponentInput {
  id: string;
  bundleProductId: string; // For cache invalidation
}

export interface SetBundleComponentsInput {
  bundleProductId: string;
  components: {
    componentProductId: string;
    quantity: number;
    isOptional?: boolean;
  }[];
}

// ============================================================================
// BUNDLE COMPONENTS QUERIES
// ============================================================================

/**
 * Fetch bundle components for a product
 */
export function useBundleComponents({
  bundleProductId,
  enabled = true,
}: UseBundleComponentsOptions) {
  return useQuery({
    queryKey: queryKeys.products.bundles.components(bundleProductId),
    queryFn: async () => {
      const result = await getBundleComponents({
        data: { bundleProductId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!bundleProductId,
    staleTime: 30 * 1000,
  });
}

/**
 * Calculate bundle price
 */
export function useCalculateBundlePrice({
  bundleProductId,
  enabled = true,
}: UseBundleComponentsOptions) {
  return useQuery({
    queryKey: queryKeys.products.bundles.price(bundleProductId),
    queryFn: async () => {
      const result = await calculateBundlePrice({
        data: { bundleProductId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!bundleProductId,
    staleTime: 30 * 1000,
  });
}

/**
 * Validate bundle configuration
 */
export function useValidateBundle({
  bundleProductId,
  enabled = true,
}: UseBundleComponentsOptions) {
  return useQuery({
    queryKey: queryKeys.products.bundles.validation(bundleProductId),
    queryFn: async () => {
      const result = await validateBundle({
        data: { bundleProductId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!bundleProductId,
    staleTime: 60 * 1000,
  });
}

/**
 * Expand bundle to get all components including nested bundles
 */
export function useExpandBundle({
  bundleProductId,
  enabled = true,
}: UseBundleComponentsOptions) {
  return useQuery({
    queryKey: queryKeys.products.bundles.expanded(bundleProductId),
    queryFn: async () => {
      const result = await expandBundle({
        data: { bundleProductId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!bundleProductId,
    staleTime: 60 * 1000,
  });
}

/**
 * Find bundles containing a product
 */
export function useBundlesContainingProduct({
  productId,
  enabled = true,
}: { productId: string; enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.products.bundles.containing(productId),
    queryFn: async () => {
      const result = await findBundlesContaining({
        data: { productId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!productId,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// BUNDLE COMPONENT MUTATIONS
// ============================================================================

/**
 * Add a component to a bundle
 */
export function useAddBundleComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddBundleComponentInput) =>
      addBundleComponent({ data: input }),
    onSuccess: (_, variables) => {
      toast.success('Component added to bundle');
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.bundles.components(variables.bundleProductId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.bundles.price(variables.bundleProductId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.bundles.validation(variables.bundleProductId),
      });
    },
    onError: () => {
      toast.error('Failed to add component to bundle');
    },
  });
}

/**
 * Update a bundle component
 */
export function useUpdateBundleComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateBundleComponentInput) => {
      const { bundleProductId, ...data } = input;
      return updateBundleComponent({ data });
    },
    onSuccess: (_, variables) => {
      toast.success('Component updated');
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.bundles.components(variables.bundleProductId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.bundles.price(variables.bundleProductId),
      });
    },
    onError: () => {
      toast.error('Failed to update component');
    },
  });
}

/**
 * Remove a component from a bundle
 */
export function useRemoveBundleComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RemoveBundleComponentInput) => {
      const { bundleProductId, ...data } = input;
      return removeBundleComponent({ data });
    },
    onSuccess: (_, variables) => {
      toast.success('Component removed from bundle');
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.bundles.components(variables.bundleProductId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.bundles.price(variables.bundleProductId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.bundles.validation(variables.bundleProductId),
      });
    },
    onError: () => {
      toast.error('Failed to remove component');
    },
  });
}

/**
 * Set all bundle components at once
 */
export function useSetBundleComponents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SetBundleComponentsInput) =>
      setBundleComponents({ data }),
    onSuccess: (_, variables) => {
      toast.success('Bundle components updated');
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.bundles.components(variables.bundleProductId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.bundles.price(variables.bundleProductId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.bundles.validation(variables.bundleProductId),
      });
    },
    onError: () => {
      toast.error('Failed to update bundle components');
    },
  });
}
