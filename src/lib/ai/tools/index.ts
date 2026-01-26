/**
 * AI Tools Registry
 *
 * Central export point for all AI tools.
 * Tools are organized by domain (handoff, customer, order, analytics, quote).
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { triageTools } from './handoff';
import { customerTools } from './customer-tools';
import { orderTools } from './order-tools';
import { analyticsTools } from './analytics-tools';
import { quoteTools } from './quote-tools';

// ============================================================================
// TOOL REGISTRY
// ============================================================================

/**
 * Tool registry mapping agent names to their available tools.
 */
const toolRegistry = {
  triage: triageTools,
  customer: customerTools,
  order: orderTools,
  analytics: analyticsTools,
  quote: quoteTools,
} as const;

export type AgentWithTools = keyof typeof toolRegistry;

/**
 * Get tools for a specific agent by name.
 * Returns empty object if agent not found.
 */
export function getToolsForAgent(agentName: string): Record<string, unknown> {
  return toolRegistry[agentName as AgentWithTools] ?? {};
}

/**
 * Check if an agent has a specific tool.
 */
export function agentHasTool(agentName: string, toolName: string): boolean {
  const tools = getToolsForAgent(agentName);
  return toolName in tools;
}

/**
 * Get all tool names for an agent.
 */
export function getToolNamesForAgent(agentName: string): string[] {
  const tools = getToolsForAgent(agentName);
  return Object.keys(tools);
}

/**
 * Get all agents that have a specific tool.
 */
export function getAgentsWithTool(toolName: string): string[] {
  return Object.entries(toolRegistry)
    .filter(([_, tools]) => toolName in tools)
    .map(([agent]) => agent);
}

// ============================================================================
// HANDOFF TOOLS (Triage Agent)
// ============================================================================

export {
  handoffToAgentTool,
  triageTools,
  type HandoffParams,
  type HandoffResult,
  type TriageTools,
} from './handoff';

// ============================================================================
// CUSTOMER TOOLS
// ============================================================================

export {
  getCustomerTool,
  searchCustomersTool,
  updateCustomerNotesTool,
  customerTools,
  type CustomerTools,
} from './customer-tools';

// ============================================================================
// ORDER TOOLS
// ============================================================================

export {
  getOrdersTool,
  getInvoicesTool,
  createOrderDraftTool,
  createQuoteDraftTool,
  orderTools,
  type OrderTools,
} from './order-tools';

// ============================================================================
// ANALYTICS TOOLS
// ============================================================================

export {
  runReportTool,
  getMetricsTool,
  getTrendsTool,
  analyticsTools,
  type AnalyticsTools,
} from './analytics-tools';

// ============================================================================
// QUOTE TOOLS
// ============================================================================

export {
  configureSystemTool,
  calculatePriceTool,
  checkCompatibilityTool,
  quoteTools,
  type QuoteTools,
} from './quote-tools';

// ============================================================================
// TYPES
// ============================================================================

export {
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
} from './types';

// ============================================================================
// STREAMING UTILITIES
// ============================================================================

export {
  createLoadingState,
  createProgressState,
  createCompleteState,
  createErrorState,
  collectStreamingResults,
  getFinalResult,
  type ToolStreamStatus,
  type StreamingToolResult,
  type StreamingToolExecute,
} from './streaming';

// ============================================================================
// FORMATTERS
// ============================================================================

export {
  formatAsTable,
  formatCurrency,
  formatDate,
  truncateId,
  formatPercent,
  formatStatus,
  formatDaysOverdue,
  formatNumber,
  formatResultSummary,
  type TableColumn,
} from './formatters';
