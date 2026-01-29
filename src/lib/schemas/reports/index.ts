/**
 * Reports Domain Schemas
 *
 * Barrel export for all reports-related Zod validation schemas.
 * Canonical home for reports, scheduled reports, and targets.
 *
 * @see src/lib/schemas/dashboard/ for dashboard-specific schemas
 */

// Custom Reports
export * from './custom-reports';

// Report Favorites
export * from './report-favorites';

// Scheduled Reports
export * from './scheduled-reports';

// Targets
export * from './targets';
