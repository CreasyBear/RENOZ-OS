'use client'

/**
 * Warranty Hooks
 *
 * Shared hooks for warranty detail updates.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getWarranty,
  listWarranties,
  getWarrantyStatusCounts,
  updateWarrantyOptOut,
  deleteWarranty,
  voidWarranty,
  transferWarranty,
} from '@/server/functions/warranty';
import { queryKeys } from '@/lib/query-keys';
import type { WarrantyFilters } from '@/lib/schemas/warranty/warranties';

export interface UseWarrantiesOptions extends Partial<WarrantyFilters> {
  enabled?: boolean;
}

// Import type from schema per SCHEMA-TRACE.md
import type { WarrantyDetail } from '@/lib/schemas/warranty';

// Re-export for convenience
export type { WarrantyDetail };

export function useWarranties(options: UseWarrantiesOptions = {}) {
  const { enabled = true, ...filters } = options;

  const queryFilters: WarrantyFilters = {
    limit: filters.limit ?? 20,
    offset: filters.offset ?? 0,
    sortBy: filters.sortBy ?? 'expiryDate',
    sortOrder: filters.sortOrder ?? 'asc',
    ...filters,
  };

  return useQuery({
    queryKey: queryKeys.warranties.list(queryFilters),
    queryFn: async () => {
      const result = await listWarranties({ data: queryFilters });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
  });
}

/** Status counts for filter chips (DOMAIN-LANDING-STANDARDS) */
export function useWarrantyStatusCounts() {
  return useQuery({
    queryKey: queryKeys.warranties.statusCounts(),
    queryFn: async () => {
      const result = await getWarrantyStatusCounts();
      if (result == null) throw new Error('Warranty status counts returned no data');
      return result;
    },
    staleTime: 30 * 1000,
  });
}

export interface UseWarrantyOptions {
  id: string;
  enabled?: boolean;
}

export function useWarranty({ id, enabled = true }: UseWarrantyOptions) {
  return useQuery({
    queryKey: queryKeys.warranties.detail(id),
    queryFn: async () => {
      const result = await getWarranty({
        data: { id } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!id,
    staleTime: 60 * 1000,
  });
}

export function useUpdateWarrantyOptOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ warrantyId, optOut }: { warrantyId: string; optOut: boolean }) =>
      updateWarrantyOptOut({ data: { warrantyId, optOut } }),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.warranties.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.warranties.detail(variables.warrantyId),
      });
      toast.success(`Warranty expiry alerts ${variables.optOut ? 'disabled' : 'enabled'}`);
      return result;
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update warranty notification settings');
    },
  });
}

/**
 * Soft-delete a warranty (sets deletedAt)
 */
export function useDeleteWarranty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWarranty({ data: { id } }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warranties.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.warranties.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.warranties.statusCounts() });
      toast.success('Warranty deleted successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete warranty');
    },
  });
}

/**
 * Void a warranty (mark as voided)
 */
export function useVoidWarranty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      voidWarranty({ data: { id, reason } }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warranties.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.warranties.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.warranties.statusCounts() });
      toast.success('Warranty voided successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to void warranty');
    },
  });
}

/**
 * Transfer a warranty to a new customer
 */
export function useTransferWarranty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, newCustomerId, reason }: { id: string; newCustomerId: string; reason?: string }) =>
      transferWarranty({ data: { id, newCustomerId, reason } }),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warranties.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.warranties.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.warranties.statusCounts() });
      if (result.previousCustomerId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(result.previousCustomerId) });
      }
      if (result.newCustomerId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(result.newCustomerId) });
      }
      toast.success('Warranty transferred successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to transfer warranty');
    },
  });
}
