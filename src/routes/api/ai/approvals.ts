/**
 * AI Approvals List Endpoint
 *
 * GET /api/ai/approvals
 *
 * List pending AI approvals for the current user.
 * Implements AI-INFRA-015 acceptance criteria.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { withAuth } from '@/lib/server/protected';
import { getPendingApprovals } from '@/server/functions/ai/approvals';
import { logger } from '@/lib/logger';

export async function GET({ request }: { request: Request }) {
  try {
    // Authenticate user
    const ctx = await withAuth();

    // Parse query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'pending';
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    // Only support pending status for now (other statuses would need different query)
    if (status !== 'pending') {
      return new Response(
        JSON.stringify({
          error: 'Only status=pending is supported',
          code: 'INVALID_STATUS',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get pending approvals
    const result = await getPendingApprovals(ctx.organizationId, {
      userId: ctx.user.id,
      limit: Math.min(limit, 100), // Cap at 100
    });

    // Transform for API response
    const approvals = result.approvals.map((approval) => ({
      id: approval.id,
      action: approval.action,
      agent: approval.agent,
      actionData: approval.actionData,
      status: approval.status,
      createdAt: approval.createdAt.toISOString(),
      expiresAt: approval.expiresAt.toISOString(),
      conversationId: approval.conversationId,
    }));

    return new Response(
      JSON.stringify({
        approvals,
        total: result.total,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('[API /ai/approvals] Error', error as Error, {});

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
