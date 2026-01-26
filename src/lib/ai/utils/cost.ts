/**
 * AI Cost Tracking
 *
 * Track token usage and calculate costs for AI operations.
 * Implements AI-INFRA-019 acceptance criteria.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { db } from '@/lib/db';
import { aiCostTracking } from 'drizzle/schema/_ai';

// ============================================================================
// TYPES
// ============================================================================

export interface TokenUsage {
  /** Number of input tokens */
  inputTokens: number;
  /** Number of output tokens */
  outputTokens: number;
  /** Number of cache read tokens (Anthropic prompt caching) */
  cacheReadTokens?: number;
  /** Number of cache write tokens (Anthropic prompt caching) */
  cacheWriteTokens?: number;
}

export interface TrackCostInput {
  /** Token usage from AI response */
  usage: TokenUsage;
  /** Model identifier */
  model: string;
  /** Organization ID */
  organizationId: string;
  /** User ID (optional for system tasks) */
  userId?: string;
  /** Associated conversation ID */
  conversationId?: string;
  /** Associated task ID */
  taskId?: string;
  /** Feature name for analytics */
  feature?: string;
}

export interface CostEstimate {
  /** Estimated cost in cents */
  costCents: number;
  /** Estimated input tokens */
  inputTokens: number;
  /** Estimated output tokens */
  outputTokens: number;
}

// ============================================================================
// PRICING CONFIGURATION
// ============================================================================

/**
 * Cost per 1000 tokens in cents for each model.
 * Based on Anthropic pricing as of January 2025.
 *
 * Note: Prompt caching provides 90% discount on cached tokens read,
 * but charges 25% premium for cache write tokens.
 */
export const COST_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
  // Claude 3.5 Haiku - fastest, cheapest
  'claude-3-5-haiku-20241022': { input: 0.1, output: 0.5 },
  'claude-3-5-haiku-latest': { input: 0.1, output: 0.5 },

  // Claude Sonnet 4 - balanced performance
  'claude-sonnet-4-20250514': { input: 0.3, output: 1.5 },
  'claude-sonnet-4-latest': { input: 0.3, output: 1.5 },

  // Claude 3.5 Sonnet (legacy) - included for compatibility
  'claude-3-5-sonnet-20241022': { input: 0.3, output: 1.5 },
  'claude-3-5-sonnet-latest': { input: 0.3, output: 1.5 },

  // Claude Opus 4 - most capable
  'claude-opus-4-20250514': { input: 1.5, output: 7.5 },
  'claude-opus-4-latest': { input: 1.5, output: 7.5 },
} as const;

/**
 * Default model pricing if model not found in pricing table.
 * Uses Sonnet pricing as a reasonable default.
 */
const DEFAULT_PRICING = { input: 0.3, output: 1.5 };

/**
 * Prompt caching modifiers.
 * Cache reads are 90% cheaper, cache writes have 25% premium.
 */
const CACHE_MODIFIERS = {
  /** 90% discount on cached prompt tokens read */
  readDiscount: 0.1,
  /** 25% premium for writing to cache */
  writePremium: 1.25,
};

// ============================================================================
// COST CALCULATION
// ============================================================================

/**
 * Calculate cost in cents for token usage.
 *
 * @param usage - Token usage counts
 * @param model - Model identifier
 * @returns Cost in cents (rounded to nearest cent)
 */
export function calculateCostCents(usage: TokenUsage, model: string): number {
  const pricing = COST_PER_1K_TOKENS[model] ?? DEFAULT_PRICING;

  // Base input/output cost
  let inputCost = (usage.inputTokens / 1000) * pricing.input;
  let outputCost = (usage.outputTokens / 1000) * pricing.output;

  // Adjust for prompt caching if present
  if (usage.cacheReadTokens && usage.cacheReadTokens > 0) {
    // Cache read tokens get 90% discount
    const cacheReadCost = (usage.cacheReadTokens / 1000) * pricing.input * CACHE_MODIFIERS.readDiscount;
    // Subtract from input cost (already counted in inputTokens)
    inputCost = inputCost - ((usage.cacheReadTokens / 1000) * pricing.input) + cacheReadCost;
  }

  if (usage.cacheWriteTokens && usage.cacheWriteTokens > 0) {
    // Cache write tokens have 25% premium
    const cacheWriteCost = (usage.cacheWriteTokens / 1000) * pricing.input * CACHE_MODIFIERS.writePremium;
    // This is additional cost on top of input
    inputCost += cacheWriteCost;
  }

  const totalCost = inputCost + outputCost;

  // Round to nearest cent
  return Math.round(totalCost);
}

