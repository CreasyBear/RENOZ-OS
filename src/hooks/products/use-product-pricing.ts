/**
 * Product Pricing Hooks
 *
 * TanStack Query hooks for product pricing management:
 * - Price resolution (customer/tier/base)
 * - Price tier CRUD
 * - Customer-specific pricing
 * - Price history
 * - Bulk price updates
 *
 * @see src/server/functions/products/product-pricing.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '../_shared/use-toast';
import {
  resolvePrice,
  listPriceTiers,
  createPriceTier,
  updatePriceTier,
  deletePriceTier,
  setPriceTiers,
  listCustomerPrices,
  setCustomerPrice,
  deleteCustomerPrice,
  getPriceHistory,
  bulkUpdatePrices,
  applyPriceAdjustment,
} from '@/server/functions/products/product-pricing';

// ============================================================================
// TYPES
// ============================================================================

export interface UsePriceTiersOptions {
  productId: string;
  enabled?: boolean;
}

export interface UseCustomerPricesOptions {
  productId?: string;
  customerId?: string;
  enabled?: boolean;
}

export interface UsePriceHistoryOptions {
  productId: string;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

export interface UseResolvePriceOptions {
  productId: string;
  customerId?: string;
  quantity?: number;
  enabled?: boolean;
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Resolve the final price for a product based on customer and quantity.
 */
export function useResolvePrice({
  productId,
  customerId,
  quantity = 1,
  enabled = true,
}: UseResolvePriceOptions) {
  return useQuery({
    queryKey: queryKeys.products.pricing.resolve(productId, { customerId, quantity }),
    queryFn: async () => {
      const result = await resolvePrice({
        data: { productId, customerId, quantity } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!productId,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch price tiers for a product.
 */
export function usePriceTiers({ productId, enabled = true }: UsePriceTiersOptions) {
  return useQuery({
    queryKey: queryKeys.products.pricing.tiers(productId),
    queryFn: async () => {
      const result = await listPriceTiers({
        data: { productId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!productId,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch customer-specific prices.
 */
export function useCustomerPrices({
  productId,
  customerId,
  enabled = true,
}: UseCustomerPricesOptions) {
  return useQuery({
    queryKey: queryKeys.products.pricing.customer(productId ?? '', customerId),
    queryFn: async () => {
      const result = await listCustomerPrices({
        data: { productId, customerId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && (!!productId || !!customerId),
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch price history for a product.
 */
export function usePriceHistory({
  productId,
  limit = 50,
  offset = 0,
  enabled = true,
}: UsePriceHistoryOptions) {
  return useQuery({
    queryKey: queryKeys.products.pricing.history(productId),
    queryFn: async () => {
      const result = await getPriceHistory({
        data: { productId, limit, offset } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!productId,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// PRICE TIER MUTATION HOOKS
// ============================================================================

/**
 * Create a new price tier.
 */
export function useCreatePriceTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof createPriceTier>[0]['data']) =>
      createPriceTier({ data }),
    onSuccess: (result) => {
      toast.success('Price tier created');
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.pricing.tiers(result.productId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create price tier');
    },
  });
}

/**
 * Update an existing price tier.
 */
export function useUpdatePriceTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof updatePriceTier>[0]['data']) =>
      updatePriceTier({ data }),
    onSuccess: (result) => {
      toast.success('Price tier updated');
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.pricing.tiers(result.productId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update price tier');
    },
  });
}

/**
 * Delete a price tier.
 */
export function useDeletePriceTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tierId: string) => deletePriceTier({ data: { id: tierId } }),
    onSuccess: () => {
      toast.success('Price tier deleted');
      // Invalidate all tier queries since we don't have productId
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.pricing.all,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete price tier');
    },
  });
}

/**
 * Bulk set price tiers for a product (replaces all existing).
 */
export function useSetPriceTiers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof setPriceTiers>[0]['data']) =>
      setPriceTiers({ data }),
    onSuccess: (_, variables) => {
      toast.success('Price tiers updated');
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.pricing.tiers(variables.productId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to set price tiers');
    },
  });
}

// ============================================================================
// CUSTOMER PRICE MUTATION HOOKS
// ============================================================================

/**
 * Create or update customer-specific price.
 */
export function useSetCustomerPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof setCustomerPrice>[0]['data']) =>
      setCustomerPrice({ data }),
    onSuccess: (result) => {
      toast.success('Customer price set');
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.pricing.customer(result.productId, result.customerId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to set customer price');
    },
  });
}

/**
 * Delete customer-specific price.
 */
export function useDeleteCustomerPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (priceId: string) => deleteCustomerPrice({ data: { id: priceId } }),
    onSuccess: () => {
      toast.success('Customer price removed');
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.pricing.all,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete customer price');
    },
  });
}

// ============================================================================
// BULK PRICE MUTATION HOOKS
// ============================================================================

/**
 * Bulk update prices for multiple products.
 */
export function useBulkUpdatePrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof bulkUpdatePrices>[0]['data']) =>
      bulkUpdatePrices({ data }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Updated prices for ${result.updated} product${result.updated !== 1 ? 's' : ''}`);
      } else {
        toast.warning(`Updated ${result.updated} products, ${result.failed.length} failed`);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.pricing.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update prices');
    },
  });
}

/**
 * Apply percentage price adjustment to multiple products.
 */
export function useApplyPriceAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof applyPriceAdjustment>[0]['data']) =>
      applyPriceAdjustment({ data }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Adjusted prices for ${result.updated} product${result.updated !== 1 ? 's' : ''}`);
      } else {
        toast.warning(`Adjusted ${result.updated} products, ${result.failed.length} failed`);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.pricing.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to apply price adjustment');
    },
  });
}
