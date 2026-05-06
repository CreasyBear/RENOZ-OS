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
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  isReadQueryError,
  normalizeReadQueryError,
  requireReadResult,
} from '@/lib/read-path-policy';
import { PIPELINE_READ_MESSAGES } from '@/lib/pipeline/read-error-messages';
import {
  listQuoteVersions,
  getQuoteVersion,
  compareQuoteVersions,
  getExpiringQuotes,
  getExpiredQuotes,
  getQuoteValidityStats,
} from '@/server/functions/pipeline/quote-versions';
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
      try {
        const result = await listQuoteVersions({ data: { opportunityId } });
        return requireReadResult(result, {
          message: 'Quote versions returned no data',
          contractType: 'always-shaped',
          fallbackMessage: PIPELINE_READ_MESSAGES.quoteVersionHistory,
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: PIPELINE_READ_MESSAGES.quoteVersionHistory,
        });
      }
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
      try {
        const result = await getQuoteVersion({ data: { id: versionId } });
        return requireReadResult(result, {
          message: 'Quote version not found',
          contractType: 'detail-not-found',
          fallbackMessage: PIPELINE_READ_MESSAGES.quoteVersionDetails,
          notFoundMessage: PIPELINE_READ_MESSAGES.quoteVersionNotFound,
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'detail-not-found',
          fallbackMessage: PIPELINE_READ_MESSAGES.quoteVersionDetails,
          notFoundMessage: PIPELINE_READ_MESSAGES.quoteVersionNotFound,
        });
      }
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
      try {
        const result = await compareQuoteVersions({ data: { version1Id, version2Id } });
        return requireReadResult(result, {
          message: 'Quote comparison returned no data',
          contractType: 'always-shaped',
          fallbackMessage: PIPELINE_READ_MESSAGES.quoteComparison,
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: PIPELINE_READ_MESSAGES.quoteComparison,
        });
      }
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
      try {
        const result = await getExpiringQuotes({ data: { warningDays, limit } });
        return requireReadResult(result, {
          message: 'Expiring quotes returned no data',
          contractType: 'always-shaped',
          fallbackMessage: PIPELINE_READ_MESSAGES.expiringQuotes,
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: PIPELINE_READ_MESSAGES.expiringQuotes,
        });
      }
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
      try {
        const result = await getExpiredQuotes({ data: { limit } });
        return requireReadResult(result, {
          message: 'Expired quotes returned no data',
          contractType: 'always-shaped',
          fallbackMessage: PIPELINE_READ_MESSAGES.expiredQuotes,
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: PIPELINE_READ_MESSAGES.expiredQuotes,
        });
      }
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
      try {
        const result = await getQuoteValidityStats({ data: {} });
        return requireReadResult(result, {
          message: 'Quote validity stats returned no data',
          contractType: 'always-shaped',
          fallbackMessage: PIPELINE_READ_MESSAGES.quoteValidityStats,
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: PIPELINE_READ_MESSAGES.quoteValidityStats,
        });
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { QuoteVersion, QuoteVersionListResult, QuoteComparisonResult };
