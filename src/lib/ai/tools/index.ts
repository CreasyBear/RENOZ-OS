/**
 * AI Tools Registry
 *
 * Central export point for all AI tools.
 * Tools are organized by domain (handoff, customer, order, analytics, quote).
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

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
