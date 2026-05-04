/**
 * Credit note hooks.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import { isReadQueryError, normalizeReadQueryError, requireReadResult } from '@/lib/read-path-policy';
import {
  listCreditNotes,
  getCreditNote,
  createCreditNote,
  applyCreditNoteToInvoice,
  issueCreditNote,
  voidCreditNote,
  generateCreditNotePdf,
} from '@/server/functions/financial/credit-notes';
import type { CreateCreditNoteInput, ApplyCreditNoteInput } from '@/lib/schemas';

function rethrowFinancialReadError(
  error: unknown,
  options: {
    fallbackMessage: string;
    contractType: 'always-shaped' | 'detail-not-found';
    notFoundMessage?: string;
  }
): never {
  if (isReadQueryError(error)) {
    throw error;
  }

  throw normalizeReadQueryError(error, options);
}

// ============================================================================
// CREDIT NOTE HOOKS
// ============================================================================

export interface UseCreditNotesOptions {
  customerId?: string;
  orderId?: string;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useCreditNotes(options: UseCreditNotesOptions = {}) {
  const { enabled = true, ...params } = options;
  const fn = useServerFn(listCreditNotes);

  return useQuery({
    queryKey: queryKeys.financial.creditNotesList({
      customerId: params.customerId,
      orderId: params.orderId,
    }),
    queryFn: async () => {
      try {
        const result = await fn({ data: params });
        return requireReadResult(result, {
          message: 'Credit notes list returned no data',
          contractType: 'always-shaped',
          fallbackMessage: 'Credit notes are temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        rethrowFinancialReadError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Credit notes are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useCreditNote(id: string, enabled = true) {
  const fn = useServerFn(getCreditNote);

  return useQuery({
    queryKey: queryKeys.financial.creditNoteDetail(id),
    queryFn: async () => {
      try {
        const result = await fn({ data: { id } });
        return requireReadResult(result, {
          message: 'Credit note not found',
          contractType: 'detail-not-found',
          fallbackMessage:
            'Credit note details are temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested credit note could not be found.',
        });
      } catch (error) {
        rethrowFinancialReadError(error, {
          contractType: 'detail-not-found',
          fallbackMessage:
            'Credit note details are temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested credit note could not be found.',
        });
      }
    },
    enabled: enabled && !!id,
    staleTime: 60 * 1000,
  });
}

export function useCreateCreditNote() {
  const queryClient = useQueryClient();
  const fn = useServerFn(createCreditNote);

  return useMutation({
    mutationFn: (data: CreateCreditNoteInput) => fn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.creditNotes() });
    },
  });
}

export function useApplyCreditNote() {
  const queryClient = useQueryClient();
  const fn = useServerFn(applyCreditNoteToInvoice);

  return useMutation({
    mutationFn: (data: ApplyCreditNoteInput) => fn({ data }),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.creditNotes() });
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.creditNoteDetail(data.creditNoteId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(data.orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
  });
}

export function useIssueCreditNote() {
  const queryClient = useQueryClient();
  const fn = useServerFn(issueCreditNote);

  return useMutation({
    mutationFn: (id: string) => fn({ data: { id } }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.creditNotes() });
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.creditNoteDetail(id) });
    },
  });
}

export function useVoidCreditNote() {
  const queryClient = useQueryClient();
  const fn = useServerFn(voidCreditNote);

  return useMutation({
    mutationFn: (params: { id: string; voidReason?: string }) =>
      fn({ data: { id: params.id, voidReason: params.voidReason ?? 'Voided by user' } }),
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.creditNotes() });
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.creditNoteDetail(params.id) });
    },
  });
}

export function useGenerateCreditNotePdf() {
  const fn = useServerFn(generateCreditNotePdf);

  return useMutation({
    mutationFn: (creditNoteId: string) => fn({ data: { id: creditNoteId } }),
  });
}

