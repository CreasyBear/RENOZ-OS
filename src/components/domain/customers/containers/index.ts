/**
 * Customer Containers
 *
 * Container components that handle data fetching and mutations.
 */

// --- Detail Containers ---
export { CustomerDetailContainer } from './customer-detail-container';

// --- Activity Timeline ---
export {
  CustomerActivityTimelineContainer,
  type CustomerActivityTimelineContainerProps,
} from './customer-activity-timeline-container';

// --- Communications, Duplicates, Segments Containers ---
export { CommunicationsContainer, type CommunicationsContainerProps } from './communications-container';
export { DuplicatesContainer, type DuplicatesContainerProps } from './duplicates-container';
export { SegmentsContainer, type SegmentsContainerProps } from './segments-container';
