/**
 * Service Server Functions
 *
 * Public server-function surface for the service domain.
 */

// --- System detail ---
export {
  getServiceSystem,
  listServiceSystems,
  transferServiceSystemOwnership,
} from './service-systems';

// --- Review queue ---
export {
  listServiceLinkageReviews,
  getServiceLinkageReview,
  resolveServiceLinkageReview,
} from './service-linkage-reviews';
