/**
 * AI Chat Streaming Endpoint
 *
 * POST /api/ai/chat
 *
 * Streaming chat endpoint using Vercel AI SDK with triage-to-specialist handoffs.
 * Implements AI-INFRA-013 acceptance criteria.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { withAuth } from '@/lib/server/protected';
import { checkRateLimit, createRateLimitResponse } from '@/lib/ai/ratelimit';
import { checkBudget, createBudgetExceededResponse } from '@/lib/ai/utils/budget';
import { trackCostFromSDK, estimateCost } from '@/lib/ai/utils/cost';
import { getDrizzleMemoryProvider } from '@/lib/ai/memory';
import { runTriageAgent } from '@/lib/ai/agents/triage';
import {
  runCustomerAgent,
  runOrderAgent,
  runAnalyticsAgent,
  runQuoteAgent,
} from '@/lib/ai/agents';
import {
  customerTools,
  orderTools,
  analyticsTools,
  quoteTools,
} from '@/lib/ai/tools';
import type { UserContext } from '@/lib/ai/prompts/shared';
import type { ModelMessage, ToolSet } from 'ai';

// ============================================================================
// TYPES
// ============================================================================

interface ChatRequestBody {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  context?: {
    currentView?: string;
    conversationId?: string;
    orgId?: string;
    userId?: string;
  };
}

// ============================================================================
// SPECIALIST AGENT MAP
// ============================================================================

const specialistRunners = {
  customer: runCustomerAgent,
  order: runOrderAgent,
  analytics: runAnalyticsAgent,
  quote: runQuoteAgent,
} as const;

/**
 * Domain tools for each specialist agent.
 * These tools give agents the ability to query and modify data.
 */
const specialistTools: Record<keyof typeof specialistRunners, ToolSet> = {
  customer: customerTools as unknown as ToolSet,
  order: orderTools as unknown as ToolSet,
  analytics: analyticsTools as unknown as ToolSet,
  quote: quoteTools as unknown as ToolSet,
};

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST({ request }: { request: Request }) {
  try {
    // Authenticate user
    const ctx = await withAuth();

    // Parse request body
    const body = (await request.json()) as ChatRequestBody;
    const { messages, context } = body;

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required', code: 'INVALID_INPUT' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit check
    const rateLimitResult = await checkRateLimit('chat', ctx.user.id);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.retryAfter!);
    }

    // Estimate cost (rough estimate based on message length)
    const estimatedInputTokens = messages.reduce(
      (sum, msg) => sum + Math.ceil(msg.content.length / 4),
      0
    );
    const costEstimate = estimateCost('claude-sonnet-4-20250514', estimatedInputTokens, 500);

    // Budget check
    const budgetResult = await checkBudget(
      ctx.organizationId,
      ctx.user.id,
      costEstimate.costCents
    );
    if (!budgetResult.allowed) {
      return createBudgetExceededResponse(
        budgetResult.reason!,
        budgetResult.suggestion
      );
    }

    // Get or create conversation
    const memoryProvider = getDrizzleMemoryProvider();
    const conversation = await memoryProvider.getOrCreateConversation(
      ctx.user.id,
      ctx.organizationId,
      context?.conversationId
    );

    // Build user context
    const userContext: UserContext = {
      userId: ctx.user.id,
      organizationId: ctx.organizationId,
      userName: ctx.user.name ?? undefined,
      userRole: ctx.role,
      currentPage: context?.currentView,
    };

    // Convert messages to ModelMessage format
    const modelMessages: ModelMessage[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Run triage agent to determine routing
    const triageResult = await runTriageAgent({
      messages: modelMessages,
      userContext,
    });

    // Get the specialist runner
    const specialistRunner = specialistRunners[triageResult.targetAgent];
    if (!specialistRunner) {
      return new Response(
        JSON.stringify({
          error: `Unknown agent: ${triageResult.targetAgent}`,
          code: 'INVALID_AGENT',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update conversation with active agent
    await memoryProvider.updateConversation(conversation.id, {
      activeAgent: triageResult.targetAgent,
    });

    // Save user message to conversation
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage && lastUserMessage.role === 'user') {
      await memoryProvider.saveMessage(conversation.id, {
        role: 'user',
        content: lastUserMessage.content,
        createdAt: new Date().toISOString(),
      });
    }

    // Run the specialist agent with streaming and domain tools
    const agentTools = specialistTools[triageResult.targetAgent];
    const result = await specialistRunner({
      messages: modelMessages,
      userContext,
      tools: agentTools,
    });

    // Create a transform stream to track usage and save response
    let responseText = '';
    const originalStream = result.textStream;

    // Convert AsyncIterable to ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          for await (const chunk of originalStream) {
            responseText += chunk;
            controller.enqueue(encoder.encode(chunk));
          }

          // After stream completes, track cost and save message
          const usage = await result.usage;
          if (usage) {
            await trackCostFromSDK(
              {
                promptTokens: (usage as { inputTokens?: number }).inputTokens ?? 0,
                completionTokens: (usage as { outputTokens?: number }).outputTokens ?? 0,
              },
              'claude-sonnet-4-20250514',
              ctx.organizationId,
              ctx.user.id,
              conversation.id,
              undefined,
              `chat:${triageResult.targetAgent}`
            );
          }

          // Save assistant response
          await memoryProvider.saveMessage(conversation.id, {
            role: 'assistant',
            content: responseText,
            agent: triageResult.targetAgent,
            createdAt: new Date().toISOString(),
          });
        } catch (error) {
          console.error('[Chat API] Stream error:', error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    // Return streaming response with conversation metadata
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Conversation-Id': conversation.id,
        'X-Agent': triageResult.targetAgent,
        'X-Triage-Reason': triageResult.reason,
      },
    });
  } catch (error) {
    console.error('[API /ai/chat] Error:', error);

    // Handle auth errors
    if (error instanceof Error && error.message.includes('Authentication')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize error messages - never expose internal details to client
    // Log full error server-side but return generic message to client
    return new Response(
      JSON.stringify({
        error: 'An error occurred processing your request',
        code: 'INTERNAL_ERROR',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
