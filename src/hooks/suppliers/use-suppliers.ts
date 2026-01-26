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
import {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  updateSupplierRating,
  getSupplierPerformance,
} from '@/server/functions/suppliers';

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

  return useQuery({
    queryKey: queryKeys.suppliers.suppliersListFiltered(filters),
    queryFn: () => listSuppliers({ data: filters as Record<string, unknown> }),
    enabled,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// DETAIL HOOKS
// ============================================================================

export function useSupplier(id: string, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.suppliers.supplierDetail(id),
    queryFn: () => getSupplier({ data: { id } }),
    enabled: enabled && !!id,
    staleTime: 60 * 1000,
  });
}

export function useSupplierPerformance(id: string, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.suppliers.supplierPerformance(id),
    queryFn: () => getSupplierPerformance({ data: { supplierId: id } }),
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
    mutationFn: createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.suppliersList() });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSupplier,
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
    mutationFn: deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.suppliersList() });
    },
  });
}

export function useUpdateSupplierRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSupplierRating,
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
