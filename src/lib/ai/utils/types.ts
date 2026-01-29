/**
 * AI Utility Types
 *
 * Type definitions for AI budget and cost utilities.
 */

/**
 * Result of checking if a request is within budget.
 */
export interface BudgetCheckResult {
  /** Whether the request is allowed within budget */
  allowed: boolean;
  /** Reason if budget exceeded */
  reason?: string;
  /** Actionable suggestion for user */
  suggestion?: string;
  /** Current org daily usage in cents */
  orgDailyUsedCents?: number;
  /** Current user daily usage in cents */
  userDailyUsedCents?: number;
  /** Org daily limit in cents */
  orgDailyLimitCents?: number;
  /** User daily limit in cents */
  userDailyLimitCents?: number;
}

/**
 * Current budget status for an organization/user.
 */
export interface BudgetStatus {
  /** Organization daily limit in cents */
  dailyLimitCents: number;
  /** Organization daily usage in cents */
  dailyUsedCents: number;
  /** Monthly limit in cents (org daily * 30) */
  monthlyLimitCents: number;
  /** Monthly usage in cents */
  monthlyUsedCents: number;
  /** User daily limit in cents */
  userDailyLimitCents: number;
  /** User daily usage in cents */
  userDailyUsedCents: number;
  /** Percentage of daily budget used (0-100) */
  dailyPercentUsed: number;
  /** Percentage of monthly budget used (0-100) */
  monthlyPercentUsed: number;
}

/**
 * Budget alert level.
 */
export type BudgetAlert = 'none' | 'warning' | 'critical' | 'exceeded';

/**
 * Cost breakdown for an AI operation.
 */
export interface CostBreakdown {
  /** Input tokens used */
  inputTokens: number;
  /** Output tokens used */
  outputTokens: number;
  /** Cost in cents */
  costCents: number;
  /** Model used */
  model: string;
  /** Cached tokens (if applicable) */
  cachedTokens?: number;
}

/**
 * Result of tracking AI costs.
 */
export interface CostTrackingResult {
  /** Whether tracking succeeded */
  success: boolean;
  /** Total cost for the operation */
  totalCostCents: number;
  /** Error message if tracking failed */
  error?: string;
}
