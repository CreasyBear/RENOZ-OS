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
  type CreateOpportunityColumnsOptions,
} from './opportunity-columns';
export type { OpportunityTableItem } from '@/lib/schemas/pipeline';

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
export { OpportunityForm } from './opportunity-form';

// NOTE: Deprecated components removed from exports:
// - OpportunityActivityTimeline: Use OpportunityActivityTimelineContainer or UnifiedActivityTimeline
// - OpportunityDetail: Use OpportunityDetailContainer + OpportunityDetailView
// - OpportunityCard: Use SortableKanbanCard from @/components/shared/kanban
