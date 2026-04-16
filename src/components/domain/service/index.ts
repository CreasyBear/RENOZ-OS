/**
 * Service Domain Components
 *
 * Components for service systems and linkage review workflows.
 */

// --- Detail containers ---
export {
  ServiceSystemDetailContainer,
  type ServiceSystemDetailContainerProps,
} from './containers/service-system-detail-container';
export {
  ServiceLinkageReviewDetailContainer,
  type ServiceLinkageReviewDetailContainerProps,
} from './containers/service-linkage-review-detail-container';
export { ServiceLinkageReviewsListContainer } from './containers/service-linkage-reviews-list-container';
export {
  ServiceSystemsListContainer,
  type ServiceSystemsListContainerProps,
} from './containers/service-systems-list-container';

// --- Dialogs ---
export {
  TransferServiceSystemDialog,
  type TransferServiceSystemDialogProps,
} from './dialogs/transfer-service-system-dialog';
export {
  ResolveServiceLinkageReviewDialog,
  type ResolveServiceLinkageReviewDialogProps,
} from './dialogs/resolve-service-linkage-review-dialog';
