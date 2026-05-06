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
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  createQuoteVersion,
  restoreQuoteVersion,
  updateQuoteExpiration,
  extendQuoteValidity,
  generateQuotePdf,
  sendQuote,
} from '@/server/functions/pipeline/quote-versions';
import { deleteQuote } from '@/server/functions/pipeline/quote-delete';
import type {
  GenerateQuotePdfResult,
  QuoteLineItem,
  SendQuoteResult,
} from '@/lib/schemas/pipeline';

function invalidateOpportunityListCaches(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.lists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.infiniteLists() });
}

function invalidateQuoteVersionsAndOpportunity(queryClient: QueryClient, opportunityId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.quoteVersions(opportunityId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.opportunity(opportunityId) });
}

function invalidateQuoteExpiryCaches(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.expiringQuotes(7) });
  queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.expiredQuotes() });
}

function invalidateQuoteExpirationCaches(queryClient: QueryClient, opportunityId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.opportunity(opportunityId) });
  invalidateQuoteExpiryCaches(queryClient);
  invalidateOpportunityListCaches(queryClient);
}

function invalidateDeletedQuoteCaches(queryClient: QueryClient, quoteId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.quotes.lists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.quotes.detail(quoteId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.metrics() });
}

function invalidateGeneratedQuotePdfCaches(queryClient: QueryClient, quoteVersionId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.quoteVersion(quoteVersionId) });
}

function invalidateSentQuoteCaches(queryClient: QueryClient, opportunityId: string) {
  invalidateQuoteVersionsAndOpportunity(queryClient, opportunityId);
  invalidateOpportunityListCaches(queryClient);
  queryClient.invalidateQueries({
    queryKey: queryKeys.documents.history('opportunity', opportunityId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.activities.byOpportunity(opportunityId),
  });
}

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
      invalidateQuoteVersionsAndOpportunity(queryClient, opportunityId);
      invalidateOpportunityListCaches(queryClient);
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
      invalidateQuoteVersionsAndOpportunity(queryClient, opportunityId);
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
      invalidateQuoteExpirationCaches(queryClient, opportunityId);
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
      invalidateQuoteExpirationCaches(queryClient, opportunityId);
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quoteVersionId }: GenerateQuotePdfInput) =>
      generateQuotePdf({ data: { id: quoteVersionId } }),
    onSuccess: (_result, variables) => {
      invalidateGeneratedQuotePdfCaches(queryClient, variables.quoteVersionId);
    },
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
    onSuccess: (_result, variables) => {
      invalidateSentQuoteCaches(queryClient, variables.opportunityId);
    },
  });
}

// ============================================================================
// DELETE QUOTE MUTATION
// ============================================================================

/**
 * Soft-delete a quote (sets deletedAt, hides from lists)
 */
export function useDeleteQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteQuote({ data: { id } }),
    onSuccess: (_, id) => {
      invalidateDeletedQuoteCaches(queryClient, id);
    },
  });
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { QuoteLineItem };
export type { GenerateQuotePdfResult, SendQuoteResult };
