/**
 * Metrics Server Functions
 *
 * Server functions for metric calculations.
 * Uses metric registry for consistent calculations across all report types.
 *
 * ⚠️ SERVER-ONLY: Uses database queries via Drizzle ORM.
 */

// ============================================================================
// METRIC CALCULATIONS
// ============================================================================

export { calculateMetric, calculateMetrics } from './aggregator';
export type { CalculateMetricOptions, MetricResult } from './aggregator';
