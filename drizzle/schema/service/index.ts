/**
 * Service Schema Exports
 *
 * Canonical non-CRM owner and installed-system tables.
 */

// --- Core Service Identity ---
export { serviceOwners, serviceOwnersRelations } from "./service-owners";
export { serviceSystems, serviceSystemsRelations } from "./service-systems";
export {
  serviceSystemOwnerships,
  serviceSystemOwnershipsRelations,
} from "./service-system-ownerships";

// --- Review Queue ---
export {
  serviceLinkageReviewReasonEnum,
  serviceLinkageReviewStatusEnum,
  serviceLinkageReviews,
  serviceLinkageReviewsRelations,
} from "./service-linkage-reviews";
