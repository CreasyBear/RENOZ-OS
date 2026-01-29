'use server'

/**
 * AI Agent Task Job
 *
 * Background job for processing autonomous AI agent workflows.
 * Implements AI-INFRA-011 acceptance criteria.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { eventTrigger } from '@trigger.dev/sdk';
import { client } from '../client';
import { db } from '@/lib/db';
import { aiAgentTasks, type TaskError } from 'drizzle/schema/_ai';
import { eq } from 'drizzle-orm';
import { trackCostFromSDK } from '@/server/functions/ai/utils/cost';

// ============================================================================
// AI EVENTS
// ============================================================================

/**
 * AI agent events triggered from API routes
 */
export const aiAgentEvents = {
  taskQueued: 'ai.agent.task_queued',
  taskStarted: 'ai.agent.task_started',
  taskCompleted: 'ai.agent.task_completed',
  taskFailed: 'ai.agent.task_failed',
  taskProgress: 'ai.agent.task_progress',
} as const;

// ============================================================================
// PAYLOAD TYPES
// ============================================================================

/**
 * AI agent task payload
 */
export interface AiAgentTaskPayload {
  /** Task ID in ai_agent_tasks table */
  taskId: string;
  /** Type of task */
  taskType: string;
  /** Agent to execute the task */
  agent: string;
  /** Task input data */
  input: Record<string, unknown>;
  /** Execution context */
  context?: {
    /** Current page/route */
    currentPage?: string;
    /** Related entity ID */
    entityId?: string;
    /** Related entity type */
    entityType?: string;
  };
  /** User ID */
  userId: string;
  /** Organization ID */
  organizationId: string;
}

/**
 * AI agent task result
 */
export interface AiAgentTaskResult {
  success: boolean;
  taskId: string;
  result?: unknown;
  error?: {
    message: string;
    code: string;
    stack?: string;
  };
  tokensUsed: number;
  costCents: number;
}

// ============================================================================
// JOB DEFINITION
// ============================================================================

/**
 * AI Agent Task Job
 *
 * This job:
 * 1. Updates task status to 'running'
 * 2. Instantiates the appropriate agent
 * 3. Executes agent with progress tracking
 * 4. Tracks token usage and costs
 * 5. Updates task with result or error
 */
