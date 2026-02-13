/**
 * Email Signatures Hooks
 *
 * Query and mutation hooks for email signatures.
 * Uses centralized query keys for proper cache invalidation.
 *
 * @see DOM-COMMS-006
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import { QUERY_CONFIG } from '@/lib/constants';
import type {
  CreateSignatureInput,
  UpdateSignatureInput,
  DeleteSignatureInput,
  SetDefaultSignatureInput,
  Signature,
} from '@/lib/schemas/communications/email-signatures';
import {
  getEmailSignatures,
  getEmailSignature,
  createEmailSignature,
  updateEmailSignature,
  deleteEmailSignature,
  setDefaultSignature,
} from '@/server/functions/communications/email-signatures';

// ============================================================================
// QUERY HOOKS
// ============================================================================

export interface UseSignaturesOptions {
  includeCompanyWide?: boolean;
  enabled?: boolean;
}

export function useSignatures(options: UseSignaturesOptions = {}) {
  const { includeCompanyWide = true, enabled = true } = options;

  return useQuery<Signature[]>({
    queryKey: queryKeys.communications.signaturesList({ includeCompanyWide }),
    queryFn: async () => {
      const result = await getEmailSignatures({
        data: { includeCompanyWide } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: QUERY_CONFIG.STALE_TIME_LONG,
  });
}

export interface UseSignatureOptions {
  signatureId: string;
  enabled?: boolean;
}

export function useSignature(options: UseSignatureOptions) {
  const { signatureId, enabled = true } = options;

  return useQuery<Signature | null>({
    queryKey: queryKeys.communications.signatureDetail(signatureId),
    queryFn: async () => {
      const result = await getEmailSignature({
        data: { id: signatureId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!signatureId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useCreateSignature() {
  const queryClient = useQueryClient();
  const createSignatureFn = useServerFn(createEmailSignature);

  return useMutation({
    mutationFn: (input: CreateSignatureInput) => createSignatureFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.signatures(),
      });
    },
  });
}

export function useUpdateSignature() {
  const queryClient = useQueryClient();
  const updateSignatureFn = useServerFn(updateEmailSignature);

  return useMutation({
    mutationFn: (input: UpdateSignatureInput) => updateSignatureFn({ data: input }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.signatures(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.signatureDetail(variables.id),
      });
    },
  });
}

export function useDeleteSignature() {
  const queryClient = useQueryClient();
  const deleteSignatureFn = useServerFn(deleteEmailSignature);

  return useMutation({
    mutationFn: (input: DeleteSignatureInput) => deleteSignatureFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.signatures(),
      });
    },
  });
}

export function useSetDefaultSignature() {
  const queryClient = useQueryClient();
  const setDefaultSignatureFn = useServerFn(setDefaultSignature);

  return useMutation({
    mutationFn: (input: SetDefaultSignatureInput) => setDefaultSignatureFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.signatures(),
      });
    },
  });
}
