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
  /** Current org daily usage in dollars */
  orgDailyUsed?: number;
  /** Current user daily usage in dollars */
  userDailyUsed?: number;
  /** Org daily limit in dollars */
  orgDailyLimit?: number;
  /** User daily limit in dollars */
  userDailyLimit?: number;
}

/**
 * Current budget status for an organization/user.
 */
export interface BudgetStatus {
  /** Organization daily limit in dollars */
  dailyLimit: number;
  /** Organization daily usage in dollars */
  dailyUsed: number;
  /** Monthly limit in dollars (org daily * 30) */
  monthlyLimit: number;
  /** Monthly usage in dollars */
  monthlyUsed: number;
  /** User daily limit in dollars */
  userDailyLimit: number;
  /** User daily usage in dollars */
  userDailyUsed: number;
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
  /** Cost in dollars */
  cost: number;
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
  /** Total cost for the operation in dollars */
  totalCost: number;
  /** Error message if tracking failed */
  error?: string;
}