/**
 * Estimate cost for a request before execution.
 *
 * @param model - Model to use
 * @param estimatedInputTokens - Estimated input tokens
 * @param estimatedOutputTokens - Estimated output tokens (default 500)
 * @returns Estimated cost in cents
 */
export function estimateCost(
  model: string,
  estimatedInputTokens: number,
  estimatedOutputTokens: number = 500
): CostEstimate {
  const usage: TokenUsage = {
    inputTokens: estimatedInputTokens,
    outputTokens: estimatedOutputTokens,
  };

  return {
    costCents: calculateCostCents(usage, model),
    inputTokens: estimatedInputTokens,
    outputTokens: estimatedOutputTokens,
  };
}

// ============================================================================
// COST TRACKING
// ============================================================================

/**
 * Track cost of an AI operation.
 * Inserts a record into ai_cost_tracking table.
 *
 * @param input - Cost tracking input
 * @returns The created cost record ID
 */
export async function trackCost(input: TrackCostInput): Promise<string> {
  const { usage, model, organizationId, userId, conversationId, taskId, feature } = input;

  const costCents = calculateCostCents(usage, model);
  const today = new Date().toISOString().split('T')[0];

  const [record] = await db
    .insert(aiCostTracking)
    .values({
      organizationId,
      userId: userId ?? null,
      conversationId: conversationId ?? null,
      taskId: taskId ?? null,
      model,
      feature: feature ?? null,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheReadTokens: usage.cacheReadTokens ?? 0,
      cacheWriteTokens: usage.cacheWriteTokens ?? 0,
      costCents,
      date: today,
    })
    .returning({ id: aiCostTracking.id });

  return record.id;
}

/**
 * Track cost from Vercel AI SDK usage object.
 * Convenience wrapper that extracts token counts from the SDK response.
 *
 * @param sdkUsage - Usage object from Vercel AI SDK response
 * @param model - Model identifier
 * @param organizationId - Organization ID
 * @param userId - User ID (optional)
 * @param conversationId - Conversation ID (optional)
 * @param taskId - Task ID (optional)
 * @param feature - Feature name (optional)
 * @returns The created cost record ID
 */
export async function trackCostFromSDK(
  sdkUsage: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  },
  model: string,
  organizationId: string,
  userId?: string,
  conversationId?: string,
  taskId?: string,
  feature?: string
): Promise<string> {
  const usage: TokenUsage = {
    inputTokens: sdkUsage.promptTokens ?? 0,
    outputTokens: sdkUsage.completionTokens ?? 0,
  };

  return trackCost({
    usage,
    model,
    organizationId,
    userId,
    conversationId,
    taskId,
    feature,
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format cost in cents as currency string.
 * @param costCents - Cost in cents
 * @param currency - Currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCost(costCents: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(costCents / 100);
}

/**
 * Get model display name.
 * @param model - Model identifier
 * @returns Human-readable model name
 */
export function getModelDisplayName(model: string): string {
  const names: Record<string, string> = {
    'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku',
    'claude-3-5-haiku-latest': 'Claude 3.5 Haiku',
    'claude-sonnet-4-20250514': 'Claude Sonnet 4',
    'claude-sonnet-4-latest': 'Claude Sonnet 4',
    'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
    'claude-3-5-sonnet-latest': 'Claude 3.5 Sonnet',
    'claude-opus-4-20250514': 'Claude Opus 4',
    'claude-opus-4-latest': 'Claude Opus 4',
  };

  return names[model] ?? model;
}