export const aiAgentTaskJob = client.defineJob({
  id: 'ai-agent-task',
  name: 'AI Agent Task',
  version: '1.0.0',
  trigger: eventTrigger({
    name: aiAgentEvents.taskQueued,
  }),
  run: async (payload: AiAgentTaskPayload, io): Promise<AiAgentTaskResult> => {
    const { taskId, taskType, agent, input, context, userId, organizationId } = payload;

    let totalTokensUsed = 0;
    let totalCostCents = 0;

    try {
      // Step 1: Update task status to running
      await io.runTask('update-status-running', async () => {
        await db
          .update(aiAgentTasks)
          .set({
            status: 'running',
            startedAt: new Date(),
            currentStep: 'Initializing agent',
          })
          .where(eq(aiAgentTasks.id, taskId));

        await io.logger.info('Task started', {
          taskId,
          taskType,
          agent,
          organizationId,
        });

        return { started: true };
      });

      // Step 2: Get the agent by type
      const agentModule = await io.runTask('get-agent', async () => {
        await io.logger.info('Loading agent', { agent });

        // Dynamic import to avoid circular dependencies
        const { getAgentByType } = await import('@/lib/ai/agents');
        const agentInstance = getAgentByType(agent);

        if (!agentInstance) {
          throw new Error(`Agent not found: ${agent}`);
        }

        return { type: agent, loaded: true };
      });

      // Step 3: Update progress - preparing execution
      await io.runTask('update-progress-preparing', async () => {
        await db
          .update(aiAgentTasks)
          .set({
            progress: 10,
            currentStep: 'Preparing execution context',
          })
          .where(eq(aiAgentTasks.id, taskId));

        return { prepared: true };
      });

      // Step 4: Execute agent task
      // Note: Using separate db calls outside runTask to avoid nested progress updates
      const moduleData = agentModule as { type: string; loaded: boolean };
      await io.logger.info('Executing agent task', {
        agent: moduleData.type,
        taskType,
        hasContext: !!context,
      });

      // Import agent execution function
      const { executeAgentTask } = await import('@/lib/ai/agents');

      // Execute with progress callback (not inside runTask to allow db updates)
      const agentResult = await executeAgentTask({
        agent,
        taskType,
        input,
        context: {
          userId,
          organizationId,
          ...context,
        },
        onProgress: async (progress: number, step: string) => {
          // Update progress in database
          await db
            .update(aiAgentTasks)
            .set({
              progress,
              currentStep: step,
            })
            .where(eq(aiAgentTasks.id, taskId));

          await io.logger.info('Task progress', { progress, step });
        },
      });

      // Step 5: Track costs
      if (agentResult?.usage) {
        await io.runTask('track-cost', async () => {
          const model = agentResult.model || 'claude-sonnet-4-20250514';
          const usage = agentResult.usage!;

          await trackCostFromSDK(
            usage,
            model,
            organizationId,
            userId,
            undefined, // conversationId
            taskId,
            `agent:${agent}:${taskType}`
          );

          totalTokensUsed = (usage.promptTokens ?? 0) + (usage.completionTokens ?? 0);
          totalCostCents = agentResult.costCents ?? 0;

          await io.logger.info('Cost tracked', {
            tokensUsed: totalTokensUsed,
            costCents: totalCostCents,
            model,
          });

          return { tracked: true };
        });
      }

      // Step 6: Update task as completed
      await io.runTask('update-status-completed', async () => {
        await db
          .update(aiAgentTasks)
          .set({
            status: 'completed',
            progress: 100,
            currentStep: 'Completed',
            result: {
              success: true,
              data: agentResult?.result,
            },
            tokensUsed: totalTokensUsed,
            costCents: totalCostCents,
            completedAt: new Date(),
          })
          .where(eq(aiAgentTasks.id, taskId));

        await io.logger.info('Task completed successfully', {
          taskId,
          tokensUsed: totalTokensUsed,
          costCents: totalCostCents,
        });

        return { completed: true };
      });

      return {
        success: true,
        taskId,
        result: agentResult?.result,
        tokensUsed: totalTokensUsed,
        costCents: totalCostCents,
      };
    } catch (error) {
      // Handle failure
      const taskError: TaskError = {
        message: error instanceof Error ? error.message : String(error),
        code: 'AGENT_EXECUTION_ERROR',
        stack: error instanceof Error ? error.stack : undefined,
        retriable: true,
      };

      await io.runTask('update-status-failed', async () => {
        await db
          .update(aiAgentTasks)
          .set({
            status: 'failed',
            currentStep: 'Failed',
            error: taskError,
            tokensUsed: totalTokensUsed,
            costCents: totalCostCents,
            completedAt: new Date(),
          })
          .where(eq(aiAgentTasks.id, taskId));

        await io.logger.error('Task failed', {
          taskId,
          error: taskError.message,
        });

        return { failed: true };
      });

      // Re-throw to trigger retry if applicable
      throw error;
    }
  },
});

// ============================================================================
// HELPER FUNCTION FOR API ROUTE
// ============================================================================

/**
 * Queue an AI agent task.
 * Called from the POST /api/ai/agent route.
 */
export async function queueAgentTask(params: {
  taskType: string;
  agent: string;
  input: Record<string, unknown>;
  context?: AiAgentTaskPayload['context'];
  userId: string;
  organizationId: string;
}): Promise<{ taskId: string; status: 'queued'; statusUrl: string }> {
  // Insert task record
  const [task] = await db
    .insert(aiAgentTasks)
    .values({
      organizationId: params.organizationId,
      userId: params.userId,
      taskType: params.taskType,
      agent: params.agent as 'triage' | 'customer' | 'order' | 'analytics' | 'quote',
      input: params.input,
      context: params.context ?? {},
      status: 'queued',
      progress: 0,
    })
    .returning({ id: aiAgentTasks.id });

  // Trigger the job
  await client.sendEvent({
    name: aiAgentEvents.taskQueued,
    payload: {
      taskId: task.id,
      taskType: params.taskType,
      agent: params.agent,
      input: params.input,
      context: params.context,
      userId: params.userId,
      organizationId: params.organizationId,
    } satisfies AiAgentTaskPayload,
  });

  return {
    taskId: task.id,
    status: 'queued',
    statusUrl: `/api/ai/agent/${task.id}/status`,
  };
}
