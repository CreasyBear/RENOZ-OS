'use server'

/**
 * AI Budget Enforcement
 *
 * Pre-execution budget checks to prevent cost overruns.
 * Implements AI-INFRA-019 acceptance criteria.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
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
  /** Current org daily usage in dollars */
  orgDailyUsed?: number;
  /** Current user daily usage in dollars */
  userDailyUsed?: number;
  /** Org daily limit in dollars */
  orgDailyLimit?: number;
  /** User daily limit in dollars */
  userDailyLimit?: number;
}

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

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get organization daily budget limit from environment.
 * Default: $100.00
 * Environment variable can be in cents (AI_COST_LIMIT_DAILY_CENTS) or dollars (AI_COST_LIMIT_DAILY)
 */
export function getOrgDailyLimit(): number {
  // Try dollars first (new format)
  const envDollars = process.env.AI_COST_LIMIT_DAILY;
  if (envDollars) {
    const parsed = parseFloat(envDollars);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  // Fallback to cents (legacy format)
  const envCents = process.env.AI_COST_LIMIT_DAILY_CENTS;
  if (envCents) {
    const parsed = parseInt(envCents, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed / 100; // Convert cents to dollars
    }
  }
  return 100; // $100.00 default
}

/**
 * Get user daily budget limit from environment.
 * Default: $20.00
 * Environment variable can be in cents (AI_COST_LIMIT_USER_CENTS) or dollars (AI_COST_LIMIT_USER)
 */
export function getUserDailyLimit(): number {
  // Try dollars first (new format)
  const envDollars = process.env.AI_COST_LIMIT_USER;
  if (envDollars) {
    const parsed = parseFloat(envDollars);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  // Fallback to cents (legacy format)
  const envCents = process.env.AI_COST_LIMIT_USER_CENTS;
  if (envCents) {
    const parsed = parseInt(envCents, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed / 100; // Convert cents to dollars
    }
  }
  return 20; // $20.00 default
}

// ============================================================================
// BUDGET QUERIES
// ============================================================================

/**
 * Get organization's daily AI cost usage.
 * @param organizationId - The organization ID
 * @returns Total cost in dollars for today
 */
async function getOrgDailyUsage(organizationId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];

  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${aiCostTracking.cost}), 0)::numeric`,
    })
    .from(aiCostTracking)
    .where(
      and(
        eq(aiCostTracking.organizationId, organizationId),
        sql`${aiCostTracking.date} = ${today}::date`
      )
    );

  return Number(result[0]?.total ?? 0);
}

/**
 * Get user's daily AI cost usage.
 * @param userId - The user ID
 * @returns Total cost in dollars for today
 */
async function getUserDailyUsage(userId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];

  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${aiCostTracking.cost}), 0)::numeric`,
    })
    .from(aiCostTracking)
    .where(
      and(
        eq(aiCostTracking.userId, userId),
        sql`${aiCostTracking.date} = ${today}::date`
      )
    );

  return Number(result[0]?.total ?? 0);
}

/**
 * Get organization's monthly AI cost usage.
 * @param organizationId - The organization ID
 * @returns Total cost in dollars for current month
 */
async function getOrgMonthlyUsage(organizationId: string): Promise<number> {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${aiCostTracking.cost}), 0)::numeric`,
    })
    .from(aiCostTracking)
    .where(
      and(
        eq(aiCostTracking.organizationId, organizationId),
        sql`${aiCostTracking.date} >= ${firstOfMonth}::date`
      )
    );

  return Number(result[0]?.total ?? 0);
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Check if a request is within budget limits.
 *
 * @param organizationId - The organization ID
 * @param userId - The user ID
 * @param estimatedCost - Estimated cost of the upcoming request in dollars
 * @returns Budget check result indicating if request is allowed
 */
export async function checkBudget(
  organizationId: string,
  userId: string,
  estimatedCost: number = 0
): Promise<BudgetCheckResult> {
  try {
    // Get current usage
    const [orgDailyUsed, userDailyUsed] = await Promise.all([
      getOrgDailyUsage(organizationId),
      getUserDailyUsage(userId),
    ]);

    // Get limits
    const orgDailyLimit = getOrgDailyLimit();
    const userDailyLimit = getUserDailyLimit();

    // Check org daily limit
    if (orgDailyUsed + estimatedCost > orgDailyLimit) {
      return {
        allowed: false,
        reason: 'Organization daily budget exceeded',
        suggestion: 'Contact admin to increase limit or wait until tomorrow',
        orgDailyUsed,
        userDailyUsed,
        orgDailyLimit,
        userDailyLimit,
      };
    }

    // Check user daily limit
    if (userDailyUsed + estimatedCost > userDailyLimit) {
      return {
        allowed: false,
        reason: 'Personal daily budget exceeded',
        suggestion: 'Wait until tomorrow or contact admin',
        orgDailyUsed,
        userDailyUsed,
        orgDailyLimit,
        userDailyLimit,
      };
    }

    return {
      allowed: true,
      orgDailyUsed,
      userDailyUsed,
      orgDailyLimit,
      userDailyLimit,
    };
  } catch (error) {
    logger.error('[AI Budget] Failed to check budget', error as Error, {});

    // CRITICAL SECURITY: Fail closed in production to prevent unbounded AI costs
    // In production, deny requests if we can't verify budget
    // In development, allow for easier testing
    if (process.env.NODE_ENV === 'production') {
      return {
        allowed: false,
        reason: 'Budget system temporarily unavailable',
        suggestion: 'Please try again in a few minutes. If the issue persists, contact support.',
      };
    }

    // Development only: allow request but warn
    logger.warn('[AI Budget] Allowing request in development despite budget check failure');
    return {
      allowed: true,
      reason: 'Budget check failed (allowing in development only)',
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

  const dailyLimit = getOrgDailyLimit();
  const userDailyLimit = getUserDailyLimit();
  const monthlyLimit = dailyLimit * 30; // Approximate monthly limit

  return {
    dailyLimit,
    dailyUsed: orgDailyUsed,
    monthlyLimit,
    monthlyUsed: orgMonthlyUsed,
    userDailyLimit,
    userDailyUsed: userDailyUsed,
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
