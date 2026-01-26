/**
 * AI Approve Action Endpoint
 *
 * POST /api/ai/approve
 *
 * Approve or reject AI-drafted actions.
 * Implements AI-INFRA-015 acceptance criteria.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { withAuth } from '@/lib/server/protected';
import { executeAction, rejectAction } from '@/lib/ai/approvals';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const approveRequestSchema = z.object({
  approvalId: z.string().uuid('Invalid approval ID format'),
  action: z.enum(['approve', 'reject'], {
    message: 'Action must be "approve" or "reject"',
  }),
  rejectionReason: z.string().max(1000).optional(),
});

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST({ request }: { request: Request }) {
  try {
    // Authenticate user
    const ctx = await withAuth();

    // Parse and validate request body
    const body = await request.json();
    const parseResult = approveRequestSchema.safeParse(body);

    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      return new Response(
        JSON.stringify({
          error: firstIssue?.message ?? 'Invalid request',
          code: 'VALIDATION_ERROR',
          field: firstIssue?.path.join('.'),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { approvalId, action, rejectionReason } = parseResult.data;

    // Execute or reject based on action
    if (action === 'approve') {
      const result = await executeAction(
        approvalId,
        ctx.user.id,
        ctx.organizationId
      );

      if (!result.success) {
        const status = result.code === 'NOT_FOUND' ? 404 :
                       result.code === 'EXPIRED' ? 410 :
                       result.code === 'INVALID_STATUS' ? 409 : 400;

        return new Response(
          JSON.stringify({
            error: result.error,
            code: result.code,
            success: false,
          }),
          { status, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          result: result.result,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      // Reject action
      const result = await rejectAction(
        approvalId,
        ctx.user.id,
        ctx.organizationId,
        rejectionReason
      );

      if (!result.success) {
        return new Response(
          JSON.stringify({
            error: result.error,
            success: false,
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Action rejected',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('[API /ai/approve] Error:', error);

    // Handle auth errors
    if (error instanceof Error && error.message.includes('Authentication')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize error messages - never expose internal details to client
    return new Response(
      JSON.stringify({
        error: 'An error occurred processing approval',
        code: 'INTERNAL_ERROR',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
