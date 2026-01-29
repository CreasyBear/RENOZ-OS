/**
 * Pipeline Domain Components
 *
 * Exports all pipeline-related UI components.
 */

// --- Container Components ---
export {
  PipelineKanbanContainer,
  type PipelineKanbanContainerProps,
} from './pipeline-kanban-container';

// --- Core Components ---
export { PipelineBoard, type PipelineBoardProps } from './pipeline-board';
export { PipelineColumn, type PipelineColumnProps } from './pipeline-column';
export {
  PipelineColumnVirtualized,
  type PipelineColumnVirtualizedProps,
} from './pipeline-column-virtualized';
export {
  PipelineColumnSummary,
  type PipelineColumnSummaryProps,
} from './pipeline-column-summary';
export {
  PipelineListView,
  type PipelineListViewProps,
} from './pipeline-list-view';
export type { PipelineViewMode } from './pipeline-kanban-container';
export { PipelineMetrics, type PipelineMetricsProps } from './pipeline-metrics';
export {
  PipelineFilters,
  type PipelineFiltersProps,
  type PipelineFiltersState,
} from './pipeline-filters';
export { WonLostDialog, type WonLostDialogProps } from './won-lost-dialog';
export {
  ProductQuickAdd,
  type ProductQuickAddProps,
  type SelectedProduct,
} from './product-quick-add';

// --- Quotes ---
export * from './quotes';
export type { QuoteBuilderProps } from './quotes/quote-builder';
export type { QuoteVersionHistoryProps } from './quotes/quote-version-history';
export type { QuotePdfPreviewProps } from './quotes/quote-pdf-preview';
export type { QuoteValidityBadgeProps } from './quotes/quote-validity-badge';
export type { ExtendValidityDialogProps } from './quotes/extend-validity-dialog';
export type { ExpiredQuotesAlertProps } from './quotes/expired-quotes-alert';
export type { QuickQuoteFormProps } from './quotes/quick-quote-form';
export type { QuickQuoteDialogProps } from './quotes/quick-quote-dialog';

// --- Opportunities ---
export * from './opportunities';
export type { OpportunityCardProps } from './opportunities/opportunity-card';
export type { OpportunityDetailProps } from './opportunities/opportunity-detail';
export type { OpportunityFormProps } from './opportunities/opportunity-form';

// --- Activities ---
export * from './activities';
export type { ActivityLoggerProps } from './activities/activity-logger';
export type { ActivityTimelineProps } from './activities/activity-timeline';
export type { FollowUpSchedulerProps } from './activities/follow-up-scheduler';
