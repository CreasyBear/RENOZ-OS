/**
 * AI Agent Task Status Endpoint
 *
 * GET /api/ai/agent/:taskId/status
 *
 * Get status and progress of a background agent task.
 * Implements AI-INFRA-011 acceptance criteria.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { withAuth } from '@/lib/server/protected';
import { db } from '@/lib/db';
import { aiAgentTasks } from 'drizzle/schema/_ai';
import { eq, and } from 'drizzle-orm';

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function GET({ params }: { params: { taskId: string } }) {
  try {
    // Authenticate user
    const ctx = await withAuth();

    const { taskId } = params;

    if (!taskId) {
      return new Response(
        JSON.stringify({ error: 'Missing taskId', code: 'MISSING_ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch task
    const [task] = await db
      .select()
      .from(aiAgentTasks)
      .where(
        and(
          eq(aiAgentTasks.id, taskId),
          eq(aiAgentTasks.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!task) {
      return new Response(
        JSON.stringify({ error: 'Task not found', code: 'NOT_FOUND' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build response
    const response = {
      task: {
        id: task.id,
        taskType: task.taskType,
        agent: task.agent,
        status: task.status,
        progress: task.progress,
        currentStep: task.currentStep,
        queuedAt: task.queuedAt?.toISOString(),
        startedAt: task.startedAt?.toISOString(),
        completedAt: task.completedAt?.toISOString(),
      },
      progress: task.progress,
      currentStep: task.currentStep,

      // Include result/error based on status
      ...(task.status === 'completed' && {
        result: task.result,
        tokensUsed: task.tokensUsed,
        costCents: task.costCents,
      }),
      ...(task.status === 'failed' && {
        error: task.error,
      }),

      // Timing info
      timing: {
        queuedAt: task.queuedAt?.toISOString(),
        startedAt: task.startedAt?.toISOString(),
        completedAt: task.completedAt?.toISOString(),
        durationMs: task.startedAt && task.completedAt
          ? task.completedAt.getTime() - task.startedAt.getTime()
          : undefined,
        waitTimeMs: task.queuedAt && task.startedAt
          ? task.startedAt.getTime() - task.queuedAt.getTime()
          : undefined,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[API /ai/agent/:taskId/status] Error:', error);

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
        error: 'An error occurred fetching task status',
        code: 'INTERNAL_ERROR',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
