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

// ============================================================================
// SCHEDULED REPORTS HOOKS
// ============================================================================
export {
  useScheduledReports,
  useScheduledReport,
  useScheduledReportStatus,
  useCreateScheduledReport,
  useUpdateScheduledReport,
  useDeleteScheduledReport,
  useExecuteScheduledReport,
  useBulkUpdateScheduledReports,
  useBulkDeleteScheduledReports,
  useGenerateReport,
  type UseScheduledReportsOptions,
  type UseScheduledReportOptions,
  type ListScheduledReportsInput,
  type CreateScheduledReportInput,
  type UpdateScheduledReportInput,
  type BulkUpdateScheduledReportsInput,
  type BulkDeleteScheduledReportsInput,
  type GenerateReportInput,
} from './use-scheduled-reports';

// ============================================================================
// TARGETS HOOKS
// ============================================================================
export {
  useTargets,
  useTarget,
  useTargetProgress,
  useCreateTarget,
  useUpdateTarget,
  useDeleteTarget,
  useBulkCreateTargets,
  useBulkUpdateTargets,
  useBulkDeleteTargets,
  type UseTargetsOptions,
  type UseTargetOptions,
  type UseTargetProgressOptions,
  type ListTargetsInput,
  type CreateTargetInput,
  type UpdateTargetInput,
  type GetTargetProgressInput,
  type BulkCreateTargetsInput,
  type BulkUpdateTargetsInput,
  type BulkDeleteTargetsInput,
} from './use-targets';

// ============================================================================
// CUSTOM REPORTS HOOKS
// ============================================================================
export {
  useCustomReports,
  useCustomReport,
  useCreateCustomReport,
  useUpdateCustomReport,
  useDeleteCustomReport,
  useExecuteCustomReport,
  type UseCustomReportsOptions,
  type UseCustomReportOptions,
  type ListCustomReportsInput,
  type CreateCustomReportInput,
  type UpdateCustomReportInput,
  type ExecuteCustomReportInput,
} from './use-custom-reports';

// ============================================================================
// REPORT FAVORITES HOOKS
// ============================================================================
export {
  useReportFavorites,
  useCreateReportFavorite,
  useDeleteReportFavorite,
  useBulkDeleteReportFavorites,
  type UseReportFavoritesOptions,
  type ListReportFavoritesInput,
  type CreateReportFavoriteInput,
  type DeleteReportFavoriteInput,
  type BulkDeleteReportFavoritesInput,
} from './use-report-favorites';

// ============================================================================
// TYPE EXPORTS
// ============================================================================
export type {
  ReportsCustomReportsFilters,
  ReportsReportFavoritesFilters,
  ReportsScheduledReportsFilters,
  ReportsTargetsFilters,
  ReportsTargetProgressFilters,
} from '@/lib/query-keys';
