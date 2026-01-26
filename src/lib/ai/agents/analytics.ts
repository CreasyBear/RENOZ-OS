/**
 * Analytics Specialist Agent
 *
 * Handles reports, metrics, trends, and forecasting.
 * Uses Claude Sonnet for data analysis and insights.
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
 * Analytics agent model configuration.
 * Uses Sonnet for data analysis and insights.
 */
export const ANALYTICS_AGENT_CONFIG = {
  /** Claude Sonnet 4 for high-quality analysis */
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

const ANALYTICS_SYSTEM_PROMPT = `
You are the Analytics specialist agent for Renoz CRM. You help users with reports, metrics, trends, and forecasting.

## Your Domain

- Reports: Sales, revenue, performance, pipeline
- Metrics: KPIs, conversion rates, averages
- Trends: Historical analysis, comparisons, patterns
- Forecasting: Projections, predictions, targets

## Key Metrics

### Revenue Metrics
- Total Revenue
- Average Order Value (AOV)
- Revenue by product category
- Revenue by customer segment

### Pipeline Metrics
- Pipeline value
- Conversion rate (quote to order)
- Win/loss ratio
- Average deal size

### Operational Metrics
- Order fulfillment rate
- Average delivery time
- Customer satisfaction (CSAT)
- SLA compliance

## Time Periods

- **MTD**: Month to date
- **QTD**: Quarter to date
- **YTD**: Year to date
- **Rolling 30/60/90**: Last N days
- **Custom**: User-specified range

## Data Presentation Guidelines

- Use markdown tables for multi-row data
- Include relevant comparisons (vs previous period, vs target)
- Highlight significant changes (+/- 10% or more)
- Lead with the key insight, then provide supporting data

${COMMON_AGENT_RULES}

${SECURITY_INSTRUCTIONS}
`.trim();

// ============================================================================
// AGENT FUNCTION
// ============================================================================

export interface AnalyticsAgentOptions {
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
 * Run the analytics specialist agent.
 *
 * Returns a streaming response for real-time display.
 */
export async function runAnalyticsAgent(options: AnalyticsAgentOptions) {
  const { messages, userContext, tools = {}, abortSignal } = options;

  // Build system prompt with user context
  const systemPrompt = `
${ANALYTICS_SYSTEM_PROMPT}

## Current Context

${formatContextForLLM(userContext)}
`.trim();

  // Stream the response
  const result = await streamText({
    model: anthropic(ANALYTICS_AGENT_CONFIG.model),
    system: systemPrompt,
    messages,
    tools,
    temperature: ANALYTICS_AGENT_CONFIG.temperature,
    abortSignal,
  });

  return result;
}

/**
 * Analytics agent configuration export for the agent registry.
 */
export const analyticsAgent = {
  name: 'analytics' as const,
  config: ANALYTICS_AGENT_CONFIG,
  run: runAnalyticsAgent,
};
