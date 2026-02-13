/**
 * Win/Loss Analysis Hooks
 *
 * TanStack Query hooks for win/loss analysis data:
 * - Win/Loss analysis with trends
 * - Competitor analysis
 *
 * @see src/lib/query-keys.ts for centralized query keys
 * @see src/server/functions/pipeline/win-loss-reasons.ts for server functions
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getWinLossAnalysis, getCompetitors } from '@/server/functions/pipeline/win-loss-reasons';

// ============================================================================
// TYPES
// ============================================================================

export type WinLossAnalysisResult = Awaited<ReturnType<typeof getWinLossAnalysis>>;
export type CompetitorsResult = Awaited<ReturnType<typeof getCompetitors>>;

export interface WinAnalysisItem {
  reasonId: string | null;
  reasonName: string;
  reasonType: 'win';
  count: number;
  totalValue: number;
  avgValue: number;
  avgDaysToClose: number;
}

export interface LossAnalysisItem {
  reasonId: string | null;
  reasonName: string;
  reasonType: 'loss';
  count: number;
  totalValue: number;
  avgValue: number;
  avgDaysToClose: number;
  topCompetitor?: string | null;
}

export interface TrendItem {
  month: string;
  wonCount: number;
  lostCount: number;
  wonValue: number;
  lostValue: number;
  winRate: number;
}

export interface Competitor {
  name: string | null;
  lossCount: number;
  totalLostValue: number;
}

// ============================================================================
// WIN/LOSS ANALYSIS HOOKS
// ============================================================================

export interface UseWinLossAnalysisOptions {
  /** Start date (Date object) */
  dateFrom?: Date;
  /** End date (Date object) */
  dateTo?: Date;
  /** Filter by type: 'win' or 'loss' */
  type?: 'win' | 'loss';
  enabled?: boolean;
}

/**
 * Fetch win/loss analysis data with trends.
 * Shows breakdown of reasons with counts and values.
 */
export function useWinLossAnalysis(options: UseWinLossAnalysisOptions = {}) {
  const { dateFrom, dateTo, type, enabled = true } = options;

  // Convert dates to ISO strings for query key
  const dateFromStr = dateFrom?.toISOString() ?? '';
  const dateToStr = dateTo?.toISOString() ?? '';

  return useQuery({
    queryKey: queryKeys.reports.winLossAnalysis(dateFromStr, dateToStr),
    queryFn: async () => {
      const result = await getWinLossAnalysis({
        data: { dateFrom, dateTo, type },
      
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// COMPETITORS HOOKS
// ============================================================================

export interface UseCompetitorsOptions {
  /** Start date (Date object) */
  dateFrom?: Date;
  /** End date (Date object) */
  dateTo?: Date;
  enabled?: boolean;
}

/**
 * Fetch competitor analysis from lost opportunities.
 * Shows which competitors are most frequently mentioned in losses.
 */
export function useCompetitors(options: UseCompetitorsOptions = {}) {
  const { dateFrom, dateTo, enabled = true } = options;

  // Convert dates to ISO strings for query key
  const dateFromStr = dateFrom?.toISOString() ?? '';
  const dateToStr = dateTo?.toISOString() ?? '';

  return useQuery({
    queryKey: queryKeys.reports.competitors(dateFromStr, dateToStr),
    queryFn: async () => {
      const result = await getCompetitors({
        data: { dateFrom, dateTo },
      
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
