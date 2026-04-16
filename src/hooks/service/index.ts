/**
 * Service Hooks
 *
 * Hooks for service systems and service linkage reviews.
 */

// --- Service systems ---
export {
  useServiceSystems,
  useServiceSystem,
  useTransferServiceSystemOwnership,
} from './use-service-systems';

// --- Review queue ---
export {
  useServiceLinkageReviews,
  useServiceLinkageReview,
  useResolveServiceLinkageReview,
} from './use-service-systems';

// --- Re-export key types ---
export type {
  GetServiceSystemInput,
  ListServiceSystemsInput,
  ListServiceLinkageReviewsInput,
  GetServiceLinkageReviewInput,
  ResolveServiceLinkageReviewInput,
  TransferServiceSystemOwnershipInput,
  ServiceOwner,
  ServiceOwnerInput,
  ServiceSystem,
  ServiceSystemListItem,
  ServiceSystemDetail,
  ServiceLinkageReviewSummary,
  ServiceLinkageReviewDetail,
} from '@/lib/schemas/service';
