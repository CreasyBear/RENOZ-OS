/**
 * Warranty Policies TanStack Query Hook
 *
 * Provides data fetching and mutations for warranty policies.
 *
 * @see src/server/functions/warranty-policies.ts
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json - DOM-WAR-001c
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  listWarrantyPolicies,
  getWarrantyPolicy,
  createWarrantyPolicy,
  updateWarrantyPolicy,
  deleteWarrantyPolicy,
  setDefaultWarrantyPolicy,
  getDefaultWarrantyPolicy,
  resolveWarrantyPolicy,
  getWarrantyPoliciesWithSla,
  seedDefaultWarrantyPolicies,
  assignWarrantyPolicyToProduct,
  assignDefaultWarrantyPolicyToCategory,
} from '@/server/functions/warranty/warranty-policies';
import type {
  GetWarrantyPoliciesInput,
  CreateWarrantyPolicyInput,
  UpdateWarrantyPolicyInput,
  GetWarrantyPolicyByIdInput,
  ResolveWarrantyPolicyInput,
  SeedDefaultPoliciesInput,
  AssignWarrantyPolicyToProductInput,
  AssignDefaultWarrantyPolicyToCategoryInput,
  WarrantyPolicyTypeValue,
} from '@/lib/schemas/warranty/policies';
import { toast } from '../_shared/use-toast';

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

const LIST_STALE_TIME = 30 * 1000; // 30 seconds for lists
const DETAIL_STALE_TIME = 60 * 1000; // 60 seconds for details

// ============================================================================
// QUERY KEYS
// ============================================================================

// Query keys are now centralized in @/lib/query-keys.ts

// ============================================================================
// LIST WARRANTY POLICIES
// ============================================================================

/**
 * Hook for fetching warranty policies.
 */
export function useWarrantyPolicies(options?: GetWarrantyPoliciesInput) {
  const listFn = useServerFn(listWarrantyPolicies);

  return useQuery({
    queryKey: queryKeys.warrantyPolicies.list(options),
    queryFn: () => listFn({ data: options ?? {} }),
    staleTime: LIST_STALE_TIME,
  });
}

/**
 * Hook for fetching warranty policies with SLA configuration details.
 */
export function useWarrantyPoliciesWithSla(options?: GetWarrantyPoliciesInput) {
  const listFn = useServerFn(getWarrantyPoliciesWithSla);

  return useQuery({
    queryKey: queryKeys.warrantyPolicies.listWithSla(options),
    queryFn: () => listFn({ data: options ?? {} }),
    staleTime: LIST_STALE_TIME,
  });
}

// ============================================================================
// GET WARRANTY POLICY
// ============================================================================

/**
 * Hook for fetching a single warranty policy.
 */
export function useWarrantyPolicy(policyId: string | undefined) {
  const getFn = useServerFn(getWarrantyPolicy);

  return useQuery({
    queryKey: queryKeys.warrantyPolicies.detail(policyId ?? ''),
    queryFn: () => getFn({ data: { policyId: policyId! } }),
    enabled: !!policyId,
    staleTime: DETAIL_STALE_TIME,
  });
}

// ============================================================================
// GET DEFAULT WARRANTY POLICY
// ============================================================================

/**
 * Hook for fetching the default warranty policy for a type.
 */
export function useDefaultWarrantyPolicy(type: WarrantyPolicyTypeValue | undefined) {
  const getFn = useServerFn(getDefaultWarrantyPolicy);

  return useQuery({
    queryKey: queryKeys.warrantyPolicies.default(type!),
    queryFn: () => getFn({ data: { type: type! } }),
    enabled: !!type,
    staleTime: DETAIL_STALE_TIME,
  });
}

// ============================================================================
// RESOLVE WARRANTY POLICY
// ============================================================================

/**
 * Hook for resolving which warranty policy applies.
 * Resolution hierarchy: product > category > org default
 */
export function useResolveWarrantyPolicy(params: ResolveWarrantyPolicyInput) {
  const resolveFn = useServerFn(resolveWarrantyPolicy);

  return useQuery({
    queryKey: queryKeys.warrantyPolicies.resolve(params),
    queryFn: () => resolveFn({ data: params }),
    enabled: !!(params.productId || params.categoryId || params.type),
    staleTime: DETAIL_STALE_TIME,
  });
}

