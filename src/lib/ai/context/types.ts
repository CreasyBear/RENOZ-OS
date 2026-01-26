/**
 * AI Context Types
 *
 * Full AppContext interface for AI operations.
 * Implements ARCH-001 from helicopter review.
 *
 * @see patterns/02-app-context.md
 */

// ============================================================================
// METRICS FILTER
// ============================================================================

/**
 * Period options for dashboard filters.
 */
export type PeriodOption =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'custom';

/**
 * Dashboard filter state that provides context for AI queries.
 * When the user has filters active on the dashboard, these values
 * inform the AI about the current view context.
 */
export interface MetricsFilter {
  /** Time period for date-based queries */
  period: PeriodOption;
  /** Custom start date (only when period is 'custom') */
  startDate?: string;
  /** Custom end date (only when period is 'custom') */
  endDate?: string;
  /** Filter by specific customer */
  customerId?: string;
  /** Filter by status values */
  status?: string[];
  /** Filter by specific job/project */
  jobId?: string;
  /** Filter by product category */
  category?: string;
}

// ============================================================================
// FORCED TOOL CALL
// ============================================================================

/**
 * Forced tool call for widget click interactions.
 * When a user clicks a dashboard widget, this forces the AI
 * to call a specific tool with specific parameters.
 */
export interface ForcedToolCall {
  /** The tool to force the AI to call */
  toolName: string;
  /** Pre-filled parameters for the tool */
  toolParams: Record<string, unknown>;
  /** Whether to show a canvas/artifact visualization */
  showCanvas?: boolean;
}

// ============================================================================
// USER CONTEXT
// ============================================================================

/**
 * Information about the current user.
 */
export interface UserInfo {
  /** User ID */
  id: string;
  /** User's display name */
  name?: string;
  /** User's email (filtered from AI responses, but available for context) */
  email?: string;
  /** User's role in the organization */
  role: string;
  /** User's permissions */
  permissions?: string[];
}

/**
 * Information about the current organization.
 */
export interface OrganizationInfo {
  /** Organization ID */
  id: string;
  /** Organization name */
  name?: string;
  /** Organization timezone (e.g., 'America/Los_Angeles') */
  timezone?: string;
  /** Organization locale (e.g., 'en-US') */
  locale?: string;
  /** Base currency code (e.g., 'USD', 'NZD') */
  baseCurrency?: string;
}

// ============================================================================
// DASHBOARD CONTEXT
// ============================================================================

/**
 * Current dashboard state for context-aware AI responses.
 */
export interface DashboardContext {
  /** Current metrics filter (date range, customer, etc.) */
  metricsFilter?: MetricsFilter;
  /** Current page/view the user is on */
  activePage?: string;
  /** Currently selected entities (for bulk operations) */
  selectedEntities?: string[];
  /** Active tab within the current page */
  activeTab?: string;
}

// ============================================================================
// APP CONTEXT
// ============================================================================

/**
 * Full application context for AI operations.
 *
 * This provides the AI with all necessary context to:
 * - Understand the user's current situation
 * - Apply correct filters and scoping
 * - Format responses appropriately
 * - Handle widget clicks with forced tool calls
 *
 * @example
 * ```typescript
 * const context: AppContext = {
 *   user: { id: 'user-123', name: 'John', role: 'admin' },
 *   organization: { id: 'org-456', timezone: 'Pacific/Auckland', baseCurrency: 'NZD' },
 *   dashboard: {
 *     metricsFilter: { period: 'this_month' },
 *     activePage: '/orders',
 *   },
 *   forcedToolCall: {
 *     toolName: 'get_orders',
 *     toolParams: { status: 'pending' },
 *     showCanvas: true,
 *   },
 * };
 * ```
 */
export interface AppContext {
  /** Current user information */
  user: UserInfo;
  /** Current organization information */
  organization: OrganizationInfo;
  /** Dashboard state (optional, may not be present for direct API calls) */
  dashboard?: DashboardContext;
  /** Forced tool call from widget click (optional) */
  forcedToolCall?: ForcedToolCall;
  /** Current conversation ID (if in chat context) */
  conversationId?: string;
}

// ============================================================================
// TOOL CONTEXT
// ============================================================================

/**
 * Context passed to tool execution.
 * This is a simplified version of AppContext focused on tool needs.
 */
export interface ToolExecutionContext {
  /** User ID for scoping */
  userId: string;
  /** Organization ID for multi-tenant scoping */
  organizationId: string;
  /** Conversation ID if in chat context */
  conversationId?: string;
  /** Organization timezone for date formatting */
  timezone?: string;
  /** Base currency for monetary formatting */
  baseCurrency?: string;
  /** Dashboard filter state for parameter resolution */
  metricsFilter?: MetricsFilter;
  /** Forced tool parameters (highest priority) */
  forcedToolParams?: Record<string, unknown>;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if a value is a valid PeriodOption.
 */
export function isPeriodOption(value: unknown): value is PeriodOption {
  const validPeriods: PeriodOption[] = [
    'today',
    'yesterday',
    'this_week',
    'last_week',
    'this_month',
    'last_month',
    'this_quarter',
    'last_quarter',
    'this_year',
    'last_year',
    'last_7_days',
    'last_30_days',
    'last_90_days',
    'custom',
  ];
  return typeof value === 'string' && validPeriods.includes(value as PeriodOption);
}

/**
 * Check if a value is a valid MetricsFilter.
 */
export function isMetricsFilter(value: unknown): value is MetricsFilter {
  if (typeof value !== 'object' || value === null) return false;
  const filter = value as Record<string, unknown>;
  return isPeriodOption(filter.period);
}
