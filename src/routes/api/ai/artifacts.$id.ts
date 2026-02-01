/**
 * AI Artifacts Streaming Endpoint
 *
 * GET /api/ai/artifacts/:id
 *
 * Stream artifact data progressively with Server-Sent Events.
 * Implements AI-INFRA-016 acceptance criteria.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { withAuth } from '@/lib/server/protected';
import { db } from '@/lib/db';
import { aiConversations, aiAgentTasks } from 'drizzle/schema/_ai';
import { eq, and } from 'drizzle-orm';

// ============================================================================
// TYPES
// ============================================================================

type ArtifactStage = 'loading' | 'data_ready' | 'analysis_ready' | 'error';

interface ArtifactEvent {
  stage: ArtifactStage;
  content?: unknown;
  message?: string;
}

// ============================================================================
// SSE HELPERS
// ============================================================================

/**
 * Format an SSE event.
 */
function formatSSE(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Create an SSE response stream.
 */
function createSSEStream(
  generator: AsyncGenerator<ArtifactEvent, void, unknown>
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        for await (const event of generator) {
          const sseData = formatSSE('stage', event);
          controller.enqueue(encoder.encode(sseData));
        }
      } catch (error) {
        const errorEvent = formatSSE('error', {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'STREAM_ERROR',
        });
        controller.enqueue(encoder.encode(errorEvent));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

// ============================================================================
// ARTIFACT FETCHING
// ============================================================================

/**
 * Fetch artifact data based on ID prefix.
 * - conv_* -> from ai_conversations
 * - task_* -> from ai_agent_tasks
 * - report_* -> generated report data
 */
async function fetchArtifactData(
  artifactId: string,
  organizationId: string
): Promise<{
  type: string;
  data: unknown;
  metadata?: Record<string, unknown>;
} | null> {
  // Conversation artifact
  if (artifactId.startsWith('conv_')) {
    const conversationId = artifactId.replace('conv_', '');
    const [conversation] = await db
      .select()
      .from(aiConversations)
      .where(
        and(
          eq(aiConversations.id, conversationId),
          eq(aiConversations.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!conversation) return null;

    return {
      type: 'conversation',
      data: {
        id: conversation.id,
        activeAgent: conversation.activeAgent,
        agentHistory: conversation.agentHistory,
        metadata: conversation.metadata,
      },
      metadata: {
        lastMessageAt: conversation.lastMessageAt?.toISOString(),
        createdAt: conversation.createdAt.toISOString(),
      },
    };
  }

  // Task artifact
  if (artifactId.startsWith('task_')) {
    const taskId = artifactId.replace('task_', '');
    const [task] = await db
      .select()
      .from(aiAgentTasks)
      .where(
        and(
          eq(aiAgentTasks.id, taskId),
          eq(aiAgentTasks.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!task) return null;

    return {
      type: 'task',
      data: {
        id: task.id,
        taskType: task.taskType,
        agent: task.agent,
        status: task.status,
        progress: task.progress,
        currentStep: task.currentStep,
        result: task.result,
        tokensUsed: task.tokensUsed,
        cost: task.cost,
      },
      metadata: {
        queuedAt: task.queuedAt?.toISOString(),
        startedAt: task.startedAt?.toISOString(),
        completedAt: task.completedAt?.toISOString(),
      },
    };
  }

  // Report artifact (inline data)
  if (artifactId.startsWith('report_')) {
    // For report artifacts, the ID contains encoded data or references
    // This is a placeholder - actual implementation depends on report storage
    return {
      type: 'report',
      data: {
        id: artifactId,
        status: 'pending',
        message: 'Report data not yet available',
      },
    };
  }

  return null;
}

// ============================================================================
// ARTIFACT STREAM GENERATOR
// ============================================================================

/**
 * Generate artifact data as a stream of stages.
 */
async function* generateArtifactStream(
  artifactId: string,
  organizationId: string
): AsyncGenerator<ArtifactEvent, void, unknown> {
  // Stage 1: Loading
  yield { stage: 'loading', message: 'Fetching artifact data...' };

  // Small delay for realistic loading UX
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Fetch artifact data
  const artifact = await fetchArtifactData(artifactId, organizationId);

  if (!artifact) {
    yield {
      stage: 'error',
      message: 'Artifact not found',
    };
    return;
  }

  // Stage 2: Data ready
  yield {
    stage: 'data_ready',
    content: {
      type: artifact.type,
      data: artifact.data,
      metadata: artifact.metadata,
    },
  };

  // Stage 3: Analysis ready (if applicable)
  // For now, provide basic analysis based on artifact type
  if (artifact.type === 'task') {
    const taskData = artifact.data as { status: string; progress: number };

    yield {
      stage: 'analysis_ready',
      content: {
        summary: `Task is ${taskData.status} with ${taskData.progress}% progress`,
        insights: [],
      },
    };
  } else if (artifact.type === 'conversation') {
    yield {
      stage: 'analysis_ready',
      content: {
        summary: 'Conversation history loaded',
        insights: [],
      },
    };
  } else {
    yield {
      stage: 'analysis_ready',
      content: {
        summary: `${artifact.type} artifact loaded`,
        insights: [],
      },
    };
  }
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function GET({ params }: { params: { id: string } }) {
  try {
    // Authenticate user
    const ctx = await withAuth();

    const artifactId = params.id;

    if (!artifactId) {
      return new Response(
        JSON.stringify({ error: 'Missing artifact ID', code: 'MISSING_ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create SSE stream
    const generator = generateArtifactStream(artifactId, ctx.organizationId);
    return createSSEStream(generator);
  } catch (error) {
    console.error('[API /ai/artifacts/:id] Error:', error);

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
        error: 'An error occurred loading artifact',
        code: 'INTERNAL_ERROR',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