// ============================================================================
// CREATE WARRANTY POLICY
// ============================================================================

/**
 * Hook for creating a new warranty policy.
 */
export function useCreateWarrantyPolicy() {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createWarrantyPolicy);

  return useMutation({
    mutationFn: (data: CreateWarrantyPolicyInput) => createFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warrantyPolicies.lists() });
      toast.success('Warranty policy created successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create policy');
    },
  });
}

// ============================================================================
// UPDATE WARRANTY POLICY
// ============================================================================

/**
 * Hook for updating a warranty policy.
 */
export function useUpdateWarrantyPolicy() {
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateWarrantyPolicy);

  return useMutation({
    mutationFn: (data: UpdateWarrantyPolicyInput & GetWarrantyPolicyByIdInput) =>
      updateFn({ data }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warrantyPolicies.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.warrantyPolicies.detail(variables.policyId),
      });
      toast.success('Warranty policy updated successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update policy');
    },
  });
}

// ============================================================================
// DELETE WARRANTY POLICY
// ============================================================================

/**
 * Hook for deleting (deactivating) a warranty policy.
 */
export function useDeleteWarrantyPolicy() {
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteWarrantyPolicy);

  return useMutation({
    mutationFn: (policyId: string) => deleteFn({ data: { policyId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warrantyPolicies.lists() });
      toast.success('Warranty policy deleted successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete policy');
    },
  });
}

// ============================================================================
// SET DEFAULT WARRANTY POLICY
// ============================================================================

/**
 * Hook for setting a policy as the default for its type.
 */
export function useSetDefaultWarrantyPolicy() {
  const queryClient = useQueryClient();
  const setDefaultFn = useServerFn(setDefaultWarrantyPolicy);

  return useMutation({
    mutationFn: (policyId: string) => setDefaultFn({ data: { policyId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warrantyPolicies.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.warrantyPolicies.defaults() });
      toast.success('Default warranty policy updated');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to set default policy');
    },
  });
}

// ============================================================================
// SEED DEFAULT POLICIES
// ============================================================================

/**
 * Hook for seeding default warranty policies for a new organization.
 */
export function useSeedDefaultWarrantyPolicies() {
  const queryClient = useQueryClient();
  const seedFn = useServerFn(seedDefaultWarrantyPolicies);

  return useMutation({
    mutationFn: (data?: Partial<SeedDefaultPoliciesInput>) =>
      seedFn({
        data: {
          batteryDurationMonths: data?.batteryDurationMonths ?? 120,
          batteryCycleLimit: data?.batteryCycleLimit ?? 10000,
          inverterDurationMonths: data?.inverterDurationMonths ?? 60,
          installationDurationMonths: data?.installationDurationMonths ?? 24,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warrantyPolicies.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.warrantyPolicies.defaults() });
      toast.success('Default warranty policies created');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to seed policies');
    },
  });
}

// ============================================================================
// ASSIGN POLICY TO PRODUCT
// ============================================================================

/**
 * Hook for assigning a warranty policy to a product.
 */
export function useAssignWarrantyPolicyToProduct() {
  const queryClient = useQueryClient();
  const assignFn = useServerFn(assignWarrantyPolicyToProduct);

  return useMutation({
    mutationFn: (data: AssignWarrantyPolicyToProductInput) => assignFn({ data }),
    onSuccess: () => {
      // Invalidate product queries
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.success('Warranty policy assigned to product');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to assign policy');
    },
  });
}

// ============================================================================
// ASSIGN DEFAULT POLICY TO CATEGORY
// ============================================================================

/**
 * Hook for assigning a default warranty policy to a category.
 */
export function useAssignDefaultWarrantyPolicyToCategory() {
  const queryClient = useQueryClient();
  const assignFn = useServerFn(assignDefaultWarrantyPolicyToCategory);

  return useMutation({
    mutationFn: (data: AssignDefaultWarrantyPolicyToCategoryInput) => assignFn({ data }),
    onSuccess: () => {
      // Invalidate category queries
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      toast.success('Default warranty policy assigned to category');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to assign policy');
    },
  });
}
