/**
 * AI Chat Streaming Endpoint
 *
 * POST /api/ai/chat
 *
 * Streaming chat endpoint using AI SDK v6 with triage-to-specialist handoffs.
 * Uses createUIMessageStream for proper protocol compliance.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 * @see https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol
 */

import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  convertToModelMessages,
  generateId,
  type UIMessage,
} from 'ai';
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
import { setContext } from '@/lib/ai/artifacts';
import type { UserContext } from '@/lib/ai/prompts/shared';
import type { ToolSet } from 'ai';

// ============================================================================
// TYPES
// ============================================================================

interface ChatRequestBody {
  messages: UIMessage[];
  context?: {
    currentView?: string;
    conversationId?: string;
    agentChoice?: string;
    toolChoice?: string;
    timezone?: string;
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
      (sum, msg) => {
        // Extract text from parts
        const textContent = msg.parts
          ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
          .map((p) => p.text)
          .join('') ?? '';
        return sum + Math.ceil(textContent.length / 4);
      },
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

    // Convert UIMessages to model messages
    const modelMessages = await convertToModelMessages(messages);

    // Run triage agent to determine routing (or use forced agent choice)
    const targetAgent = context?.agentChoice as keyof typeof specialistRunners | undefined;
    const triageResult = targetAgent && specialistRunners[targetAgent]
      ? { targetAgent, reason: 'User selected agent' }
      : await runTriageAgent({
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
      const userTextContent = lastUserMessage.parts
        ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('') ?? '';

      await memoryProvider.saveMessage(conversation.id, {
        role: 'user',
        content: userTextContent,
        createdAt: new Date().toISOString(),
      });
    }

    // Create UI message stream with proper AI SDK v6 protocol
    const stream = createUIMessageStream({
      generateId,
      originalMessages: messages,
      execute: async ({ writer }) => {
        // Set up artifact context for streaming artifacts
        // This enables tools to stream structured data via artifacts
        setContext({
          writer,
          userId: ctx.user.id,
          organizationId: ctx.organizationId,
          userName: ctx.user.name ?? undefined,
          userRole: ctx.role,
          currentView: context?.currentView,
          timezone: context?.timezone,
        });

        // Note: Metadata (conversationId, agent, triageReason) is tracked server-side
        // and can be retrieved via the conversation API if needed.
        // The client-side onData callback handles incoming data parts from the model.

        // Run the specialist agent with tools
        const agentTools = specialistTools[triageResult.targetAgent];
        const result = await specialistRunner({
          messages: modelMessages,
          userContext,
          tools: agentTools,
        });

        // Merge the agent's stream into our stream
        writer.merge(result.toUIMessageStream());
      },
      onFinish: async ({ responseMessage }) => {
        try {
          // Extract text content from response message
          const responseText = responseMessage.parts
            ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
            .map((p) => p.text)
            .join('') ?? '';

          // Track cost (we'll get actual usage from the result in a production scenario)
          // For now, estimate based on response length
          const outputTokens = Math.ceil(responseText.length / 4);
          await trackCostFromSDK(
            {
              promptTokens: estimatedInputTokens,
              completionTokens: outputTokens,
            },
            'claude-sonnet-4-20250514',
            ctx.organizationId,
            ctx.user.id,
            conversation.id,
            undefined,
            `chat:${triageResult.targetAgent}`
          );

          // Save assistant response
          await memoryProvider.saveMessage(conversation.id, {
            role: 'assistant',
            content: responseText,
            agent: triageResult.targetAgent,
            createdAt: new Date().toISOString(),
          });
        } catch (error) {
          console.error('[Chat API] onFinish error:', error);
        }
      },
      onError: (error) => {
        console.error('[Chat API] Stream error:', error);
        return 'An error occurred while processing your request.';
      },
    });

    // Return streaming response
    return createUIMessageStreamResponse({ stream });
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
    return new Response(
      JSON.stringify({
        error: 'An error occurred processing your request',
        code: 'INTERNAL_ERROR',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
