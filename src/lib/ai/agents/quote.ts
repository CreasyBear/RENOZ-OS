/**
 * Quote Specialist Agent
 *
 * Handles product configuration, pricing, and system design.
 * Uses Claude Sonnet for technical product knowledge.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import type { ModelMessage, ToolSet } from 'ai';
import type { UserContext } from '../prompts/shared';
import { createAgent } from './factory';

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const QUOTE_SYSTEM_PROMPT = `
You are the Quote specialist agent for Renoz CRM. You help users with product configuration, pricing, and system design.

## Your Domain

- Product configuration: Selecting compatible components
- Pricing: Calculating costs, discounts, margins
- System design: Sizing and specification
- Compatibility: Ensuring components work together

## Product Categories

### Solar Systems
- Panels (various wattages)
- Inverters (string, micro, hybrid)
- Batteries (storage capacity)
- Mounting systems

### HVAC Systems
- Split systems
- Ducted systems
- Controls and thermostats

### Hot Water
- Heat pumps
- Solar hot water
- Electric and gas systems

## Pricing Concepts

- **Base Price**: Manufacturer list price
- **Cost Price**: Our acquisition cost
- **Margin**: Markup applied to cost
- **Volume Discounts**: Tiered pricing for quantity
- **Customer Pricing**: Special rates for specific customers

## Compatibility Rules

- Inverter capacity must match panel array
- Battery storage compatible with inverter type
- Mounting suitable for roof type
- Electrical capacity adequate for system

## Configuration Guidelines

- Start by understanding customer requirements
- Recommend appropriate sizing
- Verify all component compatibility
- Show itemized pricing breakdown
`.trim();

// ============================================================================
// AGENT INSTANCE
// ============================================================================

/**
 * Quote agent instance created with the factory.
 * Includes memory integration for conversation persistence.
 */
const quoteAgentInstance = createAgent({
  name: 'quote',
  systemPrompt: QUOTE_SYSTEM_PROMPT,
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
 * Quote agent model configuration.
 */
export const QUOTE_AGENT_CONFIG = quoteAgentInstance.config;

export interface QuoteAgentOptions {
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
 * Run the quote specialist agent.
 *
 * Returns a streaming response for real-time display.
 */
export async function runQuoteAgent(options: QuoteAgentOptions) {
  const { messages, userContext, conversationId, tools = {}, abortSignal } = options;

  return quoteAgentInstance.run({
    messages,
    userContext,
    conversationId,
    tools,
    abortSignal,
  });
}

/**
 * Quote agent configuration export for the agent registry.
 */
export const quoteAgent = {
  name: 'quote' as const,
  config: QUOTE_AGENT_CONFIG,
  memoryConfig: quoteAgentInstance.memoryConfig,
  run: runQuoteAgent,
};
