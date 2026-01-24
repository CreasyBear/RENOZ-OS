/**
 * Reports Domain Schemas
 *
 * Barrel export for all reports-related Zod validation schemas.
 * Note: targets, scheduledReports, and dashboardLayouts moved to dashboard/ domain.
 *
 * @see src/lib/schemas/dashboard/ for dashboard-specific schemas
 */

// Custom Reports
export * from './custom-reports';

// Report Favorites
export * from './report-favorites';
