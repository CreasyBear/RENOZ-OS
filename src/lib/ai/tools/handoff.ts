/**
 * Agent Handoff Tool
 *
 * Used by the triage agent to route requests to specialist agents.
 * This is the ONLY tool the triage agent uses, with forced tool choice.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { tool } from 'ai';
import { z } from 'zod';
import { type AgentName } from '../prompts/shared';

// ============================================================================
// SCHEMA
// ============================================================================

/**
 * Schema for the handoff_to_agent tool.
 * The triage agent uses this to route to specialists.
 */
const handoffSchema = z.object({
  targetAgent: z
    .enum(['customer', 'order', 'analytics', 'quote'])
    .describe(
      'The specialist agent to route the request to. ' +
      'customer: customer lookups, contacts, relationships. ' +
      'order: orders, invoices, quotes. ' +
      'analytics: reports, metrics, trends. ' +
      'quote: product configuration, pricing.'
    ),
  reason: z
    .string()
    .max(500)
    .describe(
      'Brief explanation of why this agent is the best fit for the user\'s request. ' +
      'This helps with conversation context preservation.'
    ),
  preserveContext: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to include conversation history when handing off'),
});

export type HandoffParams = z.infer<typeof handoffSchema>;

// ============================================================================
// HANDOFF RESULT
// ============================================================================

export interface HandoffResult {
  type: 'handoff';
  targetAgent: AgentName;
  reason: string;
  preserveContext: boolean;
}

// ============================================================================
// TOOL DEFINITION
// ============================================================================

/**
 * The handoff_to_agent tool.
 * Used by the triage agent with forced tool choice to route requests.
 */
export const handoffToAgentTool = tool({
  description:
    'Route the user\'s request to a specialist agent. You MUST use this tool ' +
    'for every request. Select the most appropriate agent based on the domain.',
  inputSchema: handoffSchema,
  execute: async (params): Promise<HandoffResult> => {
    // This tool doesn't execute anything directly.
    // The chat handler intercepts the tool call and performs the routing.
    return {
      type: 'handoff',
      targetAgent: params.targetAgent,
      reason: params.reason,
      preserveContext: params.preserveContext ?? true,
    };
  },
});

// ============================================================================
// TOOL REGISTRY
// ============================================================================

/**
 * Tools available to the triage agent.
 * Only includes the handoff tool with forced choice.
 */
export const triageTools = {
  handoff_to_agent: handoffToAgentTool,
};

/**
 * Type for triage tools.
 */
export type TriageTools = typeof triageTools;
