/**
 * Order Specialist Agent
 *
 * Handles orders, invoices, quotes, and payment management.
 * Uses Claude Sonnet for accurate financial data handling.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import type { ModelMessage, ToolSet } from 'ai';
import type { UserContext } from '../prompts/shared';
import { createAgent } from './factory';

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
`.trim();

// ============================================================================
// AGENT INSTANCE
// ============================================================================

/**
 * Order agent instance created with the factory.
 * Includes memory integration for conversation persistence.
 */
const orderAgentInstance = createAgent({
  name: 'order',
  systemPrompt: ORDER_SYSTEM_PROMPT,
  memory: {
    historyEnabled: true,
    historyLimit: 10,
    workingMemoryEnabled: true,
    workingMemoryScope: 'user',
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Order agent model configuration.
 */
export const ORDER_AGENT_CONFIG = orderAgentInstance.config;

export interface OrderAgentOptions {
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
 * Run the order specialist agent.
 *
 * Returns a streaming response for real-time display.
 */
export async function runOrderAgent(options: OrderAgentOptions) {
  const { messages, userContext, conversationId, tools = {}, abortSignal } = options;

  return orderAgentInstance.run({
    messages,
    userContext,
    conversationId,
    tools,
    abortSignal,
  });
}

/**
 * Order agent configuration export for the agent registry.
 */
export const orderAgent = {
  name: 'order' as const,
  config: ORDER_AGENT_CONFIG,
  memoryConfig: orderAgentInstance.memoryConfig,
  run: runOrderAgent,
};
