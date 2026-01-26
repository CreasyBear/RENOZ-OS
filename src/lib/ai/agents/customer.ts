/**
 * Customer Specialist Agent
 *
 * Handles customer lookups, contact management, and relationship insights.
 * Uses Claude Sonnet for complex reasoning about customer data.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import type { ModelMessage, ToolSet } from 'ai';
import type { UserContext } from '../prompts/shared';
import { createAgent } from './factory';

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
`.trim();

// ============================================================================
// AGENT INSTANCE
// ============================================================================

/**
 * Customer agent instance created with the factory.
 * Includes memory integration for conversation persistence.
 */
const customerAgentInstance = createAgent({
  name: 'customer',
  systemPrompt: CUSTOMER_SYSTEM_PROMPT,
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
 * Customer agent model configuration.
 */
export const CUSTOMER_AGENT_CONFIG = customerAgentInstance.config;

export interface CustomerAgentOptions {
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
 * Run the customer specialist agent.
 *
 * Returns a streaming response for real-time display.
 */
export async function runCustomerAgent(options: CustomerAgentOptions) {
  const { messages, userContext, conversationId, tools = {}, abortSignal } = options;

  return customerAgentInstance.run({
    messages,
    userContext,
    conversationId,
    tools,
    abortSignal,
  });
}

/**
 * Customer agent configuration export for the agent registry.
 */
export const customerAgent = {
  name: 'customer' as const,
  config: CUSTOMER_AGENT_CONFIG,
  memoryConfig: customerAgentInstance.memoryConfig,
  run: runCustomerAgent,
};
