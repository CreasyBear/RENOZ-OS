/**
 * Agent Factory
 *
 * Creates pre-configured agent runners with consistent memory integration.
 * Adapts the Midday pattern for use with Vercel AI SDK's streamText.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 * @see _reference/.midday-reference/apps/api/src/ai/agents/config/shared.ts
 */

import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import type { ModelMessage, ToolSet } from 'ai';
import {
  SECURITY_INSTRUCTIONS,
  COMMON_AGENT_RULES,
  formatContextForLLM,
  type UserContext,
} from '../prompts/shared';
import { formatMemoryContext, buildMemoryContext } from '@/server/functions/ai/memory';
import type { AgentConfig, AgentConfigOptions, ModelId } from './config';
import { createAgentConfig as createBaseAgentConfig, SPECIALIST_DEFAULTS } from './config';

// Import template so it's bundled — works on Vercel (no process.cwd() path)
import memoryTemplateRaw from './config/memory-template.md?raw';

// ============================================================================
// MEMORY TEMPLATE
// ============================================================================

/**
 * Get the working memory template.
 * Template is used for agent working memory scope.
 */
export function getMemoryTemplate(): string {
  return memoryTemplateRaw || FALLBACK_MEMORY_TEMPLATE;
}

const FALLBACK_MEMORY_TEMPLATE = `<user_profile>
Name: [Learn from conversation]
Role: [Unknown]
</user_profile>

<business_context>
Organization: [Current organization]
</business_context>`;

// ============================================================================
// AGENT MEMORY CONFIGURATION
// ============================================================================

/**
 * Memory configuration for agents.
 * Defines how conversation history and working memory behave.
 */
export interface AgentMemoryOptions {
  /** Enable conversation history tracking */
  historyEnabled?: boolean;
  /** Maximum conversation history entries to include */
  historyLimit?: number;
  /** Enable working memory for user context persistence */
  workingMemoryEnabled?: boolean;
  /** Working memory scope: 'user' persists across conversations, 'conversation' is per-chat */
  workingMemoryScope?: 'user' | 'conversation';
  /** Custom working memory template override */
  workingMemoryTemplate?: string;
}

/**
 * Full memory configuration used internally.
 */
export interface AgentMemoryConfig {
  history: {
    enabled: boolean;
    limit: number;
  };
  workingMemory?: {
    enabled: boolean;
    template: string;
    scope: 'user' | 'conversation';
  };
}

/**
 * Default memory configuration for specialist agents.
 */
export const DEFAULT_MEMORY_CONFIG: AgentMemoryConfig = {
  history: {
    enabled: true,
    limit: 10,
  },
  workingMemory: {
    enabled: true,
    template: '', // Will be populated with getMemoryTemplate()
    scope: 'user',
  },
};

// ============================================================================
// AGENT FACTORY TYPES
// ============================================================================

/**
 * Agent creation options.
 */
export interface CreateAgentOptions {
  /** Agent name for logging and identification */
  name: string;
  /** System prompt for the agent */
  systemPrompt: string;
  /** Model configuration overrides */
  modelConfig?: Partial<AgentConfigOptions>;
  /** Memory configuration */
  memory?: AgentMemoryOptions;
  /** Base configuration to extend (defaults to SPECIALIST_DEFAULTS) */
  baseConfig?: AgentConfig;
}

/**
 * Options for running an agent.
 */
export interface RunAgentOptions {
  /** Conversation messages */
  messages: ModelMessage[];
  /** User context */
  userContext: UserContext;
  /** Conversation ID for memory persistence */
  conversationId?: string;
  /** Tools available to this agent */
  tools?: ToolSet;
  /** Optional abort signal */
  abortSignal?: AbortSignal;
}

/**
 * Agent instance returned by createAgent.
 */
export interface Agent {
  /** Agent name */
  name: string;
  /** Agent configuration */
  config: AgentConfig;
  /** Memory configuration */
  memoryConfig: AgentMemoryConfig;
  /** Run the agent */
  run: (options: RunAgentOptions) => Promise<ReturnType<typeof streamText>>;
}

// ============================================================================
// AGENT FACTORY
// ============================================================================

