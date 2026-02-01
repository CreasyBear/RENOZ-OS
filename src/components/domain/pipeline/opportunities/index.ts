/**
 * Pipeline Opportunity Components
 */

// --- Status Configuration ---
export {
  OPPORTUNITY_STAGE_CONFIG,
  STAGE_COLORS,
  STAGE_PROBABILITY_DEFAULTS,
  isOpportunityOverdue,
  formatExpectedCloseDateRelative,
} from './opportunity-status-config';

// --- Column Definitions ---
export {
  createOpportunityColumns,
  type OpportunityTableItem,
  type CreateOpportunityColumnsOptions,
} from './opportunity-columns';

// --- List Components ---
export {
  OpportunitiesListContainer,
  type OpportunitiesListContainerProps,
  type OpportunitiesListFilters,
} from './opportunities-list-container';
export {
  OpportunitiesListPresenter,
  type OpportunitiesListPresenterProps,
} from './opportunities-list-presenter';
export {
  OpportunitiesTablePresenter,
  type OpportunitiesTablePresenterProps,
} from './opportunities-table-presenter';
export {
  OpportunitiesMobileCards,
  type OpportunitiesMobileCardsProps,
} from './opportunities-mobile-cards';

// --- Detail View (Container/Presenter Pattern) ---
export {
  OpportunityDetailContainer,
  type OpportunityDetailContainerProps,
  type OpportunityDetailContainerRenderProps,
} from './containers/opportunity-detail-container';
export {
  OpportunityDetailView,
  type OpportunityDetailViewProps,
} from './views/opportunity-detail-view';
export {
  OpportunityActivityTimelineContainer,
  type OpportunityActivityTimelineContainerProps,
} from './containers/opportunity-activity-timeline-container';

// --- Core Components ---
/**
 * @deprecated Use OpportunityActivityTimelineContainer or UnifiedActivityTimeline directly.
 * This component uses the old shared ActivityTimeline.
 */
export { OpportunityActivityTimeline } from './opportunity-activity-timeline';
export { OpportunityCard } from './opportunity-card';
/** @deprecated Use OpportunityDetailContainer + OpportunityDetailView instead */
export { OpportunityDetail } from './opportunity-detail';
export { OpportunityForm } from './opportunity-form';
