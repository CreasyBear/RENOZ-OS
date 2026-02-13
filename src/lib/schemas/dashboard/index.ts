/**
 * Dashboard Domain Schemas
 *
 * Barrel export for all dashboard-related Zod validation schemas.
 * Targets and scheduled reports are proxied from reports domain.
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

// Tracked Products (user-configurable inventory tracking)
export * from './tracked-products';
