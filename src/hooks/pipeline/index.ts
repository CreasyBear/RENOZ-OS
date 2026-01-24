/**
 * Pipeline Hooks Barrel Export
 *
 * Centralized hooks for pipeline domain:
 * - Opportunities (list, detail, search)
 * - Opportunity mutations (create, update, delete, stage change)
 * - Quotes (versions, comparison, expiring/expired)
 * - Quote mutations (create, restore, extend validity, PDF, send)
 * - Activities (timeline, follow-ups)
 * - Activity mutations (log, complete, update, delete)
 * - Pipeline metrics (summary, forecast, velocity)
 *
 * @example
 * ```tsx
 * import {
 *   useOpportunities,
 *   useUpdateOpportunityStage,
 *   useExpiringQuotes,
 *   usePipelineMetrics,
 * } from '@/hooks/pipeline';
 * ```
 */

// ============================================================================
// OPPORTUNITY HOOKS
// ============================================================================
export {
  useOpportunities,
  useOpportunitiesInfinite,
  useOpportunity,
  useOpportunitySearch,
  type UseOpportunitiesOptions,
  type UseOpportunityOptions,
  type UseOpportunitySearchOptions,
  type OpportunityListResult,
  type OpportunityDetailResult,
} from './use-opportunities';

export {
  useCreateOpportunity,
  useUpdateOpportunity,
  useDeleteOpportunity,
  useUpdateOpportunityStage,
  useConvertToOrder,
  type StageChangeInput,
  type ConvertToOrderInput,
} from './use-opportunity-mutations';

// ============================================================================
// QUOTE HOOKS
// ============================================================================
export {
  useQuoteVersions,
  useQuoteVersion,
  useQuoteComparison,
  useExpiringQuotes,
  useExpiredQuotes,
  useQuoteValidityStats,
  type UseQuoteVersionsOptions,
  type UseQuoteVersionOptions,
  type UseQuoteComparisonOptions,
  type UseExpiringQuotesOptions,
  type UseExpiredQuotesOptions,
  type QuoteAlertItem,
  type QuoteVersionListResult,
  type QuoteComparisonResult,
} from './use-quotes';

export {
  useCreateQuoteVersion,
  useRestoreQuoteVersion,
  useUpdateQuoteExpiration,
  useExtendQuoteValidity,
  useGenerateQuotePdf,
  useSendQuote,
  type CreateQuoteVersionInput,
  type RestoreQuoteVersionInput,
  type UpdateQuoteExpirationInput,
  type ExtendQuoteValidityInput,
  type GenerateQuotePdfInput,
  type SendQuoteInput,
} from './use-quote-mutations';

// ============================================================================
// ACTIVITY HOOKS
// ============================================================================
export {
  useActivities,
  useActivityTimeline,
  useFollowUps,
  useActivityAnalytics,
  type UseActivitiesOptions,
  type UseActivityTimelineOptions,
  type UseFollowUpsOptions,
  type UseActivityAnalyticsOptions,
  type FollowUpItem,
  type ActivityListResult,
  type ActivityTimelineResult,
} from './use-activities';

export {
  useLogActivity,
  useUpdateActivity,
  useCompleteActivity,
  useDeleteActivity,
  type LogActivityInput,
  type UpdateActivityInput,
  type CompleteActivityInput,
  type DeleteActivityInput,
} from './use-activity-mutations';

// ============================================================================
// METRICS HOOKS
// ============================================================================
export {
  usePipelineMetrics,
  usePipelineForecast,
  usePipelineVelocity,
  useRevenueAttribution,
  usePipelineCustomers,
  usePipelineProducts,
  type UsePipelineMetricsOptions,
  type UsePipelineForecastOptions,
  type UsePipelineVelocityOptions,
  type UseRevenueAttributionOptions,
  type PipelineMetricsData,
} from './use-pipeline-metrics';

// ============================================================================
// TYPE RE-EXPORTS
// ============================================================================
export type {
  Opportunity,
  OpportunityFilter,
  CreateOpportunity,
  UpdateOpportunity,
  OpportunityStage,
  QuoteVersion,
  QuoteLineItem,
  OpportunityActivity,
  OpportunityActivityType,
} from '@/lib/schemas/pipeline';
