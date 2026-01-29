/**
 * AI Tools Types and Utilities
 *
 * Shared types, formatters, and utilities for AI tools.
 * ⚠️ This file is client-safe. Tool implementations that use database
 * are in src/server/functions/ai/tools/
 *
 * @see src/server/functions/ai/tools/ for implementations
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

// ============================================================================
// TYPES (Shared - safe for client)
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
// HANDOFF/TRIAGE TOOLS (Safe for client - no db)
// ============================================================================

export {
  handoffToAgentTool,
  triageTools,
  type HandoffParams,
  type HandoffResult,
  type TriageTools,
} from './handoff';

// ============================================================================
// STREAMING UTILITIES (Safe for client)
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
// FORMATTERS (Safe for client)
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

// ============================================================================
// NOTE: Tool implementations that use database are in:
// src/server/functions/ai/tools/
//
// - customer-tools.ts
// - order-tools.ts
// - analytics-tools.ts
// - quote-tools.ts
//
// Import from there in server code, not from here.
// ============================================================================
