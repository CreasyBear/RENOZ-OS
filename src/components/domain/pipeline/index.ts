/**
 * Pipeline Domain Components
 *
 * Exports all pipeline-related UI components.
 */

export { OpportunityCard, type OpportunityCardProps } from "./opportunity-card";
export { PipelineColumn, type PipelineColumnProps } from "./pipeline-column";
export { PipelineBoard, type PipelineBoardProps } from "./pipeline-board";
export { PipelineMetrics, type PipelineMetricsProps } from "./pipeline-metrics";
export {
  PipelineFilters,
  type PipelineFiltersProps,
  type PipelineFiltersState,
} from "./pipeline-filters";
export { WonLostDialog, type WonLostDialogProps } from "./won-lost-dialog";
export { OpportunityDetail, type OpportunityDetailProps } from "./opportunity-detail";
export { OpportunityForm, type OpportunityFormProps } from "./opportunity-form";
export { ActivityLogger, type ActivityLoggerProps } from "./activity-logger";
export { ActivityTimeline, type ActivityTimelineProps } from "./activity-timeline";
export { FollowUpScheduler, type FollowUpSchedulerProps } from "./follow-up-scheduler";
export { QuoteBuilder, type QuoteBuilderProps } from "./quote-builder";
export {
  QuoteVersionHistory,
  type QuoteVersionHistoryProps,
} from "./quote-version-history";
export { QuotePdfPreview, type QuotePdfPreviewProps } from "./quote-pdf-preview";
export {
  QuoteValidityBadge,
  type QuoteValidityBadgeProps,
} from "./quote-validity-badge";
export {
  ExtendValidityDialog,
  type ExtendValidityDialogProps,
} from "./extend-validity-dialog";
export {
  ExpiredQuotesAlert,
  type ExpiredQuotesAlertProps,
} from "./expired-quotes-alert";
export { QuickQuoteForm, type QuickQuoteFormProps } from "./quick-quote-form";
export {
  QuickQuoteDialog,
  type QuickQuoteDialogProps,
} from "./quick-quote-dialog";
export {
  ProductQuickAdd,
  type ProductQuickAddProps,
  type SelectedProduct,
} from "./product-quick-add";
