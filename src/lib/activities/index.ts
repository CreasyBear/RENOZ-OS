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
