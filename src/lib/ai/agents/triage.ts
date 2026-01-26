/**
 * Triage Agent
 *
 * Routes user requests to specialist agents using Claude Haiku
 * with forced tool choice. Never responds directly - always hands off.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import type { ModelMessage } from 'ai';
import { triageTools } from '../tools/handoff';
import {
  SECURITY_INSTRUCTIONS,
  formatContextForLLM,
  type UserContext,
} from '../prompts/shared';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Triage agent model configuration.
 * Uses Haiku for fast, cheap routing decisions.
 */
export const TRIAGE_CONFIG = {
  /** Claude 3.5 Haiku for fast, cheap routing */
  model: 'claude-3-5-haiku-20241022',
  /** Low temperature for deterministic routing */
  temperature: 0.1,
  /** Only one turn - route and done */
  maxTurns: 1,
  /** Maximum tokens for the routing decision */
  maxTokens: 256,
} as const;

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

/**
 * Load the triage system prompt from markdown file.
 * Falls back to inline prompt if file not available.
 */
const TRIAGE_SYSTEM_PROMPT = `
You are a triage agent for Renoz CRM. Your ONLY job is to route requests to specialist agents.

## Routing Targets

- **customer**: Customer lookups, contact management, relationships
- **order**: Orders, invoices, quotes, payments
- **analytics**: Reports, metrics, trends, forecasts
- **quote**: Product configuration, pricing, system design

## Rules

1. ALWAYS use the handoff_to_agent tool. Never respond directly.
2. Pick ONE agent. Be decisive.
3. Provide a brief reason explaining your routing decision.

${SECURITY_INSTRUCTIONS}
`.trim();

// ============================================================================
// AGENT FUNCTION
// ============================================================================

export interface TriageAgentOptions {
  /** User's message to route */
  messages: ModelMessage[];
  /** User context for personalization */
  userContext: UserContext;
  /** Optional abort signal */
  abortSignal?: AbortSignal;
}

export interface TriageAgentResult {
  /** The specialist agent to hand off to */
  targetAgent: 'customer' | 'order' | 'analytics' | 'quote';
  /** Reason for the routing decision */
  reason: string;
  /** Whether to preserve conversation context */
  preserveContext: boolean;
}

/**
 * Run the triage agent to route a request.
 *
 * Uses forced tool choice to ensure the agent ALWAYS calls handoff_to_agent.
 * Returns the routing decision without streaming text.
 */
export async function runTriageAgent(
  options: TriageAgentOptions
): Promise<TriageAgentResult> {
  const { messages, userContext, abortSignal } = options;

  // Build system prompt with user context
  const systemPrompt = `
${TRIAGE_SYSTEM_PROMPT}

## Current Context

${formatContextForLLM(userContext)}
`.trim();

  // Use streamText with forced tool choice
  const result = await streamText({
    model: anthropic(TRIAGE_CONFIG.model),
    system: systemPrompt,
    messages,
    tools: triageTools,
    toolChoice: {
      type: 'tool',
      toolName: 'handoff_to_agent',
    },
    temperature: TRIAGE_CONFIG.temperature,
    abortSignal,
  });

  // Find the handoff tool call in the response stream
  for await (const part of result.fullStream) {
    if (part.type === 'tool-call' && part.toolName === 'handoff_to_agent') {
      // Cast to expected shape - Vercel AI SDK provides input as the args
      const toolArgs = (part as { input?: unknown }).input as {
        targetAgent: 'customer' | 'order' | 'analytics' | 'quote';
        reason: string;
        preserveContext?: boolean;
      } | undefined;

      if (toolArgs) {
        return {
          targetAgent: toolArgs.targetAgent,
          reason: toolArgs.reason,
          preserveContext: toolArgs.preserveContext ?? true,
        };
      }
    }
  }

  // Fallback: if somehow no tool call was made (shouldn't happen with forced choice)
  // Default to customer agent
  console.warn('[TriageAgent] No tool call found, defaulting to customer agent');
  return {
    targetAgent: 'customer',
    reason: 'Default routing due to missing tool call',
    preserveContext: true,
  };
}

/**
 * Triage agent configuration export for the agent registry.
 */
export const triageAgent = {
  name: 'triage' as const,
  config: TRIAGE_CONFIG,
  run: runTriageAgent,
};
