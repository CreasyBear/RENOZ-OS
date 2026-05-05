/**
 * Activity Utilities
 *
 * Centralized utilities for activity-related functionality.
 */

export {
  getEntityLink,
  getEntityLinkWithTab,
  getCreateEntityLinkWithContext,
  getActivitiesFeedSearch,
} from './activity-navigation';

export {
  generateNextSteps,
  getPrimaryNextStep,
  type SuggestedAction,
  type NextStepsContext,
  type ActivityLoggerType,
} from './activity-next-steps';

export {
  resolveMetadataUuids,
  batchResolveMetadataUuids,
} from './activity-metadata';

export { buildManualActivityLogPresentation } from './build-manual-activity-log';
export { readAuditNote } from './read-audit-note';
export {
  ACTIVITY_READ_MESSAGES,
  formatActivityReadError,
} from './read-error-messages';
export {
  ACTIVITY_MUTATION_MESSAGES,
  formatActivityMutationError,
  type ActivityMutationAction,
} from './mutation-error-messages';
