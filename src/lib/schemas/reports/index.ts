/**
 * Reports Domain Schemas
 *
 * Barrel export for all reports-related Zod validation schemas.
 * Canonical home for reports, scheduled reports, and targets.
 *
 * @see src/lib/schemas/dashboard/ for dashboard-specific schemas
 */

// ============================================================================
// CUSTOM REPORTS
// ============================================================================
export * from './custom-reports';

// ============================================================================
// REPORT FAVORITES
// ============================================================================
export * from './report-favorites';

// ============================================================================
// SCHEDULED REPORTS
// ============================================================================
export * from './scheduled-reports';

// ============================================================================
// TARGETS
// ============================================================================
export * from './targets';
