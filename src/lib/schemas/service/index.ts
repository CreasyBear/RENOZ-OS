/**
 * Service Schemas
 *
 * Canonical non-CRM owners, systems, and linkage reviews.
 */

// --- Core service identity ---
export {
  serviceOwnerAddressSchema,
  serviceOwnerSchema,
  serviceOwnerInputSchema,
  getServiceOwnerSchema,
} from './service-owners';
export {
  serviceSystemOwnershipStatusSchema,
  serviceSystemOwnershipStatusValues,
  isServiceSystemOwnershipStatus,
  serviceSystemAddressSchema,
  serviceSystemSchema,
  serviceSystemListItemSchema,
  serviceSystemOwnershipHistoryItemSchema,
  serviceSystemWarrantySummarySchema,
  serviceSystemDetailSchema,
  getServiceSystemSchema,
  listServiceSystemsSchema,
  transferServiceSystemOwnershipSchema,
} from './service-systems';

// --- Review queue ---
export {
  serviceLinkageReviewStatusValues,
  serviceLinkageReviewReasonValues,
  serviceLinkageReviewStatusSchema,
  serviceLinkageReviewReasonSchema,
  isServiceLinkageReviewStatus,
  isServiceLinkageReviewReason,
  serviceLinkageReviewSnapshotSchema,
  serviceLinkageReviewCandidateSchema,
  serviceLinkageReviewSummarySchema,
  serviceLinkageReviewDetailSchema,
  listServiceLinkageReviewsSchema,
  getServiceLinkageReviewSchema,
  resolveServiceLinkageReviewSchema,
} from './service-linkage-reviews';

// --- Re-export key types ---
export type {
  ServiceOwnerAddress,
  ServiceOwner,
  ServiceOwnerInput,
  GetServiceOwnerInput,
} from './service-owners';
export type {
  ServiceSystemAddress,
  ServiceSystem,
  ServiceSystemListItem,
  ServiceSystemDetail,
  ServiceSystemOwnershipStatus,
  ServiceSystemOwnershipHistoryItem,
  ServiceSystemWarrantySummary,
  GetServiceSystemInput,
  ListServiceSystemsInput,
  TransferServiceSystemOwnershipInput,
} from './service-systems';
export type {
  ServiceLinkageReviewStatus,
  ServiceLinkageReviewReason,
  ServiceLinkageReviewSnapshot,
  ServiceLinkageReviewCandidate,
  ServiceLinkageReviewSummary,
  ServiceLinkageReviewDetail,
  ListServiceLinkageReviewsInput,
  GetServiceLinkageReviewInput,
  ResolveServiceLinkageReviewInput,
} from './service-linkage-reviews';
