/**
 * Customer Specialist Agent
 *
 * Handles customer lookups, contact management, and relationship insights.
 * Uses Claude Sonnet for complex reasoning about customer data.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
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

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Customer agent model configuration.
 * Uses Sonnet for nuanced customer relationship understanding.
 */
export const CUSTOMER_AGENT_CONFIG = {
  /** Claude Sonnet 4 for high-quality responses */
  model: 'claude-sonnet-4-20250514',
  /** Moderate temperature for balanced responses */
  temperature: 0.3,
  /** Allow multi-turn conversations */
  maxTurns: 10,
  /** Maximum tokens per response */
  maxTokens: 2048,
} as const;

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const CUSTOMER_SYSTEM_PROMPT = `
You are the Customer specialist agent for Renoz CRM. You help users with customer lookups, contact management, and relationship insights.

## Your Domain

- Customer records: Lookup, search, view customer details
- Contact information: Addresses, emails, phone numbers
- Relationship management: Customer health, notes, communication history
- Customer segments: Tags, segments, customer types

## Customer Health Scores

- **Healthy (80-100)**: Active, recent orders, good payment history
- **At Risk (50-79)**: Declining engagement or overdue payments
- **Critical (<50)**: Inactive or significant issues

## Customer Types

- **Individual**: Residential customers
- **Business**: Commercial customers with ABN
- **Government**: Public sector entities
- **Non-profit**: Charitable organizations

${COMMON_AGENT_RULES}

${SECURITY_INSTRUCTIONS}
`.trim();

// ============================================================================
// AGENT FUNCTION
// ============================================================================

export interface CustomerAgentOptions {
  /** Conversation messages */
  messages: ModelMessage[];
  /** User context */
  userContext: UserContext;
  /** Tools available to this agent */
  tools?: ToolSet;
  /** Optional abort signal */
  abortSignal?: AbortSignal;
}

/**
 * Run the customer specialist agent.
 *
 * Returns a streaming response for real-time display.
 */
export async function runCustomerAgent(options: CustomerAgentOptions) {
  const { messages, userContext, tools = {}, abortSignal } = options;

  // Build system prompt with user context
  const systemPrompt = `
${CUSTOMER_SYSTEM_PROMPT}

## Current Context

${formatContextForLLM(userContext)}
`.trim();

  // Stream the response
  const result = await streamText({
    model: anthropic(CUSTOMER_AGENT_CONFIG.model),
    system: systemPrompt,
    messages,
    tools,
    temperature: CUSTOMER_AGENT_CONFIG.temperature,
    abortSignal,
  });

  return result;
}

/**
 * Customer agent configuration export for the agent registry.
 */
export const customerAgent = {
  name: 'customer' as const,
  config: CUSTOMER_AGENT_CONFIG,
  run: runCustomerAgent,
};
