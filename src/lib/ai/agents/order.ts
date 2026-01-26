/**
 * Order Specialist Agent
 *
 * Handles orders, invoices, quotes, and payment management.
 * Uses Claude Sonnet for accurate financial data handling.
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
 * Order agent model configuration.
 * Uses Sonnet for accurate financial data handling.
 */
export const ORDER_AGENT_CONFIG = {
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

const ORDER_SYSTEM_PROMPT = `
You are the Order specialist agent for Renoz CRM. You help users with orders, invoices, quotes, and payment management.

## Your Domain

- Orders: Status, details, history, fulfillment
- Invoices: Payment status, outstanding balances, statements
- Quotes: Creation, revision, conversion to orders
- Payments: Schedules, reminders, overdue tracking

## Order Statuses

- **Draft**: Not yet confirmed
- **Confirmed**: Ready for fulfillment
- **Picking/Picked**: In warehouse processing
- **Shipped**: On the way to customer
- **Delivered**: Completed successfully
- **Cancelled**: Order cancelled

## Payment Statuses

- **Pending**: Awaiting payment
- **Partial**: Some payment received
- **Paid**: Fully paid
- **Overdue**: Past payment terms
- **Refunded**: Payment returned

## Financial Guidelines

- Always format currency as AUD
- Clearly distinguish invoiced vs paid amounts
- Highlight overdue items prominently
- Show line item breakdowns for clarity

${COMMON_AGENT_RULES}

${SECURITY_INSTRUCTIONS}
`.trim();

// ============================================================================
// AGENT FUNCTION
// ============================================================================

export interface OrderAgentOptions {
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
 * Run the order specialist agent.
 *
 * Returns a streaming response for real-time display.
 */
export async function runOrderAgent(options: OrderAgentOptions) {
  const { messages, userContext, tools = {}, abortSignal } = options;

  // Build system prompt with user context
  const systemPrompt = `
${ORDER_SYSTEM_PROMPT}

## Current Context

${formatContextForLLM(userContext)}
`.trim();

  // Stream the response
  const result = await streamText({
    model: anthropic(ORDER_AGENT_CONFIG.model),
    system: systemPrompt,
    messages,
    tools,
    temperature: ORDER_AGENT_CONFIG.temperature,
    abortSignal,
  });

  return result;
}

/**
 * Order agent configuration export for the agent registry.
 */
export const orderAgent = {
  name: 'order' as const,
  config: ORDER_AGENT_CONFIG,
  run: runOrderAgent,
};
