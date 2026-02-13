/**
 * Forecast Chart Schemas
 *
 * Shared types for pipeline forecast chart components.
 */

import type { ForecastPeriod } from '@/lib/schemas/pipeline';

// ============================================================================
// PROPS
// ============================================================================

export interface ForecastChartProps {
  data: ForecastPeriod[];
  showWeighted?: boolean;
  showWonLost?: boolean;
  title?: string;
  height?: number;
  className?: string;
}
