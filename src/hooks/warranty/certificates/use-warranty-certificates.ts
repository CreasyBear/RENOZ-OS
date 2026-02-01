/**
 * Warranty Certificates TanStack Query Hook
 *
 * Provides data fetching and mutations for warranty certificate operations.
 * - Get certificate status for a warranty
 * - Generate new certificate
 * - Regenerate certificate (e.g., after warranty changes)
 *
 * @see src/server/functions/warranty-certificates.ts
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json - DOM-WAR-004c
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  generateWarrantyCertificate,
  getWarrantyCertificate,
  regenerateWarrantyCertificate,
} from '@/server/functions/warranty/certificates/warranty-certificates';
import type {
  GenerateWarrantyCertificateInput,
  RegenerateWarrantyCertificateInput,
} from '@/lib/schemas/warranty/certificates';
import { toast } from '../../_shared/use-toast';

// ============================================================================
// QUERY KEYS
// ============================================================================

// Query keys are now centralized in @/lib/query-keys.ts

// ============================================================================
// GET WARRANTY CERTIFICATE
// ============================================================================

/**
 * Hook for fetching the certificate status for a specific warranty.
 * Returns whether a certificate exists, the URL if available, and basic warranty info.
 *
 * @param warrantyId - The warranty ID to check certificate status for
 */
export function useWarrantyCertificate(warrantyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.warrantyCertificates.detail(warrantyId ?? ''),
    queryFn: () => getWarrantyCertificate({ data: { warrantyId: warrantyId! } }),
    enabled: !!warrantyId,
    // Certificates don't change often, so we can use longer stale time
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// GENERATE WARRANTY CERTIFICATE (Mutation)
// ============================================================================

/**
 * Hook for generating a warranty certificate.
 *
 * On success:
 * - Invalidates the certificate status query
 * - Shows a success toast with download link
 *
 * On error:
 * - Shows an error toast with the error message
 */
export function useGenerateWarrantyCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GenerateWarrantyCertificateInput) =>
      generateWarrantyCertificate({ data }),
    onSuccess: (result, variables) => {
      // Invalidate the certificate status query
      queryClient.invalidateQueries({
        queryKey: queryKeys.warrantyCertificates.detail(variables.warrantyId),
      });

      // Also invalidate warranty queries to update certificateUrl in warranty detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.warranties.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.warranties.detail(variables.warrantyId),
      });

      if (result.success) {
        toast.success('Certificate generated successfully');
      } else {
        toast.error(result.error ?? 'Failed to generate certificate');
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to generate certificate');
    },
  });
}

// ============================================================================
// REGENERATE WARRANTY CERTIFICATE (Mutation)
// ============================================================================

/**
 * Hook for regenerating a warranty certificate.
 * Used when warranty data has changed (e.g., ownership transfer, policy update).
 *
 * On success:
 * - Invalidates the certificate status query
 * - Shows a success toast
 *
 * On error:
 * - Shows an error toast with the error message
 */
export function useRegenerateWarrantyCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegenerateWarrantyCertificateInput) =>
      regenerateWarrantyCertificate({ data }),
    onSuccess: (result, variables) => {
      // Invalidate the certificate status query
      queryClient.invalidateQueries({
        queryKey: queryKeys.warrantyCertificates.detail(variables.warrantyId),
      });

      // Also invalidate warranty queries to update certificateUrl in warranty detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.warranties.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.warranties.detail(variables.warrantyId),
      });

      if (result.success) {
        toast.success('Certificate regenerated successfully');
      } else {
        toast.error(result.error ?? 'Failed to regenerate certificate');
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to regenerate certificate');
    },
  });
}
