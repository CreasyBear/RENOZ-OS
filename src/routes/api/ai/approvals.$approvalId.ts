import { z } from 'zod';
import { aiEmailDraftSchema } from '@/lib/ai/approvals/email-draft';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/server/protected';
import { updateEmailApprovalDraft } from '@/server/functions/ai/approvals';

const updateApprovalDraftSchema = z.object({
  draft: aiEmailDraftSchema,
  expectedVersion: z.number().int().positive().optional(),
});

export async function PATCH({
  request,
  params,
}: {
  request: Request;
  params: { approvalId: string };
}) {
  try {
    const ctx = await withAuth();
    const body = await request.json().catch(() => null);

    if (body === null) {
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON body',
          code: 'VALIDATION_ERROR',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const parseResult = updateApprovalDraftSchema.safeParse(body);

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

    const result = await updateEmailApprovalDraft(
      params.approvalId,
      ctx.user.id,
      ctx.organizationId,
      parseResult.data.draft,
      parseResult.data.expectedVersion
    );

    if (!result.success || !result.approval) {
      const status =
        result.code === 'NOT_FOUND'
          ? 404
          : result.code === 'FORBIDDEN'
            ? 403
            : result.code === 'VERSION_CONFLICT'
              ? 409
              : 400;

      return new Response(
        JSON.stringify({
          success: false,
          error: result.error,
          code: result.code,
        }),
        { status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        approval: {
          id: result.approval.id,
          action: result.approval.action,
          agent: result.approval.agent,
          actionData: result.approval.actionData,
          version: result.approval.version,
          status: result.approval.status,
          createdAt: result.approval.createdAt.toISOString(),
          expiresAt: result.approval.expiresAt.toISOString(),
          conversationId: result.approval.conversationId,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('[API /ai/approvals/:approvalId] Error', error as Error, {});

    if (error instanceof Error && error.message.includes('Authentication')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'An error occurred updating the approval draft',
        code: 'INTERNAL_ERROR',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
