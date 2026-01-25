/**
 * Dashboard Domain Schemas
 *
 * Barrel export for all dashboard-related Zod validation schemas.
 * Dashboard is the canonical owner of targets, scheduled-reports, and layouts.
 *
 * @see drizzle/schema/dashboard/
 * @see sprint-plan-db-implementation.md S9-T04
 */

// Dashboard Metrics
export * from './metrics';

// Targets
export * from './targets';

// Scheduled Reports
export * from './scheduled-reports';

// Dashboard Layouts
export * from './layouts';

// Comparison Analysis
export * from './comparison';

// AI Insights
export * from './ai-insights';
