/**
 * Dashboard Comparison Components
 *
 * Components for period-over-period comparison functionality.
 */
export { ComparisonToggle } from './comparison-toggle';
export type { ComparisonToggleProps } from './comparison-toggle';

export {
  ChangeIndicator,
  TrendIndicator as ComparisonTrendIndicator,
  SignificanceIndicator,
  MetricComparisonIndicator,
} from './comparison-indicators';
export type {
  ChangeIndicatorProps,
  TrendIndicatorProps as ComparisonTrendIndicatorProps,
  SignificanceIndicatorProps,
  MetricComparisonIndicatorProps,
} from './comparison-indicators';

export { ComparisonChart, toChartDataPoints } from './comparison-chart';
export type { ComparisonChartProps, ComparisonDataPoint } from './comparison-chart';
