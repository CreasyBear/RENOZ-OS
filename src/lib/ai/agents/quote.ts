/**
 * Quote Specialist Agent
 *
 * Handles product configuration, pricing, and system design.
 * Uses Claude Sonnet for technical product knowledge.
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
 * Quote agent model configuration.
 * Uses Sonnet for technical product configuration.
 */
export const QUOTE_AGENT_CONFIG = {
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

${COMMON_AGENT_RULES}

${SECURITY_INSTRUCTIONS}
`.trim();

// ============================================================================
// AGENT FUNCTION
// ============================================================================

export interface QuoteAgentOptions {
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
 * Run the quote specialist agent.
 *
 * Returns a streaming response for real-time display.
 */
export async function runQuoteAgent(options: QuoteAgentOptions) {
  const { messages, userContext, tools = {}, abortSignal } = options;

  // Build system prompt with user context
  const systemPrompt = `
${QUOTE_SYSTEM_PROMPT}

## Current Context

${formatContextForLLM(userContext)}
`.trim();

  // Stream the response
  const result = await streamText({
    model: anthropic(QUOTE_AGENT_CONFIG.model),
    system: systemPrompt,
    messages,
    tools,
    temperature: QUOTE_AGENT_CONFIG.temperature,
    abortSignal,
  });

  return result;
}

/**
 * Quote agent configuration export for the agent registry.
 */
export const quoteAgent = {
  name: 'quote' as const,
  config: QUOTE_AGENT_CONFIG,
  run: runQuoteAgent,
};
