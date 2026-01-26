/**
 * AI Tool Types
 *
 * Shared type definitions for AI tool results.
 * Implements draft-approve pattern for mutations.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

// ============================================================================
// TOOL RESULT TYPES
// ============================================================================

/**
 * Standard tool result for data retrieval.
 */
export interface ToolResult<T = unknown> {
  /** The retrieved data */
  data: T;
  /** Additional metadata about the result */
  _meta?: {
    /** Number of items returned (for lists) */
    count?: number;
    /** Whether there are more items */
    hasMore?: boolean;
    /** Cursor for pagination */
    nextCursor?: string;
    /** Custom metadata */
    [key: string]: unknown;
  };
}

/**
 * Result indicating human approval is required.
 * Used for mutations (create, update, delete).
 */
export interface ApprovalRequiredResult {
  /** Type discriminator */
  type: 'approval_required';
  /** The action being requested */
  action: string;
  /** Draft data to be applied on approval */
  draft: Record<string, unknown>;
  /** Approval ID for tracking */
  approvalId: string;
  /** Human-readable summary of what will happen */
  summary: string;
  /** Optional diff showing changes */
  diff?: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };
}

/**
 * Result indicating an error occurred.
 */
export interface ToolErrorResult {
  /** Error message */
  error: string;
  /** Error code for programmatic handling */
  code?: string;
  /** Actionable suggestion to resolve the error */
  suggestion?: string;
}

/**
 * Union type for all tool results.
 */
export type AnyToolResult<T = unknown> =
  | ToolResult<T>
  | ApprovalRequiredResult
  | ToolErrorResult;

// ============================================================================
// CUSTOMER TOOL TYPES
// ============================================================================

/**
 * Extended customer data with AI-generated metadata.
 * Note: email and phone are intentionally omitted - they are filtered
 * by filterSensitiveFields() to prevent PII exposure to AI.
 */
export interface CustomerWithMeta {
  /** Customer record (PII filtered) */
  customer: {
    id: string;
    name: string;
    // email and phone are filtered out for AI safety
    status: string;
    type: string;
    healthScore: number | null;
    totalRevenue: number | null;
    createdAt: Date;
  };
  /** AI-computed metadata */
  _meta: {
    /** Whether customer has overdue invoices */
    hasOverdueInvoices: boolean;
    /** Days since last contact/activity */
    daysSinceLastContact: number | null;
    /** Churn risk assessment */
    churnRisk: 'low' | 'medium' | 'high' | null;
    /** Suggested next actions */
    suggestedActions: string[];
  };
}

/**
 * Customer search result.
 * Note: email and phone are intentionally omitted - they are filtered
 * by filterSensitiveFields() to prevent PII exposure to AI.
 */
export interface CustomerSearchResult {
  id: string;
  name: string;
  // email and phone are filtered out for AI safety
  status: string;
  type: string;
  /** Similarity score from pg_trgm (0-1) */
  similarity: number;
}

// ============================================================================
// ORDER TOOL TYPES
// ============================================================================

/**
 * Order summary for listing.
 */
export interface OrderSummary {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  paymentStatus: string;
  total: number | null;
  orderDate: string | null;
  dueDate: string | null;
}

/**
 * Invoice/billing summary.
 */
export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  customerName: string;
  status: string;
  total: number | null;
  paidAmount: number | null;
  balanceDue: number | null;
  dueDate: string | null;
  daysOverdue: number;
}

// ============================================================================
// ANALYTICS TOOL TYPES
// ============================================================================

/**
 * Report result structure.
 */
export interface ReportResult {
  /** Report name/title */
  name: string;
  /** Time period */
  period: {
    start: string;
    end: string;
    label: string;
  };
  /** Report data */
  data: Record<string, unknown>[];
  /** Summary metrics */
  summary?: Record<string, number | string>;
}

/**
 * Metrics result structure.
 */
export interface MetricsResult {
  /** Current period value */
  value: number;
  /** Previous period value for comparison */
  previousValue?: number;
  /** Percentage change */
  change?: number;
  /** Direction of change */
  trend?: 'up' | 'down' | 'flat';
  /** Formatted display value */
  formatted: string;
}

