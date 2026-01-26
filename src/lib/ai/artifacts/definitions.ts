/**
 * Artifact Definitions
 *
 * Typed artifact schemas for CRM visualizations using Zod.
 * Each artifact defines a structured data shape for streaming.
 *
 * @see https://github.com/midday-ai/ai-sdk-tools/tree/main/packages/artifacts
 */

import { artifact } from '@ai-sdk-tools/artifacts';
import { z } from 'zod';

// ============================================================================
// STAGE ENUM
// ============================================================================

/**
 * Common stages for artifact lifecycle.
 */
export const artifactStages = ['loading', 'processing', 'chart_ready', 'complete'] as const;
export type ArtifactStage = (typeof artifactStages)[number];

// ============================================================================
// REVENUE CHART ARTIFACT
// ============================================================================

/**
 * Revenue chart artifact for analytics visualizations.
 * Shows revenue trends over time with comparison data.
 */
export const revenueChartArtifact = artifact(
  'revenue-chart',
  z.object({
    title: z.string().describe('Chart title'),
    stage: z.enum(artifactStages).default('loading'),
    period: z
      .object({
        start: z.string().describe('Period start date (ISO)'),
        end: z.string().describe('Period end date (ISO)'),
        label: z.string().describe('Human-readable period label'),
      })
      .optional(),
    data: z
      .array(
        z.object({
          date: z.string().describe('Data point date'),
          value: z.number().describe('Revenue value'),
          previousValue: z.number().optional().describe('Previous period value for comparison'),
        })
      )
      .default([]),
    summary: z
      .object({
        total: z.number().describe('Total revenue'),
        average: z.number().describe('Average daily revenue'),
        change: z.number().describe('Percentage change from previous period'),
        trend: z.enum(['up', 'down', 'flat']).describe('Overall trend direction'),
      })
      .optional(),
  })
);

// ============================================================================
// ORDERS BY STATUS ARTIFACT
// ============================================================================

/**
 * Orders by status artifact for pipeline visualization.
 * Shows order distribution across different statuses.
 */
export const ordersPipelineArtifact = artifact(
  'orders-pipeline',
  z.object({
    title: z.string().describe('Chart title'),
    stage: z.enum(artifactStages).default('loading'),
    period: z
      .object({
        start: z.string(),
        end: z.string(),
        label: z.string(),
      })
      .optional(),
    data: z
      .array(
        z.object({
          status: z.string().describe('Order status'),
          count: z.number().describe('Number of orders'),
          value: z.number().describe('Total value'),
          color: z.string().optional().describe('Chart color for this status'),
        })
      )
      .default([]),
    summary: z
      .object({
        totalOrders: z.number(),
        totalValue: z.number(),
        averageValue: z.number(),
      })
      .optional(),
  })
);

// ============================================================================
// CUSTOMER SUMMARY ARTIFACT
// ============================================================================

/**
 * Customer summary artifact for customer insights.
 * Provides a rich view of customer data with health score.
 */
export const customerSummaryArtifact = artifact(
  'customer-summary',
  z.object({
    title: z.string().describe('Customer name'),
    stage: z.enum(artifactStages).default('loading'),
    customer: z
      .object({
        id: z.string(),
        name: z.string(),
        email: z.string().optional(),
        phone: z.string().optional(),
        type: z.enum(['individual', 'business', 'government', 'non_profit']).optional(),
        healthScore: z.number().min(0).max(100).optional(),
        healthStatus: z.enum(['healthy', 'at_risk', 'critical']).optional(),
        createdAt: z.string().optional(),
      })
      .optional(),
    stats: z
      .object({
        totalOrders: z.number(),
        totalRevenue: z.number(),
        averageOrderValue: z.number(),
        lastOrderDate: z.string().optional(),
      })
      .optional(),
    recentOrders: z
      .array(
        z.object({
          id: z.string(),
          orderNumber: z.string(),
          date: z.string(),
          status: z.string(),
          total: z.number(),
        })
      )
      .default([]),
  })
);

// ============================================================================
// METRICS CARD ARTIFACT
// ============================================================================

/**
 * Metrics card artifact for KPI display.
 * Shows a single metric with trend indicator.
 */
export const metricsCardArtifact = artifact(
  'metrics-card',
  z.object({
    title: z.string().describe('Metric name'),
    stage: z.enum(artifactStages).default('loading'),
    metric: z
      .object({
        value: z.number(),
        formatted: z.string().describe('Formatted display value'),
        previousValue: z.number().optional(),
        change: z.number().optional().describe('Percentage change'),
        trend: z.enum(['up', 'down', 'flat']).optional(),
        period: z.string().optional(),
      })
      .optional(),
  })
);

// ============================================================================
// TOP CUSTOMERS ARTIFACT
// ============================================================================

/**
 * Top customers artifact for leaderboard display.
 * Shows ranked list of customers by revenue.
 */
export const topCustomersArtifact = artifact(
  'top-customers',
  z.object({
    title: z.string().describe('Report title'),
    stage: z.enum(artifactStages).default('loading'),
    period: z
      .object({
        start: z.string(),
        end: z.string(),
        label: z.string(),
      })
      .optional(),
    data: z
      .array(
        z.object({
          rank: z.number(),
          customerId: z.string(),
          customerName: z.string(),
          orderCount: z.number(),
          totalRevenue: z.number(),
          percentage: z.number().describe('Percentage of total revenue'),
        })
      )
      .default([]),
    summary: z
      .object({
        totalRevenue: z.number(),
        customerCount: z.number(),
      })
      .optional(),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type RevenueChartData = z.infer<typeof revenueChartArtifact.schema>;
export type OrdersPipelineData = z.infer<typeof ordersPipelineArtifact.schema>;
export type CustomerSummaryData = z.infer<typeof customerSummaryArtifact.schema>;
export type MetricsCardData = z.infer<typeof metricsCardArtifact.schema>;
export type TopCustomersData = z.infer<typeof topCustomersArtifact.schema>;

/**
 * All artifact types for switch-case rendering.
 */
export const ARTIFACT_TYPES = [
  'revenue-chart',
  'orders-pipeline',
  'customer-summary',
  'metrics-card',
  'top-customers',
] as const;

export type ArtifactType = (typeof ARTIFACT_TYPES)[number];
