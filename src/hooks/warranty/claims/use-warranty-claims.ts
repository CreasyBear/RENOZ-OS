/**
 * Warranty Claims TanStack Query Hook
 *
 * Provides data fetching and mutations for warranty claims workflow.
 *
 * @see src/server/functions/warranty/claims/warranty-claims.ts
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json - DOM-WAR-006c
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  isWarrantyClaimStatusValue,
  type ListWarrantyClaimsInput,
  type CreateWarrantyClaimInput,
  type UpdateClaimStatusInput,
  type ApproveClaimInput,
  type DenyClaimInput,
  type ResolveClaimInput,
  type AssignClaimInput,
  type WarrantyClaimStatusValue,
  type WarrantyClaimTypeValue,
  type WarrantyClaimResolutionTypeValue,
} from '@/lib/schemas/warranty/claims';
import {
  claimStatusConfig,
  claimTypeConfig,
  resolutionTypeConfig,
  formatClaimDate,
  formatClaimDateTime,
  formatClaimCost,
} from '@/lib/warranty/claims-utils';
import { toast } from '../../_shared/use-toast';
import {
  listWarrantyClaims,
  getWarrantyClaim,
  createWarrantyClaim,
  updateClaimStatus,
  approveClaim,
  denyClaim,
  resolveClaim,
  assignClaim,
  cancelWarrantyClaim,
} from '@/server/functions/warranty';

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
// TYPE EXPORTS
// ============================================================================

export type { WarrantyClaimStatusValue, WarrantyClaimTypeValue, WarrantyClaimResolutionTypeValue };

// ============================================================================
// CLAIM STATUS HELPERS
// ============================================================================

export {
  claimStatusConfig,
  claimTypeConfig,
  resolutionTypeConfig,
  formatClaimDate,
  formatClaimDateTime,
  formatClaimCost,
};

// ============================================================================
// LIST WARRANTY CLAIMS
// ============================================================================

/**
 * Hook for fetching warranty claims with filters and pagination.
 */
export function useWarrantyClaims(options?: ListWarrantyClaimsInput) {
  return useQuery({
    queryKey: queryKeys.warrantyClaims.list(options),
    queryFn: async () => {
      const result = await listWarrantyClaims({
        data: {
          ...options,
          page: options?.page ?? 1,
          pageSize: options?.pageSize ?? 20,
          sortBy: options?.sortBy ?? 'submittedAt',
          sortOrder: options?.sortOrder ?? 'desc',
        },
      
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    staleTime: LIST_STALE_TIME,
  });
}

/**
 * Hook for fetching claims for a specific warranty.
 */
export function useWarrantyClaimsByWarranty(warrantyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.warrantyClaims.byWarranty(warrantyId ?? ''),
    queryFn: async () => {
      const result = await listWarrantyClaims({
        data: {
          warrantyId: warrantyId!,
          page: 1,
          pageSize: 100,
          sortBy: 'submittedAt',
          sortOrder: 'desc',
        },
      
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: !!warrantyId,
    staleTime: LIST_STALE_TIME,
  });
}

/**
 * Hook for fetching claims for a specific customer.
 */
export function useWarrantyClaimsByCustomer(customerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.warrantyClaims.byCustomer(customerId ?? ''),
    queryFn: async () => {
      const result = await listWarrantyClaims({
        data: {
          customerId: customerId!,
          page: 1,
          pageSize: 100,
          sortBy: 'submittedAt',
          sortOrder: 'desc',
        },
      
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: !!customerId,
    staleTime: LIST_STALE_TIME,
  });
}

// ============================================================================
// GET WARRANTY CLAIM
// ============================================================================

/**
 * Hook for fetching a single warranty claim with full details.
 */
export function useWarrantyClaim(claimId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.warrantyClaims.detail(claimId ?? ''),
    queryFn: async () => {
      const result = await getWarrantyClaim({
        data: { claimId: claimId! } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: !!claimId,
    staleTime: DETAIL_STALE_TIME,
  });
}

// ============================================================================
// CREATE WARRANTY CLAIM
// ============================================================================

/**
 * Hook for creating a new warranty claim.
 */
export function useCreateWarrantyClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWarrantyClaimInput) => createWarrantyClaim({ data }),
    onSuccess: (result) => {
      // Invalidate all claim lists
      queryClient.invalidateQueries({ queryKey: queryKeys.warrantyClaims.lists() });
      // Invalidate claims for this warranty
      queryClient.invalidateQueries({
        queryKey: queryKeys.warrantyClaims.byWarranty(result.warrantyId),
      });
      toast.success(`Claim ${result.claimNumber} submitted successfully`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to submit claim');
    },
  });
}

// ============================================================================
// UPDATE CLAIM STATUS
// ============================================================================

/**
 * Hook for updating a claim's status.
 */
export function useUpdateClaimStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateClaimStatusInput) => updateClaimStatus({ data }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warrantyClaims.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.warrantyClaims.detail(result.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.warrantyClaims.byWarranty(result.warrantyId),
      });
      const statusLabel = isWarrantyClaimStatusValue(result.status)
        ? claimStatusConfig[result.status].label
        : result.status;
      toast.success(`Claim status updated to ${statusLabel}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    },
  });
}

// ============================================================================
// APPROVE CLAIM
// ============================================================================

/**
 * Hook for approving a warranty claim.
 */
export function useApproveClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ApproveClaimInput) => approveClaim({ data }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warrantyClaims.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.warrantyClaims.detail(result.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.warrantyClaims.byWarranty(result.warrantyId),
      });
      toast.success(`Claim ${result.claimNumber} approved`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to approve claim');
    },
  });
}

// ============================================================================
// DENY CLAIM
// ============================================================================

/**
 * Hook for denying a warranty claim.
 */
export function useDenyClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DenyClaimInput) => denyClaim({ data }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warrantyClaims.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.warrantyClaims.detail(result.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.warrantyClaims.byWarranty(result.warrantyId),
      });
      toast.success(`Claim ${result.claimNumber} denied`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to deny claim');
    },
  });
}

// ============================================================================
// RESOLVE CLAIM
// ============================================================================

/**
 * Hook for resolving a warranty claim.
 */
export function useResolveClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ResolveClaimInput) => resolveClaim({ data }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warrantyClaims.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.warrantyClaims.detail(result.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.warrantyClaims.byWarranty(result.warrantyId),
      });
      // Also invalidate warranty queries since resolution may extend warranty
      queryClient.invalidateQueries({ queryKey: queryKeys.warranties.detail(result.warrantyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.warranties.lists() });
      toast.success(`Claim ${result.claimNumber} resolved`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to resolve claim');
    },
  });
}

// ============================================================================
// ASSIGN CLAIM
// ============================================================================

/**
 * Hook for assigning a warranty claim to a user.
 */
export function useAssignClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AssignClaimInput) => assignClaim({ data }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warrantyClaims.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.warrantyClaims.detail(result.id),
      });
      toast.success('Claim assignment updated');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to assign claim');
    },
  });
}

// ============================================================================
// CANCEL CLAIM
// ============================================================================

/**
 * Cancel a warranty claim (status-based cancellation from submitted/under_review)
 */
export function useCancelWarrantyClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; reason?: string }) =>
      cancelWarrantyClaim({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warrantyClaims.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.warrantyClaims.detail(variables.id),
      });
      toast.success('Claim cancelled');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel claim');
    },
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
// Note: getSlaDueStatus lives in @/lib/warranty/claims-utils (canonical implementation)
// for claim detail SLA tracking. Import from there when needed.