/**
 * Trends result structure.
 */
export interface TrendsResult {
  /** Data points over time */
  dataPoints: Array<{
    date: string;
    value: number;
  }>;
  /** Trend direction */
  direction: 'increasing' | 'decreasing' | 'stable';
  /** Average value */
  average: number;
  /** Min/max range */
  range: {
    min: number;
    max: number;
  };
}

// ============================================================================
// QUOTE TOOL TYPES
// ============================================================================

/**
 * System configuration result.
 */
export interface SystemConfiguration {
  /** Components in the configured system */
  components: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    category: string;
  }>;
  /** Validation results */
  validation: {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  };
  /** System capacity/sizing info */
  sizing?: {
    totalCapacity: number;
    unit: string;
    recommendation: string;
  };
}

/**
 * Price calculation result.
 */
export interface PriceCalculation {
  /** Line item totals */
  lineItems: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    total: number;
  }>;
  /** Summary totals */
  subtotal: number;
  discountTotal: number;
  taxAmount: number;
  total: number;
  /** Margin analysis */
  margin?: {
    amount: number;
    percentage: number;
  };
}

/**
 * Compatibility check result.
 */
export interface CompatibilityResult {
  /** Overall compatibility status */
  compatible: boolean;
  /** Compatibility details by component pair */
  checks: Array<{
    component1: string;
    component2: string;
    compatible: boolean;
    reason?: string;
  }>;
  /** Suggestions for resolving incompatibilities */
  suggestions: string[];
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

/**
 * Tool execution context passed to all tools.
 */
export interface ToolContext {
  /** Current user ID */
  userId: string;
  /** Current organization ID */
  organizationId: string;
  /** Current conversation ID (if in chat context) */
  conversationId?: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Filter sensitive fields from an object before returning to AI.
 * Removes fields like SSN, tax ID, bank account numbers.
 */
export function filterSensitiveFields<T extends Record<string, unknown>>(
  data: T,
  sensitiveKeys: string[] = [
    // PII that should not be returned to AI
    'email',
    'phone',
    'mobilePhone',
    'mobile_phone',
    'homePhone',
    'home_phone',
    'workPhone',
    'work_phone',
    // Financial identifiers
    'ssn',
    'taxId',
    'tax_id',
    'bankAccount',
    'bank_account',
    'bankRoutingNumber',
    'bank_routing_number',
    'creditCard',
    'credit_card',
    // Secrets
    'password',
    'passwordHash',
    'password_hash',
    'apiKey',
    'api_key',
    'secretKey',
    'secret_key',
  ]
): T {
  // Use Record<string, unknown> for mutable operations, cast back to T at the end
  const filtered: Record<string, unknown> = { ...data };

  for (const key of sensitiveKeys) {
    if (key in filtered) {
      delete filtered[key];
    }
  }

  // Recursively filter nested objects
  for (const [key, value] of Object.entries(filtered)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      filtered[key] = filterSensitiveFields(
        value as Record<string, unknown>,
        sensitiveKeys
      );
    }
    if (Array.isArray(value)) {
      filtered[key] = value.map((item) =>
        item && typeof item === 'object'
          ? filterSensitiveFields(item as Record<string, unknown>, sensitiveKeys)
          : item
      );
    }
  }

  return filtered as T;
}

/**
 * Create an approval-required result.
 */
export function createApprovalResult(
  action: string,
  draft: Record<string, unknown>,
  approvalId: string,
  summary: string,
  diff?: { before: Record<string, unknown>; after: Record<string, unknown> }
): ApprovalRequiredResult {
  return {
    type: 'approval_required',
    action,
    draft,
    approvalId,
    summary,
    ...(diff && { diff }),
  };
}

/**
 * Create a tool error result.
 */
export function createErrorResult(
  error: string,
  suggestion?: string,
  code?: string
): ToolErrorResult {
  return {
    error,
    ...(suggestion && { suggestion }),
    ...(code && { code }),
  };
}
