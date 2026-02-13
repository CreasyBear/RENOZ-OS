'use server'

/**
 * AI Agent Dispatch Endpoint
 *
 * POST /api/ai/agent
 *
 * Queue a background agent task for processing.
 * Implements AI-INFRA-011 acceptance criteria.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { withAuth } from '@/lib/server/protected';
import { checkRateLimit, createRateLimitResponse } from '@/lib/ai/ratelimit';
import { checkBudget, createBudgetExceededResponse } from '@/server/functions/ai/utils/budget';
import { estimateCost } from '@/server/functions/ai/utils/cost';
import { queueAgentTask } from '@/trigger/jobs/ai-agent-task';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

interface AgentRequestBody {
  taskType: string;
  agent: string;
  input: Record<string, unknown>;
  context?: {
    currentPage?: string;
    entityId?: string;
    entityType?: string;
  };
}

// ============================================================================
// VALID AGENTS
// ============================================================================

const VALID_AGENTS = ['customer', 'order', 'analytics', 'quote'] as const;
type ValidAgent = (typeof VALID_AGENTS)[number];

function isValidAgent(agent: string): agent is ValidAgent {
  return VALID_AGENTS.includes(agent as ValidAgent);
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST({ request }: { request: Request }) {
  try {
    // Authenticate user
    const ctx = await withAuth();

    // Parse request body
    const body = (await request.json()) as AgentRequestBody;
    const { taskType, agent, input, context } = body;

    // Validate required fields
    if (!taskType) {
      return new Response(
        JSON.stringify({ error: 'taskType is required', code: 'MISSING_FIELD' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!agent) {
      return new Response(
        JSON.stringify({ error: 'agent is required', code: 'MISSING_FIELD' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!isValidAgent(agent)) {
      return new Response(
        JSON.stringify({
          error: `Invalid agent. Must be one of: ${VALID_AGENTS.join(', ')}`,
          code: 'INVALID_AGENT',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!input || typeof input !== 'object') {
      return new Response(
        JSON.stringify({ error: 'input object is required', code: 'MISSING_FIELD' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit check (agent limit: 5 per hour)
    const rateLimitResult = await checkRateLimit('agent', ctx.user.id);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.retryAfter!);
    }

    // Estimate cost for agent task (higher than chat due to multiple turns)
    const estimatedInputTokens = 2000; // Agent tasks typically use more tokens
    const costEstimate = estimateCost('claude-sonnet-4-20250514', estimatedInputTokens, 1000);

    // Budget check
    const budgetResult = await checkBudget(
      ctx.organizationId,
      ctx.user.id,
      costEstimate.cost * 3 // Multiply by 3 for safety margin on agent tasks
    );
    if (!budgetResult.allowed) {
      return createBudgetExceededResponse(
        budgetResult.reason!,
        budgetResult.suggestion
      );
    }

    // Queue the agent task
    const result = await queueAgentTask({
      taskType,
      agent,
      input,
      context,
      userId: ctx.user.id,
      organizationId: ctx.organizationId,
    });

    return new Response(
      JSON.stringify({
        taskId: result.taskId,
        status: result.status,
        statusUrl: result.statusUrl,
        message: 'Task queued successfully',
      }),
      { status: 202, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('[API /ai/agent] Error', error as Error, {});

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
        error: 'An error occurred queuing the task',
        code: 'INTERNAL_ERROR',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
