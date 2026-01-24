/**
 * Pipeline Quote Mutation Hooks
 *
 * TanStack Query mutation hooks for quote operations:
 * - Create quote version
 * - Restore quote version
 * - Extend quote validity
 * - Update quote expiration
 * - Generate PDF
 * - Send quote
 *
 * @see src/lib/query-keys.ts for centralized query keys
 * @see src/server/functions/pipeline/quote-versions.ts for server functions
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  createQuoteVersion,
  restoreQuoteVersion,
  updateQuoteExpiration,
  extendQuoteValidity,
  generateQuotePdf,
  sendQuote,
} from '@/server/functions/pipeline/quote-versions';
import type { QuoteLineItem } from '@/lib/schemas/pipeline';

// ============================================================================
// CREATE QUOTE VERSION MUTATION
// ============================================================================

export interface CreateQuoteVersionInput {
  opportunityId: string;
  items: QuoteLineItem[];
  notes?: string;
}

/**
 * Create a new quote version for an opportunity
 */
export function useCreateQuoteVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ opportunityId, items, notes }: CreateQuoteVersionInput) =>
      createQuoteVersion({ data: { opportunityId, items, notes } }),
    onSuccess: (_, { opportunityId }) => {
      // Invalidate quote versions and opportunity detail
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.quoteVersions(opportunityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.opportunity(opportunityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.lists() });
    },
  });
}

// ============================================================================
// RESTORE QUOTE VERSION MUTATION
// ============================================================================

export interface RestoreQuoteVersionInput {
  opportunityId: string;
  sourceVersionId: string;
}

/**
 * Restore a previous quote version (creates new version from old)
 */
export function useRestoreQuoteVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ opportunityId, sourceVersionId }: RestoreQuoteVersionInput) =>
      restoreQuoteVersion({ data: { opportunityId, sourceVersionId } }),
    onSuccess: (_, { opportunityId }) => {
      // Invalidate quote versions and opportunity detail
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.quoteVersions(opportunityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.opportunity(opportunityId) });
    },
  });
}

// ============================================================================
// UPDATE QUOTE EXPIRATION MUTATION
// ============================================================================

export interface UpdateQuoteExpirationInput {
  opportunityId: string;
  quoteExpiresAt: string;
}

/**
 * Update the expiration date for a quote
 */
export function useUpdateQuoteExpiration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ opportunityId, quoteExpiresAt }: UpdateQuoteExpirationInput) =>
      updateQuoteExpiration({ data: { opportunityId, quoteExpiresAt } }),
    onSuccess: (_, { opportunityId }) => {
      // Invalidate opportunity and expiring/expired quotes
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.opportunity(opportunityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.expiringQuotes(7) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.expiredQuotes() });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.lists() });
    },
  });
}

// ============================================================================
// EXTEND QUOTE VALIDITY MUTATION
// ============================================================================

export interface ExtendQuoteValidityInput {
  opportunityId: string;
  newExpirationDate: Date;
  reason: string;
}

/**
 * Extend quote validity with reason tracking
 */
export function useExtendQuoteValidity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ opportunityId, newExpirationDate, reason }: ExtendQuoteValidityInput) =>
      extendQuoteValidity({ data: { opportunityId, newExpirationDate, reason } }),
    onSuccess: (_, { opportunityId }) => {
      // Invalidate expiring/expired quotes and opportunity
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.expiringQuotes(7) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.expiredQuotes() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.opportunity(opportunityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.lists() });
    },
  });
}

// ============================================================================
// GENERATE PDF MUTATION
// ============================================================================

export interface GenerateQuotePdfInput {
  quoteVersionId: string;
}

/**
 * Generate PDF for a quote version
 */
export function useGenerateQuotePdf() {
  return useMutation({
    mutationFn: ({ quoteVersionId }: GenerateQuotePdfInput) =>
      generateQuotePdf({ data: { id: quoteVersionId } }),
  });
}

// ============================================================================
// SEND QUOTE MUTATION
// ============================================================================

export interface SendQuoteInput {
  opportunityId: string;
  quoteVersionId: string;
  recipientEmail: string;
  recipientName?: string;
  subject?: string;
  message?: string;
  ccEmails?: string[];
}

/**
 * Send quote via email
 */
export function useSendQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendQuoteInput) =>
      sendQuote({ data: input }),
    onSuccess: (_, variables) => {
      // Invalidate quote version to update sent status
      queryClient.invalidateQueries({
        queryKey: queryKeys.pipeline.quoteVersions(variables.opportunityId),
      });
    },
  });
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { QuoteLineItem };
