/**
 * Materialized View Schemas
 *
 * Schema definitions for dashboard analytics materialized views.
 * These MVs are created by migrations and refreshed by Trigger.dev jobs.
 * Uses .existing() so drizzle-kit does not attempt to create them.
 *
 * Column names match actual DB schema per schema-snapshot-matviews.json.
 * @see _development/_audit/DB Migration Audit/02-schema-snapshot/schema-snapshot-matviews.json
 * @see src/server/functions/dashboard/dashboard-metrics.ts
 * @see src/trigger/jobs/cache-warming.ts
 */

import {
  pgMaterializedView,
  uuid,
  date,
  integer,
  numeric,
  text,
} from "drizzle-orm/pg-core";

/** mv_daily_metrics: orders_agg + opps + issues + customers by day */
export const mvDailyMetrics = pgMaterializedView(
  "mv_daily_metrics",
  {
    organizationId: uuid("organization_id").notNull(),
    day: date("day").notNull(),
    ordersCount: integer("orders_count"),
    ordersTotal: numeric("orders_total", { precision: 14, scale: 2 }),
    taxTotal: numeric("tax_total", { precision: 14, scale: 2 }),
    opportunitiesCount: integer("opportunities_count"),
    opportunitiesValue: numeric("opportunities_value", { precision: 14, scale: 2 }),
    opportunitiesWeighted: numeric("opportunities_weighted", { precision: 14, scale: 2 }),
    issuesCount: integer("issues_count"),
    customersCount: integer("customers_count"),
  }
).existing();

/** mv_daily_pipeline: opportunities by organization, day, stage */
export const mvDailyPipeline = pgMaterializedView(
  "mv_daily_pipeline",
  {
    organizationId: uuid("organization_id").notNull(),
    day: date("day").notNull(),
    stage: text("stage"),
    opportunitiesCount: integer("opportunities_count"),
    totalValue: numeric("total_value", { precision: 14, scale: 2 }),
    weightedValue: numeric("weighted_value", { precision: 14, scale: 2 }),
  }
).existing();

/** mv_daily_jobs: job_assignments by organization, scheduled_date */
export const mvDailyJobs = pgMaterializedView(
  "mv_daily_jobs",
  {
    organizationId: uuid("organization_id").notNull(),
    day: date("day").notNull(),
    totalJobs: integer("total_jobs"),
    completedJobs: integer("completed_jobs"),
    cancelledJobs: integer("cancelled_jobs"),
    inProgressJobs: integer("in_progress_jobs"),
    onHoldJobs: integer("on_hold_jobs"),
  }
).existing();

/** mv_daily_warranty: warranty_claims by organization, submitted_at date */
export const mvDailyWarranty = pgMaterializedView(
  "mv_daily_warranty",
  {
    organizationId: uuid("organization_id").notNull(),
    day: date("day").notNull(),
    totalClaims: integer("total_claims"),
    submittedClaims: integer("submitted_claims"),
    underReviewClaims: integer("under_review_claims"),
    approvedClaims: integer("approved_claims"),
    deniedClaims: integer("denied_claims"),
    resolvedClaims: integer("resolved_claims"),
  }
).existing();

/** mv_current_state: current snapshot - open orders, opps, jobs, issues, claims */
export const mvCurrentState = pgMaterializedView(
  "mv_current_state",
  {
    organizationId: uuid("organization_id").notNull(),
    asOfDate: date("as_of_date"),
    openOrders: integer("open_orders"),
    openOpportunities: integer("open_opportunities"),
    openJobs: integer("open_jobs"),
    openIssues: integer("open_issues"),
    openWarrantyClaims: integer("open_warranty_claims"),
  }
).existing();
