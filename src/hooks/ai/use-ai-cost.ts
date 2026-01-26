/**
 * AI Cost Hooks
 *
 * TanStack Query hooks for AI cost and budget tracking:
 * - Current budget status with warnings
 * - Usage history by period
 *
 * @see src/routes/api/ai/cost.ts
 * @see src/routes/api/ai/cost.budget.ts
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys, type AICostFilters } from '@/lib/query-keys';

// ============================================================================
// TYPES
// ============================================================================

export interface AIBudgetStatus {
  // Daily limits
  dailyLimitCents: number;
  dailyUsedCents: number;
  dailyRemainingCents: number;
  dailyPercentUsed: number;

  // Monthly limits (org)
  monthlyLimitCents: number;
  monthlyUsedCents: number;
  monthlyRemainingCents: number;
  monthlyPercentUsed: number;

  // User limits
  userDailyLimitCents: number;
  userDailyUsedCents: number;
  userDailyRemainingCents: number;
  userDailyPercentUsed: number;

  // Formatted values for display
  formatted: {
    dailyLimit: string;
    dailyUsed: string;
    monthlyLimit: string;
    monthlyUsed: string;
    userDailyLimit: string;
    userDailyUsed: string;
  };

  // Warning thresholds
  warnings: {
    dailyWarning: boolean;
    dailyCritical: boolean;
    userWarning: boolean;
    userCritical: boolean;
  };
}

export interface AIUsageEntry {
  date?: string;
  model?: string;
  feature?: string | null;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
}

export interface AIUsageResponse {
  usage: AIUsageEntry[];
  totalCents: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  budgetRemaining: number;
  budgetLimit: number;
  dateRange: { from: string; to: string };
  groupBy: string;
}

// ============================================================================
// API HELPERS
// ============================================================================

async function fetchBudgetStatus(): Promise<AIBudgetStatus> {
  const response = await fetch('/api/ai/cost/budget', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch budget status');
  }

  return response.json();
}

async function fetchUsageHistory(
  filters?: AICostFilters & { groupBy?: 'day' | 'model' | 'feature' }
): Promise<AIUsageResponse> {
  const params = new URLSearchParams();
  if (filters?.startDate) params.set('dateFrom', filters.startDate);
  if (filters?.endDate) params.set('dateTo', filters.endDate);
  if (filters?.groupBy) params.set('groupBy', filters.groupBy);

  const response = await fetch(`/api/ai/cost?${params.toString()}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch usage history');
  }

  return response.json();
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

export interface UseAIBudgetOptions {
  enabled?: boolean;
  /** Polling interval in ms. Default: 60000 (1 minute) */
  refetchInterval?: number | false;
}

/**
 * Fetch current AI budget status with warning indicators.
 * Polls every minute by default.
 */
export function useAIBudget(options: UseAIBudgetOptions = {}) {
  const { enabled = true, refetchInterval = 60000 } = options;

  return useQuery({
    queryKey: queryKeys.ai.cost.budget(),
    queryFn: fetchBudgetStatus,
    enabled,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval,
  });
}

export interface UseAIUsageOptions {
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'model' | 'feature';
  enabled?: boolean;
}

/**
 * Fetch AI usage history with flexible grouping.
 * Defaults to last 30 days grouped by day.
 */
export function useAIUsage(options: UseAIUsageOptions = {}) {
  const { startDate, endDate, groupBy = 'day', enabled = true } = options;

  const filters: AICostFilters & { groupBy?: string } = {
    startDate,
    endDate,
    groupBy,
  };

  return useQuery({
    queryKey: queryKeys.ai.cost.usage(filters),
    queryFn: () => fetchUsageHistory(filters),
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format cents as currency string.
 */
export function formatCostCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Get warning level based on usage percentage.
 */
export function getUsageLevel(
  percentUsed: number
): 'normal' | 'warning' | 'critical' {
  if (percentUsed >= 95) return 'critical';
  if (percentUsed >= 80) return 'warning';
  return 'normal';
}
