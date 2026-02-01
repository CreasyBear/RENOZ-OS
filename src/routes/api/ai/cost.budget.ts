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
import { getBudgetStatus } from '@/server/functions/ai/utils/budget';
import { formatCost } from '@/server/functions/ai/utils/cost';

export async function GET() {
  try {
    // Authenticate user
    const ctx = await withAuth();

    // Get budget status
    const status = await getBudgetStatus(ctx.organizationId, ctx.user.id);

    return new Response(
      JSON.stringify({
        // Daily limits (in dollars)
        dailyLimit: status.dailyLimit,
        dailyUsed: status.dailyUsed,
        dailyRemaining: Math.max(0, status.dailyLimit - status.dailyUsed),
        dailyPercentUsed: status.dailyPercentUsed,

        // Monthly limits (org) (in dollars)
        monthlyLimit: status.monthlyLimit,
        monthlyUsed: status.monthlyUsed,
        monthlyRemaining: Math.max(0, status.monthlyLimit - status.monthlyUsed),
        monthlyPercentUsed: status.monthlyPercentUsed,

        // User limits (in dollars)
        userDailyLimit: status.userDailyLimit,
        userDailyUsed: status.userDailyUsed,
        userDailyRemaining: Math.max(0, status.userDailyLimit - status.userDailyUsed),
        userDailyPercentUsed: status.userDailyLimit > 0
          ? Math.round((status.userDailyUsed / status.userDailyLimit) * 100)
          : 0,

        // Formatted values for display
        formatted: {
          dailyLimit: formatCost(status.dailyLimit),
          dailyUsed: formatCost(status.dailyUsed),
          monthlyLimit: formatCost(status.monthlyLimit),
          monthlyUsed: formatCost(status.monthlyUsed),
          userDailyLimit: formatCost(status.userDailyLimit),
          userDailyUsed: formatCost(status.userDailyUsed),
        },

        // Warning thresholds
        warnings: {
          dailyWarning: status.dailyPercentUsed >= 80,
          dailyCritical: status.dailyPercentUsed >= 95,
          userWarning: status.userDailyLimit > 0 &&
            (status.userDailyUsed / status.userDailyLimit) >= 0.8,
          userCritical: status.userDailyLimit > 0 &&
            (status.userDailyUsed / status.userDailyLimit) >= 0.95,
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
