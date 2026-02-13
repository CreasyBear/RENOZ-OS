/**
 * Pipeline Domain Components
 *
 * Exports all pipeline-related UI components.
 *
 * NOTE: As of this version, the pipeline board uses shared kanban components.
 * The old custom column and card components have been deprecated.
 *
 * @see docs/design-system/KANBAN-STANDARDS.md
 */

// --- Container Components ---
export {
  PipelineKanbanContainer,
  type PipelineKanbanContainerProps,
} from './pipeline-kanban-container';

// --- Core Components ---
export { PipelineBoard, type PipelineBoardProps } from './pipeline-board';
// NOTE: PipelineColumn, PipelineColumnVirtualized, PipelineColumnSummary have been
// replaced by shared kanban components. See pipeline-board.tsx for usage.
export {
  PipelineListView,
  type PipelineListViewProps,
} from './pipeline-list-view';
export type { PipelineViewMode } from './pipeline-kanban-container';
export { PipelineMetrics, type PipelineMetricsProps } from './pipeline-metrics';

// --- Filter Config (FILTER-STANDARDS compliant) ---
export {
  PIPELINE_FILTER_CONFIG,
  PIPELINE_STAGE_OPTIONS,
  ACTIVE_STAGE_OPTIONS,
  DEFAULT_PIPELINE_FILTERS,
  createPipelineFilterConfig,
  type PipelineFiltersState,
} from './pipeline-filter-config';
export { WonLostDialog, type WonLostDialogProps } from './won-lost-dialog';
export {
  ProductQuickAdd,
  type ProductQuickAddProps,
  type SelectedProduct,
} from './product-quick-add';

// --- Quotes ---
export * from './quotes';
export type { QuoteValidityBadgeProps } from './quotes/quote-validity-badge';
export type { ExtendValidityDialogProps } from './quotes/extend-validity-dialog';
export type { QuickQuoteDialogProps } from './quotes/quick-quote-dialog';

// NOTE: Deprecated presenter type exports removed (containers export their own types):
// - QuoteBuilderContainerProps/PresenterProps: Use QuoteBuilderContainer from quotes barrel
// - QuoteVersionHistoryContainerProps/PresenterProps: Use QuoteVersionHistoryContainer from quotes barrel
// - QuotePdfPreviewContainerProps/PresenterProps: Use QuotePdfPreviewContainer from quotes barrel
// - ExpiredQuotesAlertContainerProps/PresenterProps: Use ExpiredQuotesAlertContainer from quotes barrel
// - QuickQuoteFormContainerProps/PresenterProps: Use QuickQuoteFormContainer from quotes barrel

// --- Opportunities ---
export * from './opportunities';
export type { OpportunityFormProps } from './opportunities/opportunity-form';
export type {
  OpportunityDetailContainerProps,
  OpportunityDetailContainerRenderProps,
} from './opportunities/containers/opportunity-detail-container';
export type { OpportunityDetailViewProps } from './opportunities/views/opportunity-detail-view';

// --- Activities ---
export * from './activities';
export type { ActivityLoggerProps } from './activities/activity-logger';
export type { FollowUpSchedulerProps } from './activities/follow-up-scheduler';

// NOTE: Deprecated type exports removed:
// - OpportunityDetailProps: Use OpportunityDetailViewProps instead
// - ActivityTimelineProps: Component deprecated, use OpportunityActivityTimelineContainer