/**
 * Create an agent with consistent memory integration.
 *
 * This factory:
 * 1. Sets up model configuration with sensible defaults
 * 2. Configures memory (history + working memory)
 * 3. Injects memory context into system prompts
 * 4. Provides a consistent run() interface
 *
 * @example
 * ```typescript
 * const customerAgent = createAgent({
 *   name: 'customer',
 *   systemPrompt: CUSTOMER_SYSTEM_PROMPT,
 *   memory: { historyLimit: 15 },
 * });
 *
 * const result = await customerAgent.run({
 *   messages,
 *   userContext,
 *   tools: customerTools,
 * });
 * ```
 */
export function createAgent(options: CreateAgentOptions): Agent {
  const {
    name,
    systemPrompt,
    modelConfig = {},
    memory = {},
    baseConfig = SPECIALIST_DEFAULTS,
  } = options;

  // Build model configuration
  const config = createBaseAgentConfig(modelConfig, baseConfig);

  // Build memory configuration
  const memoryConfig: AgentMemoryConfig = {
    history: {
      enabled: memory.historyEnabled ?? DEFAULT_MEMORY_CONFIG.history.enabled,
      limit: memory.historyLimit ?? DEFAULT_MEMORY_CONFIG.history.limit,
    },
  };

  // Add working memory if enabled
  if (memory.workingMemoryEnabled !== false) {
    memoryConfig.workingMemory = {
      enabled: true,
      template: memory.workingMemoryTemplate ?? getMemoryTemplate(),
      scope: memory.workingMemoryScope ?? 'user',
    };
  }

  // Create the run function
  const run = async (runOptions: RunAgentOptions) => {
    const { messages, userContext, conversationId, tools = {}, abortSignal } = runOptions;

    // Build the full system prompt with memory context
    let fullSystemPrompt = `${systemPrompt}

## Current Context

${formatContextForLLM(userContext)}`;

    // Inject memory context if working memory is enabled
    if (memoryConfig.workingMemory?.enabled) {
      const memoryContext = await buildMemoryContext(
        userContext.organizationId,
        userContext.userId,
        conversationId
      );
      const memoryContextStr = formatMemoryContext(memoryContext);
      if (memoryContextStr) {
        fullSystemPrompt = `${memoryContextStr}

${fullSystemPrompt}`;
      }
    }

    // Apply security instructions and common rules
    fullSystemPrompt = `${fullSystemPrompt}

${COMMON_AGENT_RULES}

${SECURITY_INSTRUCTIONS}`.trim();

    // Stream the response
    const result = streamText({
      model: anthropic(config.model),
      system: fullSystemPrompt,
      messages,
      tools,
      temperature: config.temperature,
      abortSignal,
      experimental_context: {
        userId: userContext.userId,
        organizationId: userContext.organizationId,
      },
    });

    return result;
  };

  return {
    name,
    config,
    memoryConfig,
    run,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create agent configuration with memory options.
 *
 * @deprecated Use createAgent() instead for full agent creation.
 * This function is kept for backward compatibility during migration.
 */
export function createAgentConfigWithMemory(
  configOverrides: Partial<AgentConfigOptions> = {},
  memoryOptions: AgentMemoryOptions = {},
  baseConfig: AgentConfig = SPECIALIST_DEFAULTS
): { config: AgentConfig; memoryConfig: AgentMemoryConfig } {
  const config = createBaseAgentConfig(configOverrides, baseConfig);

  const memoryConfig: AgentMemoryConfig = {
    history: {
      enabled: memoryOptions.historyEnabled ?? DEFAULT_MEMORY_CONFIG.history.enabled,
      limit: memoryOptions.historyLimit ?? DEFAULT_MEMORY_CONFIG.history.limit,
    },
  };

  if (memoryOptions.workingMemoryEnabled !== false) {
    memoryConfig.workingMemory = {
      enabled: true,
      template: memoryOptions.workingMemoryTemplate ?? getMemoryTemplate(),
      scope: memoryOptions.workingMemoryScope ?? 'user',
    };
  }

  return { config, memoryConfig };
}

// ============================================================================
// EXPORTS
// ============================================================================

// Re-export types and defaults from config for convenience
export type { AgentConfig, AgentConfigOptions, ModelId };
export { SPECIALIST_DEFAULTS, TRIAGE_DEFAULTS, MODELS } from './config';
