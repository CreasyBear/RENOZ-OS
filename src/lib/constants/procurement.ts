/**
 * Procurement Domain Constants
 *
 * Centralized constants for the Procurement domain.
 * Follows DRY principle - single source of truth for domain-specific values.
 *
 * @see STANDARDS.md - Constants organization
 */

// ============================================================================
// CURRENCY & FINANCIAL
// ============================================================================

/**
 * Default currency code (ISO 4217).
 * Used as fallback when currency is not available from data.
 * Should ideally come from organization settings.
 */
export const DEFAULT_CURRENCY = 'AUD' as const;

// ============================================================================
// RATING & PERFORMANCE
// ============================================================================

/**
 * Rating scale conversion factor.
 * Server returns 0-100 scale, UI displays 0-5 scale.
 * Conversion: UI rating = server rating / RATING_SCALE_FACTOR
 */
export const RATING_SCALE_FACTOR = 20 as const;

/**
 * Maximum rating value (server scale).
 */
export const MAX_RATING_SERVER = 100 as const;

/**
 * Maximum rating value (UI scale).
 */
export const MAX_RATING_UI = 5 as const;

// ============================================================================
// APPROVAL THRESHOLDS
// ============================================================================

/**
 * High priority approval threshold (in cents).
 * Approvals above this amount are marked as high priority.
 */
export const HIGH_PRIORITY_APPROVAL_THRESHOLD = 10000 as const;

// ============================================================================
// FALLBACK VALUES
// ============================================================================

/**
 * Fallback supplier name when supplier data is unavailable.
 */
export const FALLBACK_SUPPLIER_NAME = 'Unknown Supplier' as const;

/**
 * Fallback text for unavailable data.
 */
export const FALLBACK_UNAVAILABLE = 'Unavailable' as const;

// ============================================================================
// BUDGET TRACKING
// ============================================================================

/**
 * Default budget total when budget tracking is not implemented.
 * TODO: Remove when budget tracking feature is implemented.
 * @see PROCUREMENT-BUDGET-TRACKING feature flag
 */
export const DEFAULT_BUDGET_TOTAL = 0 as const;
