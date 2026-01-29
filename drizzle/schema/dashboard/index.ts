/**
 * Dashboard Schema Barrel Export
 *
 * All dashboard-related tables and types.
 * Canonical owner of: dashboardLayouts
 * Proxy exports for: targets, scheduledReports (canonical in reports)
 *
 * @see design-patterns.md Section 1 - Drizzle Schema Patterns
 * @see sprint-plan S9-T04 for ownership assignment
 */

export * from "./targets";
export * from "./scheduled-reports";
export * from "./dashboard-layouts";
