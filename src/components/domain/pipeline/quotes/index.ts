/**
 * Pipeline Quote Components
 *
 * Container/Presenter Pattern:
 * - Containers handle data fetching via centralized hooks
 * - Presenters are pure UI components receiving data via props
 * - Use *Container components in routes and parent components
 * - Legacy names exported for backwards compatibility
 */

// ============================================================================
// DETAIL - Container/Presenter (Gold Standard Pattern)
// ============================================================================
export {
  QuoteDetailContainer,
  type QuoteDetailContainerProps,
  type QuoteDetailContainerRenderProps,
} from './containers/quote-detail-container';
export {
  QuoteDetailView,
  type QuoteDetailViewProps,
  type QuoteDetailCustomer,
  type QuoteVersionSummary,
} from './views/quote-detail-view';

// ============================================================================
// DETAIL - Legacy (for backwards compatibility)
// ============================================================================
export { QuoteDetail, type QuoteDetailProps } from './quote-detail';

// ============================================================================
// BUILDER & FORMS - Containers
// ============================================================================
export { QuickQuoteFormContainer } from './quick-quote-form-container';
export { QuoteBuilderContainer } from './quote-builder-container';

// ============================================================================
// BUILDER & FORMS - Presenters (for backwards compatibility)
// ============================================================================
export { QuickQuoteDialog } from './quick-quote-dialog';
export {
  QuickQuoteForm,
  QuickQuoteFormPresenter,
  type QuickQuoteFormContainerProps,
  type QuickQuoteFormPresenterProps,
} from './quick-quote-form';
export {
  QuoteBuilder,
  QuoteBuilderPresenter,
  type QuoteBuilderContainerProps,
  type QuoteBuilderPresenterProps,
} from './quote-builder';

// ============================================================================
// DISPLAY & PREVIEW - Containers
// ============================================================================
export { QuotePdfPreviewContainer } from './quote-pdf-preview-container';
export { QuoteVersionHistoryContainer } from './quote-version-history-container';

// ============================================================================
// DISPLAY & PREVIEW - Presenters (for backwards compatibility)
// ============================================================================
export {
  QuotePdfPreview,
  QuotePdfPreviewPresenter,
  type QuotePdfPreviewContainerProps,
  type QuotePdfPreviewPresenterProps,
} from './quote-pdf-preview';
export { QuoteValidityBadge } from './quote-validity-badge';
export {
  QuoteVersionHistory,
  QuoteVersionHistoryPresenter,
  type QuoteVersionHistoryContainerProps,
  type QuoteVersionHistoryPresenterProps,
} from './quote-version-history';

// ============================================================================
// ALERTS & DIALOGS - Containers
// ============================================================================
export { ExpiredQuotesAlertContainer } from './expired-quotes-alert-container';

// ============================================================================
// ALERTS & DIALOGS - Presenters (for backwards compatibility)
// ============================================================================
export {
  ExpiredQuotesAlert,
  ExpiredQuotesAlertPresenter,
  type ExpiredQuotesAlertContainerProps,
  type ExpiredQuotesAlertPresenterProps,
} from './expired-quotes-alert';
export { ExtendValidityDialog } from './extend-validity-dialog';

// ============================================================================
// STATUS CONFIG
// ============================================================================
export {
  QUOTE_STATUS_CONFIG,
  getQuoteDisplayStatus,
  getDaysUntilExpiry,
  getExpiryStatus,
  type QuoteDisplayStatus,
} from './quote-status-config';
