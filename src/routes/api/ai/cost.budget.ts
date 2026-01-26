/**
 * AI Budget Status Endpoint
 *
 * GET /api/ai/cost/budget
 *
 * Get current budget status for the organization and user.
 * Implements AI-INFRA-017 acceptance criteria.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { withAuth } from '@/lib/server/protected';
import { getBudgetStatus } from '@/lib/ai/utils/budget';
import { formatCost } from '@/lib/ai/utils/cost';

export async function GET() {
  try {
    // Authenticate user
    const ctx = await withAuth();

    // Get budget status
    const status = await getBudgetStatus(ctx.organizationId, ctx.user.id);

    return new Response(
      JSON.stringify({
        // Daily limits
        dailyLimitCents: status.dailyLimitCents,
        dailyUsedCents: status.dailyUsedCents,
        dailyRemainingCents: Math.max(0, status.dailyLimitCents - status.dailyUsedCents),
        dailyPercentUsed: status.dailyPercentUsed,

        // Monthly limits (org)
        monthlyLimitCents: status.monthlyLimitCents,
        monthlyUsedCents: status.monthlyUsedCents,
        monthlyRemainingCents: Math.max(0, status.monthlyLimitCents - status.monthlyUsedCents),
        monthlyPercentUsed: status.monthlyPercentUsed,

        // User limits
        userDailyLimitCents: status.userDailyLimitCents,
        userDailyUsedCents: status.userDailyUsedCents,
        userDailyRemainingCents: Math.max(0, status.userDailyLimitCents - status.userDailyUsedCents),
        userDailyPercentUsed: status.userDailyLimitCents > 0
          ? Math.round((status.userDailyUsedCents / status.userDailyLimitCents) * 100)
          : 0,

        // Formatted values for display
        formatted: {
          dailyLimit: formatCost(status.dailyLimitCents),
          dailyUsed: formatCost(status.dailyUsedCents),
          monthlyLimit: formatCost(status.monthlyLimitCents),
          monthlyUsed: formatCost(status.monthlyUsedCents),
          userDailyLimit: formatCost(status.userDailyLimitCents),
          userDailyUsed: formatCost(status.userDailyUsedCents),
        },

        // Warning thresholds
        warnings: {
          dailyWarning: status.dailyPercentUsed >= 80,
          dailyCritical: status.dailyPercentUsed >= 95,
          userWarning: status.userDailyLimitCents > 0 &&
            (status.userDailyUsedCents / status.userDailyLimitCents) >= 0.8,
          userCritical: status.userDailyLimitCents > 0 &&
            (status.userDailyUsedCents / status.userDailyLimitCents) >= 0.95,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API /ai/cost/budget] Error:', error);

    // Handle auth errors
    if (error instanceof Error && error.message.includes('Authentication')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
