/**
 * Analytics Specialist Agent
 *
 * Handles reports, metrics, trends, and forecasting.
 * Uses Claude Sonnet for data analysis and insights.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import type { ModelMessage, ToolSet } from 'ai';
import type { UserContext } from '../prompts/shared';
import { createAgent } from './factory';

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
`.trim();

// ============================================================================
// AGENT INSTANCE
// ============================================================================

/**
 * Analytics agent instance created with the factory.
 * Includes memory integration for conversation persistence.
 */
const analyticsAgentInstance = createAgent({
  name: 'analytics',
  systemPrompt: ANALYTICS_SYSTEM_PROMPT,
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
 * Analytics agent model configuration.
 */
export const ANALYTICS_AGENT_CONFIG = analyticsAgentInstance.config;

export interface AnalyticsAgentOptions {
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
 * Run the analytics specialist agent.
 *
 * Returns a streaming response for real-time display.
 */
export async function runAnalyticsAgent(options: AnalyticsAgentOptions) {
  const { messages, userContext, conversationId, tools = {}, abortSignal } = options;

  return analyticsAgentInstance.run({
    messages,
    userContext,
    conversationId,
    tools,
    abortSignal,
  });
}

/**
 * Analytics agent configuration export for the agent registry.
 */
export const analyticsAgent = {
  name: 'analytics' as const,
  config: ANALYTICS_AGENT_CONFIG,
  memoryConfig: analyticsAgentInstance.memoryConfig,
  run: runAnalyticsAgent,
};
