/**
 * Pipeline Quote Hooks
 *
 * TanStack Query hooks for quote version data fetching:
 * - Quote version list
 * - Quote version detail
 * - Quote comparison
 * - Expiring/expired quotes alerts
 *
 * @see src/lib/query-keys.ts for centralized query keys
 * @see src/server/functions/pipeline/quote-versions.ts for server functions
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  listQuoteVersions,
  getQuoteVersion,
  compareQuoteVersions,
  getExpiringQuotes,
  getExpiredQuotes,
  getQuoteValidityStats,
} from '@/server/functions/pipeline/quote-versions';
import { deleteQuote } from '@/server/functions/pipeline/pipeline';
import type { QuoteVersion } from '@/lib/schemas/pipeline';

// ============================================================================
// TYPES
// ============================================================================

type QuoteVersionListResult = Awaited<ReturnType<typeof listQuoteVersions>>;
type QuoteComparisonResult = Awaited<ReturnType<typeof compareQuoteVersions>>;

export interface QuoteAlertItem {
  opportunityId: string;
  opportunityTitle: string;
  customerId: string;
  quoteExpiresAt: Date | null;
  value: number;
  stage: string;
  daysUntilExpiry?: number;
  daysSinceExpiry?: number;
}

// ============================================================================
// QUOTE VERSION LIST HOOKS
// ============================================================================

export interface UseQuoteVersionsOptions {
  opportunityId: string;
  enabled?: boolean;
}

/**
 * Fetch all quote versions for an opportunity
 */
export function useQuoteVersions({ opportunityId, enabled = true }: UseQuoteVersionsOptions) {
  return useQuery({
    queryKey: queryKeys.pipeline.quoteVersions(opportunityId),
    queryFn: async () => {
      const result = await listQuoteVersions({ data: { opportunityId } });
      if (result == null) throw new Error('Quote versions returned no data');
      return result;
    },
    enabled: enabled && !!opportunityId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================================================
// QUOTE VERSION DETAIL HOOKS
// ============================================================================

export interface UseQuoteVersionOptions {
  versionId: string;
  enabled?: boolean;
}

/**
 * Fetch single quote version
 */
export function useQuoteVersion({ versionId, enabled = true }: UseQuoteVersionOptions) {
  return useQuery({
    queryKey: queryKeys.pipeline.quoteVersion(versionId),
    queryFn: async () => {
      const result = await getQuoteVersion({ data: { id: versionId } });
      if (result == null) throw new Error('Quote version not found');
      return result;
    },
    enabled: enabled && !!versionId,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// QUOTE COMPARISON HOOKS
// ============================================================================

export interface UseQuoteComparisonOptions {
  version1Id: string;
  version2Id: string;
  enabled?: boolean;
}

/**
 * Compare two quote versions
 */
export function useQuoteComparison({ version1Id, version2Id, enabled = true }: UseQuoteComparisonOptions) {
  return useQuery({
    queryKey: queryKeys.pipeline.quoteComparison(version1Id, version2Id),
    queryFn: async () => {
      const result = await compareQuoteVersions({ data: { version1Id, version2Id } });
      if (result == null) throw new Error('Quote comparison returned no data');
      return result;
    },
    enabled: enabled && !!version1Id && !!version2Id,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// EXPIRING QUOTES HOOKS
// ============================================================================

export interface UseExpiringQuotesOptions {
  warningDays?: number;
  limit?: number;
  enabled?: boolean;
}

/**
 * Fetch quotes expiring within warning period
 */
export function useExpiringQuotes({ warningDays = 7, limit = 10, enabled = true }: UseExpiringQuotesOptions = {}) {
  return useQuery<{ expiringQuotes: QuoteAlertItem[] }>({
    queryKey: queryKeys.pipeline.expiringQuotes(warningDays),
    queryFn: async () => {
      const result = await getExpiringQuotes({ data: { warningDays, limit } });
      if (result == null) throw new Error('Expiring quotes returned no data');
      return result;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// EXPIRED QUOTES HOOKS
// ============================================================================

export interface UseExpiredQuotesOptions {
  limit?: number;
  enabled?: boolean;
}

/**
 * Fetch expired quotes
 */
export function useExpiredQuotes({ limit = 10, enabled = true }: UseExpiredQuotesOptions = {}) {
  return useQuery<{ expiredQuotes: QuoteAlertItem[] }>({
    queryKey: queryKeys.pipeline.expiredQuotes(),
    queryFn: async () => {
      const result = await getExpiredQuotes({ data: { limit } });
      if (result == null) throw new Error('Expired quotes returned no data');
      return result;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// QUOTE VALIDITY STATS HOOKS
// ============================================================================

export interface UseQuoteValidityStatsOptions {
  enabled?: boolean;
}

/**
 * Fetch quote validity statistics
 */
export function useQuoteValidityStats({ enabled = true }: UseQuoteValidityStatsOptions = {}) {
  return useQuery({
    queryKey: queryKeys.pipeline.quoteValidityStats(),
    queryFn: async () => {
      const result = await getQuoteValidityStats({ data: {} });
      if (result == null) throw new Error('Quote validity stats returned no data');
      return result;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
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
      // Invalidate both list and detail caches per STANDARDS.md
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.metrics() });
    },
  });
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { QuoteVersion, QuoteVersionListResult, QuoteComparisonResult };
