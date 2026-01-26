/**
 * Reports Hooks Barrel Export
 *
 * Centralized hooks for reports domain:
 * - Win/Loss Analysis (analysis, competitors)
 *
 * Pipeline forecast, velocity, and revenue attribution hooks
 * are available from @/hooks/pipeline as they are closely tied
 * to the pipeline domain.
 *
 * @example
 * ```tsx
 * import {
 *   useWinLossAnalysis,
 *   useCompetitors,
 * } from '@/hooks/reports';
 *
 * // For pipeline reports, use:
 * import {
 *   usePipelineForecast,
 *   usePipelineVelocity,
 *   useRevenueAttribution,
 * } from '@/hooks/pipeline';
 * ```
 */

// ============================================================================
// WIN/LOSS HOOKS
// ============================================================================
export {
  useWinLossAnalysis,
  useCompetitors,
  type UseWinLossAnalysisOptions,
  type UseCompetitorsOptions,
  type WinLossAnalysisResult,
  type CompetitorsResult,
  type WinAnalysisItem,
  type LossAnalysisItem,
  type TrendItem,
  type Competitor,
} from './use-win-loss';
