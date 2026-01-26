/**
 * AI Infrastructure Module
 *
 * Central export point for all AI functionality.
 * Includes agents, tools, prompts, and utilities.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

// ============================================================================
// AGENTS
// ============================================================================

export {
  // Triage agent
  triageAgent,
  runTriageAgent,
  TRIAGE_CONFIG,
  type TriageAgentOptions,
  type TriageAgentResult,

  // Customer agent
  customerAgent,
  runCustomerAgent,
  CUSTOMER_AGENT_CONFIG,
  type CustomerAgentOptions,

  // Order agent
  orderAgent,
  runOrderAgent,
  ORDER_AGENT_CONFIG,
  type OrderAgentOptions,

  // Analytics agent
  analyticsAgent,
  runAnalyticsAgent,
  ANALYTICS_AGENT_CONFIG,
  type AnalyticsAgentOptions,

  // Quote agent
  quoteAgent,
  runQuoteAgent,
  QUOTE_AGENT_CONFIG,
  type QuoteAgentOptions,

  // Registry
  agentRegistry,
  getAgent,
  SPECIALIST_AGENTS,
  isSpecialistAgent,
  type SpecialistAgentName,
} from './agents';

// ============================================================================
// TOOLS
// ============================================================================

export {
  // Handoff/triage tools
  handoffToAgentTool,
  triageTools,
  type HandoffParams,
  type HandoffResult,
  type TriageTools,

  // Customer tools
  getCustomerTool,
  searchCustomersTool,
  updateCustomerNotesTool,
  customerTools,
  type CustomerTools,

  // Order tools
  getOrdersTool,
  getInvoicesTool,
  createOrderDraftTool,
  createQuoteDraftTool,
  orderTools,
  type OrderTools,

  // Analytics tools
  runReportTool,
  getMetricsTool,
  getTrendsTool,
  analyticsTools,
  type AnalyticsTools,

  // Quote tools
  configureSystemTool,
  calculatePriceTool,
  checkCompatibilityTool,
  quoteTools,
  type QuoteTools,

  // Types
  type ToolResult,
  type ApprovalRequiredResult,
  type ToolErrorResult,
  type AnyToolResult,
  type ToolContext,
  type CustomerWithMeta,
  type CustomerSearchResult,
  type OrderSummary,
  type InvoiceSummary,
  type ReportResult,
  type MetricsResult,
  type TrendsResult,
  type SystemConfiguration,
  type PriceCalculation,
  type CompatibilityResult,
  filterSensitiveFields,
  createApprovalResult,
  createErrorResult,
} from './tools';

// ============================================================================
// PROMPTS & UTILITIES
// ============================================================================

export {
  SECURITY_INSTRUCTIONS,
  COMMON_AGENT_RULES,
  AGENT_NAMES,
  AGENT_DESCRIPTIONS,
  formatContextForLLM,
  type AgentName,
  type UserContext,
} from './prompts/shared';
