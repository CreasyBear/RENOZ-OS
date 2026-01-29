/**
 * AI Tool Implementations (Server-Only)
 *
 * Tool implementations that use the database.
 * These are server functions and should NOT be imported by client code.
 *
 * @see src/lib/ai/tools/ for types and utilities
 */

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
