/**
 * AI Agent Registry
 *
 * Central export point for all AI agents.
 * Provides agent lookup and configuration access.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

// ============================================================================
// FACTORY EXPORTS
// ============================================================================

export {
  createAgent,
  createAgentConfigWithMemory,
  getMemoryTemplate,
  DEFAULT_MEMORY_CONFIG,
  SPECIALIST_DEFAULTS,
  TRIAGE_DEFAULTS,
  MODELS,
  type Agent,
  type AgentConfig,
  type AgentConfigOptions,
  type AgentMemoryConfig,
  type AgentMemoryOptions,
  type CreateAgentOptions,
  type RunAgentOptions,
  type ModelId,
} from './factory';

// ============================================================================
// SHARED CONFIGURATION (deprecated, use factory)
// ============================================================================

export { createAgentConfig } from './config';

// ============================================================================
// AGENT EXPORTS
// ============================================================================

export { triageAgent, runTriageAgent, TRIAGE_CONFIG, TRIAGE_MEMORY_CONFIG } from './triage';
export type { TriageAgentOptions, TriageAgentResult } from './triage';

export { customerAgent, runCustomerAgent, CUSTOMER_AGENT_CONFIG } from './customer';
export type { CustomerAgentOptions } from './customer';

export { orderAgent, runOrderAgent, ORDER_AGENT_CONFIG } from './order';
export type { OrderAgentOptions } from './order';

export { analyticsAgent, runAnalyticsAgent, ANALYTICS_AGENT_CONFIG } from './analytics';
export type { AnalyticsAgentOptions } from './analytics';

export { quoteAgent, runQuoteAgent, QUOTE_AGENT_CONFIG } from './quote';
export type { QuoteAgentOptions } from './quote';

// ============================================================================
// AGENT REGISTRY
// ============================================================================

import { triageAgent } from './triage';
import { customerAgent } from './customer';
import { orderAgent } from './order';
import { analyticsAgent } from './analytics';
import { quoteAgent } from './quote';
import type { AgentName } from '../prompts/shared';

/**
 * Registry of all available agents.
 * Used for dynamic agent lookup during routing.
 */
export const agentRegistry = {
  triage: triageAgent,
  customer: customerAgent,
  order: orderAgent,
  analytics: analyticsAgent,
  quote: quoteAgent,
} as const;

/**
 * Get an agent by name.
 */
export function getAgent(name: AgentName) {
  return agentRegistry[name];
}

/**
 * Specialist agent names (excludes triage).
 */
export const SPECIALIST_AGENTS = ['customer', 'order', 'analytics', 'quote'] as const;
export type SpecialistAgentName = (typeof SPECIALIST_AGENTS)[number];

/**
 * Check if an agent name is a specialist (not triage).
 */
export function isSpecialistAgent(name: string): name is SpecialistAgentName {
  return SPECIALIST_AGENTS.includes(name as SpecialistAgentName);
}

// ============================================================================
// AGENT LOOKUP BY TYPE
// ============================================================================

import { runCustomerAgent } from './customer';
import { runOrderAgent } from './order';
import { runAnalyticsAgent } from './analytics';
import { runQuoteAgent } from './quote';
import type { UserContext } from '../prompts/shared';

/**
 * Agent runner function type.
 */
type AgentRunner = (options: {
  messages: import('ai').ModelMessage[];
  userContext: UserContext;
  conversationId?: string;
  tools?: import('ai').ToolSet;
  abortSignal?: AbortSignal;
}) => ReturnType<typeof runCustomerAgent>;

/**
 * Agent runner functions by type.
 */
const agentRunners: Record<string, AgentRunner> = {
  customer: runCustomerAgent as AgentRunner,
  order: runOrderAgent as AgentRunner,
  analytics: runAnalyticsAgent as AgentRunner,
  quote: runQuoteAgent as AgentRunner,
};

/**
 * Get agent by type string.
 * Used for dynamic agent lookup in background tasks.
 */
export function getAgentByType(agentType: string) {
  const key = agentType.replace('Agent', '') as keyof typeof agentRegistry;
  return agentRegistry[key] ?? null;
}

// ============================================================================
// AGENT TASK EXECUTION
// ============================================================================

/**
 * Agent task execution input.
 */
export interface ExecuteAgentTaskInput {
  /** Agent type to execute */
  agent: string;
  /** Task type */
  taskType: string;
  /** Task input data */
  input: Record<string, unknown>;
  /** Execution context */
  context: {
    userId: string;
    organizationId: string;
    currentPage?: string;
    entityId?: string;
    entityType?: string;
    conversationId?: string;
  };
  /** Progress callback */
  onProgress?: (progress: number, step: string) => Promise<void>;
}

/**
 * Agent task execution result.
 */
export interface ExecuteAgentTaskResult {
  /** Whether the task succeeded */
  success: boolean;
  /** Task result data */
  result?: unknown;
  /** Error if failed */
  error?: string;
  /** Model used */
  model?: string;
  /** Token usage */
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  /** Cost in cents */
  costCents?: number;
}

/**
 * Execute an agent task.
 * Used by the background task job.
 */
export async function executeAgentTask(
  input: ExecuteAgentTaskInput
): Promise<ExecuteAgentTaskResult> {
  const { agent, input: taskInput, context, onProgress } = input;

  // Normalize agent name (remove 'Agent' suffix if present)
  const agentKey = agent.replace('Agent', '') as keyof typeof agentRunners;
  const runner = agentRunners[agentKey];

  if (!runner) {
    throw new Error(`Unknown agent type: ${agent}`);
  }

  try {
    // Update progress: Starting
    if (onProgress) {
      await onProgress(20, `Starting ${agentKey} agent`);
    }

    // Build messages from task input
    const userMessage = typeof taskInput.query === 'string'
      ? taskInput.query
      : JSON.stringify(taskInput);

    // Update progress: Processing
    if (onProgress) {
      await onProgress(40, 'Processing request');
    }

    // Build userContext from execution context
    const userContext: UserContext = {
      userId: context.userId,
      organizationId: context.organizationId,
      currentPage: context.currentPage,
      entityContext: context.entityId && context.entityType ? {
        [context.entityType + 'Id']: context.entityId,
      } : undefined,
    };

    // Run the agent with messages, userContext, and conversationId for memory
    const result = await runner({
      messages: [{ role: 'user', content: userMessage }],
      userContext,
      conversationId: context.conversationId,
    });

    // Update progress: Completing
    if (onProgress) {
      await onProgress(80, 'Finalizing result');
    }

    // Collect text from stream result
    let responseText = '';
    for await (const chunk of result.textStream) {
      responseText += chunk;
    }

    // Get usage from the result - SDK uses different property names
    const usage = await result.usage;
    const inputTokens = (usage as { inputTokens?: number })?.inputTokens ?? 0;
    const outputTokens = (usage as { outputTokens?: number })?.outputTokens ?? 0;

    return {
      success: true,
      result: {
        response: responseText,
        toolCalls: [], // Would need to track tool calls during streaming
        context, // Include context in result for cost tracking
      },
      model: 'claude-sonnet-4-20250514',
      usage: {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
