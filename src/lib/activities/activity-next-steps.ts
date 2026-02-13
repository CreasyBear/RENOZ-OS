/**
 * Activity Next Steps Utilities
 *
 * Generates contextual next-step suggestions based on activity type,
 * entity context, and workflow patterns.
 *
 * Follows WORKFLOW-CONTINUITY-STANDARDS.md for forward momentum.
 */

import type { LucideIcon } from 'lucide-react';
import { Eye, Calendar, FileText, Phone, Clock, Plus } from 'lucide-react';
import type { ActivityEntityType } from '@/lib/schemas/activities';
import { getEntityLink, getEntityLinkWithTab, getCreateEntityLinkWithContext } from './activity-navigation';

// ============================================================================
// TYPES
// ============================================================================

export type ActivityLoggerType = 'call' | 'email' | 'meeting' | 'note' | 'follow_up';

export interface SuggestedAction {
  label: string;
  description?: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'outline';
}

export interface NextStepsContext {
  /** Type of activity that was just logged */
  activityType: ActivityLoggerType;
  /** Entity type the activity was logged for */
  entityType?: ActivityEntityType | string;
  /** Entity ID the activity was logged for */
  entityId?: string;
  /** Display label for the entity */
  entityLabel?: string;
  /** Whether a follow-up was already scheduled */
  hasScheduledFollowUp?: boolean;
  /** Callback to reset form and continue logging */
  onResetForm?: () => void;
  /** Callback to set activity type */
  onSetActivityType?: (type: ActivityLoggerType) => void;
  /** Callback to schedule follow-up */
  onScheduleFollowUp?: () => void;
  /** Callback to close dialog */
  onClose?: () => void;
  /** Navigation function */
  onNavigate?: (path: string) => void;
}

// ============================================================================
// NEXT STEPS GENERATION
// ============================================================================

/**
 * Generate suggested next actions based on activity context.
 *
 * Returns actions prioritized by relevance:
 * 1. Primary action (view entity) - always first if available
 * 2. Context-specific actions based on activity type
 * 3. Workflow continuation actions
 *
 * @param context - Context for generating suggestions
 * @returns Array of suggested actions, ordered by priority
 */
export function generateNextSteps(context: NextStepsContext): SuggestedAction[] {
  const {
    activityType,
    entityType,
    entityId,
    entityLabel,
    hasScheduledFollowUp = false,
    onResetForm,
    onSetActivityType,
    onScheduleFollowUp,
    onClose,
    onNavigate,
  } = context;

  const actions: SuggestedAction[] = [];

  // Helper to navigate safely
  const navigateToPath = (path: string) => {
    onClose?.();
    if (onNavigate) {
      onNavigate(path);
    }
    // If no onNavigate provided, parent component should handle navigation
  };

  // ========================================================================
  // PRIMARY ACTION: View Entity
  // ========================================================================

  if (entityId && entityType && entityLabel) {
    const entityLink = getEntityLink(entityType, entityId);
    if (entityLink) {
      actions.push({
        label: `View ${entityLabel}`,
        description: 'See full details and history',
        icon: Eye,
        variant: 'default',
        onClick: () => navigateToPath(entityLink),
      });
    }
  }

  // ========================================================================
  // CONTEXT-SPECIFIC ACTIONS BY ACTIVITY TYPE
  // ========================================================================

  switch (activityType) {
    case 'call':
      // Schedule follow-up if not already scheduled
      if (!hasScheduledFollowUp && onScheduleFollowUp) {
        actions.push({
          label: 'Schedule follow-up call',
          description: 'Set a reminder for next steps',
          icon: Calendar,
          variant: 'outline',
          onClick: () => {
            onScheduleFollowUp();
          },
        });
      }

      // For customer calls, suggest creating a quote
      if (entityType === 'customer' && entityId) {
        const quoteLink = getCreateEntityLinkWithContext('quote', 'customer', entityId);
        if (quoteLink) {
          actions.push({
            label: 'Create quote',
            description: 'Follow up with a quote',
            icon: FileText,
            variant: 'outline',
            onClick: () => navigateToPath(quoteLink),
          });
        }
      }
      break;

    case 'meeting':
      // Schedule next meeting if not already scheduled
      if (!hasScheduledFollowUp && onScheduleFollowUp) {
        actions.push({
          label: 'Schedule next meeting',
          description: 'Plan the follow-up',
          icon: Calendar,
          variant: 'outline',
          onClick: () => {
            onScheduleFollowUp();
          },
        });
      }
      break;

    case 'email':
      // Suggest logging a call to continue conversation
      if (entityType === 'customer' && onResetForm && onSetActivityType) {
        actions.push({
          label: 'Log a call',
          description: 'Continue the conversation',
          icon: Phone,
          variant: 'outline',
          onClick: () => {
            onResetForm();
            onSetActivityType('call');
          },
        });
      }
      break;

    case 'note':
      // Suggest viewing activity timeline
      if (entityId && entityType) {
        const timelineLink = getEntityLinkWithTab(entityType, entityId, 'activity');
        if (timelineLink) {
          actions.push({
            label: 'View activity timeline',
            description: 'See all activities for this entity',
            icon: Clock,
            variant: 'outline',
            onClick: () => navigateToPath(timelineLink),
          });
        }
      }
      break;

    case 'follow_up':
      // For follow-ups, suggest viewing the original entity
      if (entityId && entityType && entityLabel) {
        const entityLink = getEntityLink(entityType, entityId);
        if (entityLink) {
          actions.push({
            label: `View ${entityLabel}`,
            description: 'Review the original context',
            icon: Eye,
            variant: 'outline',
            onClick: () => navigateToPath(entityLink),
          });
        }
      }
      break;
  }

  // ========================================================================
  // WORKFLOW CONTINUATION ACTIONS
  // ========================================================================

  // Always suggest logging another activity as a secondary option
  if (onResetForm) {
    actions.push({
      label: 'Log another activity',
      description: 'Continue tracking interactions',
      icon: Plus,
      variant: 'outline',
      onClick: () => {
        onResetForm();
      },
    });
  }

  return actions;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the most relevant next step for an activity type.
 * Useful for highlighting the primary action.
 */
export function getPrimaryNextStep(
  activityType: ActivityLoggerType,
  entityType?: ActivityEntityType | string,
  entityId?: string
): SuggestedAction | null {
  const steps = generateNextSteps({
    activityType,
    entityType,
    entityId,
    entityLabel: 'entity',
  });

  // Return the first action (primary) or null
  return steps.find((a) => a.variant === 'default') ?? steps[0] ?? null;
}
