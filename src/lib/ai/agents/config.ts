/**
 * Shared Agent Configuration
 *
 * Central configuration for all AI agents.
 * Extracts common patterns to reduce duplication and ensure consistency.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

// ============================================================================
// MODEL IDENTIFIERS
// ============================================================================

/**
 * Claude model identifiers.
 * Using constants prevents typos and enables easy model updates.
 */
export const MODELS = {
  /** Claude Sonnet 4 - High quality, balanced speed/cost */
  SONNET_4: 'claude-sonnet-4-20250514',
  /** Claude Haiku 3.5 - Fast, low cost, good for routing/triage */
  HAIKU_3_5: 'claude-3-5-haiku-20241022',
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];

// ============================================================================
// AGENT CONFIGURATION TYPES
// ============================================================================

/**
 * Base agent configuration options.
 */
export interface AgentConfigOptions {
  /** Claude model to use */
  model: ModelId;
  /** Temperature (0-1): lower = more focused, higher = more creative */
  temperature: number;
  /** Maximum conversation turns before terminating */
  maxTurns: number;
  /** Maximum tokens per response */
  maxTokens: number;
}

/**
 * Agent configuration with defaults.
 */
export type AgentConfig = Readonly<AgentConfigOptions>;

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

/**
 * Default configuration for specialist agents (customer, order, analytics, quote).
 * These agents handle domain-specific tasks and need balanced quality/speed.
 */
export const SPECIALIST_DEFAULTS: AgentConfig = {
  model: MODELS.SONNET_4,
  temperature: 0.3,
  maxTurns: 10,
  maxTokens: 2048,
} as const;

/**
 * Default configuration for the triage agent.
 * Triage needs to be fast and decisive, so uses Haiku with low temperature.
 */
export const TRIAGE_DEFAULTS: AgentConfig = {
  model: MODELS.HAIKU_3_5,
  temperature: 0.1,
  maxTurns: 1,
  maxTokens: 256,
} as const;

// ============================================================================
// CONFIG FACTORY
// ============================================================================

/**
 * Create an agent configuration with defaults.
 *
 * @param overrides - Optional configuration overrides
 * @param base - Base defaults to use (specialist or triage)
 * @returns Complete agent configuration
 *
 * @example
 * // Use specialist defaults
 * const config = createAgentConfig();
 *
 * // Override specific values
 * const config = createAgentConfig({ maxTokens: 4096 });
 *
 * // Use triage defaults
 * const config = createAgentConfig({}, TRIAGE_DEFAULTS);
 */
export function createAgentConfig(
  overrides: Partial<AgentConfigOptions> = {},
  base: AgentConfig = SPECIALIST_DEFAULTS
): AgentConfig {
  return {
    ...base,
    ...overrides,
  } as const;
}

// ============================================================================
// NAMED AGENT CONFIGS (DEPRECATED - USE createAgentConfig)
// ============================================================================

/**
 * @deprecated Use createAgentConfig() instead.
 * Kept for backwards compatibility during migration.
 */
export const CUSTOMER_CONFIG = createAgentConfig();
export const ORDER_CONFIG = createAgentConfig();
export const ANALYTICS_CONFIG = createAgentConfig();
export const QUOTE_CONFIG = createAgentConfig();
export const TRIAGE_CONFIG_DEFAULTS = createAgentConfig({}, TRIAGE_DEFAULTS);
