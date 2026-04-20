/**
 * Supplier Hooks
 *
 * TanStack Query hooks for supplier data fetching:
 * - Supplier list with pagination and filtering
 * - Supplier detail view
 * - Supplier mutations (create, update, delete)
 * - Supplier performance tracking
 *
 * @see SUPP-INTEGRATION-API story
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, type SupplierFilters } from '@/lib/query-keys';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  updateSupplierRating,
  getSupplierPerformance,
  deletePriceList,
  deletePriceAgreement,
  cancelPriceChangeRequest,
} from '@/server/functions/suppliers';
import { listPriceLists } from '@/server/functions/suppliers/pricing';
import type {
  CreateSupplierInput,
  UpdateSupplierInput,
  UpdateSupplierRatingInput,
  ListSuppliersResult,
} from '@/lib/schemas/suppliers';

// ============================================================================
// QUERY KEYS
// ============================================================================

// Query keys are now centralized in @/lib/query-keys.ts

// ============================================================================
// LIST HOOKS
// ============================================================================

export interface UseSuppliersOptions extends Partial<SupplierFilters> {
  enabled?: boolean;
}

export function useSuppliers(options: UseSuppliersOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery<ListSuppliersResult>({
    queryKey: queryKeys.suppliers.suppliersListFiltered(filters),
    queryFn: async () => {
      try {
        const result = await listSuppliers({ data: filters as Record<string, unknown> });
        if (result == null) {
          throw new Error('Supplier list returned no data');
        }
        return result;
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Supplier list is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// PRICE LISTS HOOK
// ============================================================================

export interface UsePriceListsOptions {
  supplierId?: string;
  productId?: string;
  status?: 'active' | 'inactive' | 'pending' | 'expired';
  isPreferred?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: 'basePrice' | 'unitPrice' | 'expiryDate' | 'productName' | 'effectivePrice' | 'effectiveDate';
  sortOrder?: 'asc' | 'desc';
  enabled?: boolean;
}

/**
 * Fetch price lists filtered by supplier and/or product.
 */
export function usePriceLists(options: UsePriceListsOptions) {
  const {
    supplierId,
    productId,
    status = 'active',
    isPreferred,
    page = 1,
    pageSize = 50,
    sortBy = 'productName',
    sortOrder = 'asc',
    enabled = true,
  } = options;

  return useQuery({
    queryKey: queryKeys.suppliers.priceLists.list({
      supplierId,
      productId,
      status,
      isPreferred,
      page,
      pageSize,
      sortBy,
      sortOrder,
    }),
    queryFn: async () => {
      try {
        const result = await listPriceLists({
          data: { supplierId, productId, status, isPreferred, page, pageSize, sortBy, sortOrder },
        });
        if (result == null) {
          throw new Error('Price lists returned no data');
        }
        return result;
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Supplier pricing is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: enabled && (!!supplierId || !!productId),
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// DETAIL HOOKS
// ============================================================================

export function useSupplier(id: string, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.suppliers.supplierDetail(id),
    queryFn: async () => {
      try {
        const result = await getSupplier({
          data: { id },
        });
        if (result == null) {
          throw new Error('Supplier detail returned no data');
        }
        return result;
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'detail-not-found',
          fallbackMessage: 'Supplier details are temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested supplier could not be found.',
        });
      }
    },
    enabled: enabled && !!id,
    staleTime: 60 * 1000,
  });
}

export function useSupplierPerformance(id: string, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.suppliers.supplierPerformance(id),
    queryFn: async () => {
      try {
        const result = await getSupplierPerformance({
          data: { supplierId: id },
        });
        if (result == null) {
          throw new Error('Supplier performance returned no data');
        }
        return result;
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Supplier performance metrics are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { data: CreateSupplierInput }) => createSupplier(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.suppliersList() });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { data: UpdateSupplierInput & { id: string } }) => updateSupplier(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.suppliersList() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.supplierDetail(variables.data.id),
      });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { data: { id: string } }) => deleteSupplier(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.suppliersList() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.supplierDetail(variables.data.id),
      });
    },
  });
}

export function useUpdateSupplierRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { data: UpdateSupplierRatingInput }) => updateSupplierRating(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.suppliersList() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.supplierDetail(variables.data.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.supplierPerformance(variables.data.id),
      });
    },
  });
}

export function useDeletePriceList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { data: { id: string } }) => deletePriceList(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.lists() });
    },
  });
}

export function useDeletePriceAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { data: { id: string } }) => deletePriceAgreement(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.lists() });
    },
  });
}

export function useCancelPriceChangeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { data: { id: string } }) => cancelPriceChangeRequest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.lists() });
    },
  });
}
