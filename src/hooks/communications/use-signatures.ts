/**
 * Email Signatures Hooks
 *
 * Query and mutation hooks for email signatures.
 * Uses centralized query keys for proper cache invalidation.
 *
 * @see DOM-COMMS-006
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  getEmailSignatures,
  getEmailSignature,
  createEmailSignature,
  updateEmailSignature,
  deleteEmailSignature,
  setDefaultSignature,
} from '@/lib/server/email-signatures';

// ============================================================================
// QUERY HOOKS
// ============================================================================

export interface UseSignaturesOptions {
  includeCompanyWide?: boolean;
  enabled?: boolean;
}

export function useSignatures(options: UseSignaturesOptions = {}) {
  const { includeCompanyWide = true, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.communications.signaturesList({ includeCompanyWide }),
    queryFn: () => getEmailSignatures({ data: { includeCompanyWide } }),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - signatures don't change often
  });
}

export interface UseSignatureOptions {
  signatureId: string;
  enabled?: boolean;
}

export function useSignature(options: UseSignatureOptions) {
  const { signatureId, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.communications.signatureDetail(signatureId),
    queryFn: () => getEmailSignature({ data: { id: signatureId } }),
    enabled: enabled && !!signatureId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useCreateSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEmailSignature,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.signatures(),
      });
    },
  });
}

export function useUpdateSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateEmailSignature,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.signatures(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.signatureDetail(variables.data.id),
      });
    },
  });
}

export function useDeleteSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEmailSignature,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.signatures(),
      });
    },
  });
}

export function useSetDefaultSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setDefaultSignature,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.signatures(),
      });
    },
  });
}
