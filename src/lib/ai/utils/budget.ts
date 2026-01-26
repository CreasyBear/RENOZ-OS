/**
 * AI Budget Enforcement
 *
 * Pre-execution budget checks to prevent cost overruns.
 * Implements AI-INFRA-019 acceptance criteria.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { db } from '@/lib/db';
import { aiCostTracking } from 'drizzle/schema/_ai';
import { eq, and, sql } from 'drizzle-orm';

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get organization daily budget limit from environment.
 * Default: $100.00 (10000 cents)
 */
export function getOrgDailyLimitCents(): number {
  const envValue = process.env.AI_COST_LIMIT_DAILY_CENTS;
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 10000; // $100.00 default
}

/**
 * Get user daily budget limit from environment.
 * Default: $20.00 (2000 cents)
 */
export function getUserDailyLimitCents(): number {
  const envValue = process.env.AI_COST_LIMIT_USER_CENTS;
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 2000; // $20.00 default
}

// ============================================================================
// BUDGET QUERIES
// ============================================================================

/**
 * Get organization's daily AI cost usage.
 * @param organizationId - The organization ID
 * @returns Total cost in cents for today
 */
async function getOrgDailyUsage(organizationId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];

  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${aiCostTracking.costCents}), 0)::integer`,
    })
    .from(aiCostTracking)
    .where(
      and(
        eq(aiCostTracking.organizationId, organizationId),
        sql`${aiCostTracking.date} = ${today}::date`
      )
    );

  return result[0]?.total ?? 0;
}

/**
 * Get user's daily AI cost usage.
 * @param userId - The user ID
 * @returns Total cost in cents for today
 */
async function getUserDailyUsage(userId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];

  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${aiCostTracking.costCents}), 0)::integer`,
    })
    .from(aiCostTracking)
    .where(
      and(
        eq(aiCostTracking.userId, userId),
        sql`${aiCostTracking.date} = ${today}::date`
      )
    );

  return result[0]?.total ?? 0;
}

/**
 * Get organization's monthly AI cost usage.
 * @param organizationId - The organization ID
 * @returns Total cost in cents for current month
 */
async function getOrgMonthlyUsage(organizationId: string): Promise<number> {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${aiCostTracking.costCents}), 0)::integer`,
    })
    .from(aiCostTracking)
    .where(
      and(
        eq(aiCostTracking.organizationId, organizationId),
        sql`${aiCostTracking.date} >= ${firstOfMonth}::date`
      )
    );

  return result[0]?.total ?? 0;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Check if a request is within budget limits.
 *
 * @param organizationId - The organization ID
 * @param userId - The user ID
 * @param estimatedCostCents - Estimated cost of the upcoming request
 * @returns Budget check result indicating if request is allowed
 */
export async function checkBudget(
  organizationId: string,
  userId: string,
  estimatedCostCents: number = 0
): Promise<BudgetCheckResult> {
  try {
    // Get current usage
    const [orgDailyUsed, userDailyUsed] = await Promise.all([
      getOrgDailyUsage(organizationId),
      getUserDailyUsage(userId),
    ]);

    // Get limits
    const orgDailyLimit = getOrgDailyLimitCents();
    const userDailyLimit = getUserDailyLimitCents();

    // Check org daily limit
    if (orgDailyUsed + estimatedCostCents > orgDailyLimit) {
      return {
        allowed: false,
        reason: 'Organization daily budget exceeded',
        suggestion: 'Contact admin to increase limit or wait until tomorrow',
        orgDailyUsedCents: orgDailyUsed,
        userDailyUsedCents: userDailyUsed,
        orgDailyLimitCents: orgDailyLimit,
        userDailyLimitCents: userDailyLimit,
      };
    }

    // Check user daily limit
    if (userDailyUsed + estimatedCostCents > userDailyLimit) {
      return {
        allowed: false,
        reason: 'Personal daily budget exceeded',
        suggestion: 'Wait until tomorrow or contact admin',
        orgDailyUsedCents: orgDailyUsed,
        userDailyUsedCents: userDailyUsed,
        orgDailyLimitCents: orgDailyLimit,
        userDailyLimitCents: userDailyLimit,
      };
    }

    return {
      allowed: true,
      orgDailyUsedCents: orgDailyUsed,
      userDailyUsedCents: userDailyUsed,
      orgDailyLimitCents: orgDailyLimit,
      userDailyLimitCents: userDailyLimit,
    };
  } catch (error) {
    console.error('[AI Budget] Failed to check budget:', error);
    // On error, allow request but log warning
    // This prevents budget system failures from blocking all AI usage
    return {
      allowed: true,
      reason: 'Budget check failed (allowing request)',
    };
  }
}

/**
 * Get full budget status for an organization and user.
 *
 * @param organizationId - The organization ID
 * @param userId - The user ID
 * @returns Budget status with usage and limits
 */
export async function getBudgetStatus(
  organizationId: string,
  userId: string
): Promise<BudgetStatus> {
  const [orgDailyUsed, userDailyUsed, orgMonthlyUsed] = await Promise.all([
    getOrgDailyUsage(organizationId),
    getUserDailyUsage(userId),
    getOrgMonthlyUsage(organizationId),
  ]);

  const dailyLimit = getOrgDailyLimitCents();
  const userDailyLimit = getUserDailyLimitCents();
  const monthlyLimit = dailyLimit * 30; // Approximate monthly limit

  return {
    dailyLimitCents: dailyLimit,
    dailyUsedCents: orgDailyUsed,
    monthlyLimitCents: monthlyLimit,
    monthlyUsedCents: orgMonthlyUsed,
    userDailyLimitCents: userDailyLimit,
    userDailyUsedCents: userDailyUsed,
    dailyPercentUsed: dailyLimit > 0 ? Math.round((orgDailyUsed / dailyLimit) * 100) : 0,
    monthlyPercentUsed: monthlyLimit > 0 ? Math.round((orgMonthlyUsed / monthlyLimit) * 100) : 0,
  };
}

/**
 * Create a 402 Payment Required response for budget exceeded.
 * @param reason - Reason for budget exceeded
 * @param suggestion - Suggestion for user
 * @returns Response object
 */
export function createBudgetExceededResponse(reason: string, suggestion?: string): Response {
  return new Response(
    JSON.stringify({
      error: reason,
      suggestion,
      code: 'BUDGET_EXCEEDED',
    }),
    {
      status: 402,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
