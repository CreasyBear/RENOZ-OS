/**
 * useEntityActivityLogging
 *
 * Encapsulates activity logging state, mutation, and handlers for entity detail views.
 * Eliminates repetitive handleLogActivity/EntityActivityLogger boilerplate across
 * Issue, Supplier, Product, PO, Invoice, Inventory, Quote, Warranty, etc.
 *
 * @example
 * const { onLogActivity, loggerProps } = useEntityActivityLogging({
 *   entityType: 'issue',
 *   entityId: issueId,
 *   entityLabel: `Issue: ${issue.issueNumber}`,
 * });
 *
 * return (
 *   <>
 *     <DetailView onLogActivity={onLogActivity} />
 *     <EntityActivityLogger {...loggerProps} />
 *   </>
 * );
 */

import { useState, useCallback } from 'react';
import { useLogEntityActivity } from './use-activities';
import { toastSuccess, toastError } from '@/hooks';
import type { ActivityLogData, ActivityType } from '@/components/shared/activity';
import type { ActivityEntityType } from '@/lib/schemas/activities';

// ============================================================================
// TYPES
// ============================================================================

export interface UseEntityActivityLoggingOptions {
  entityType: ActivityEntityType;
  entityId: string;
  entityLabel: string;
}

export interface EntityActivityLoggerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityLabel: string;
  onSubmit: (data: ActivityLogData) => Promise<void>;
  isSubmitting: boolean;
  defaultType?: ActivityType;
}

export interface UseEntityActivityLoggingReturn {
  /** Call to open the log activity dialog (default: note) */
  onLogActivity: () => void;
  /** Call to open the dialog with follow-up type pre-selected */
  onScheduleFollowUp: () => void;
  /** Open dialog with a specific activity type (note, call, meeting, follow_up) */
  openWithType: (type: ActivityType) => void;
  /** Props to spread onto EntityActivityLogger */
  loggerProps: EntityActivityLoggerProps;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatActivityType(type: ActivityLogData['type']): string {
  return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
}

// ============================================================================
// HOOK
// ============================================================================

export function useEntityActivityLogging({
  entityType,
  entityId,
  entityLabel,
}: UseEntityActivityLoggingOptions): UseEntityActivityLoggingReturn {
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [defaultType, setDefaultType] = useState<ActivityType>('note');
  const logActivity = useLogEntityActivity();

  const openWithType = useCallback((type: ActivityType) => {
    setDefaultType(type);
    setActivityDialogOpen(true);
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    setActivityDialogOpen(open);
    if (!open) setDefaultType('note');
  }, []);

  const handleLogActivity = useCallback(
    async (data: ActivityLogData) => {
      if (!entityId) return;

      try {
        await logActivity.mutateAsync({
          entityType,
          entityId,
          activityType: data.type,
          description: data.description,
          outcome: data.outcome,
          scheduledAt: data.scheduledAt,
          isFollowUp: data.isFollowUp,
        });
        const typeLabel = formatActivityType(data.type);
        toastSuccess(`${typeLabel} logged for ${entityLabel}`);
        handleOpenChange(false);
      } catch (error) {
        toastError(error instanceof Error ? error.message : 'Failed to log activity');
      }
    },
    [entityType, entityId, entityLabel, logActivity, handleOpenChange]
  );

  return {
    onLogActivity: entityId ? () => openWithType('note') : () => {},
    onScheduleFollowUp: entityId ? () => openWithType('follow_up') : () => {},
    openWithType: entityId ? openWithType : () => {},
    loggerProps: {
      open: activityDialogOpen,
      onOpenChange: handleOpenChange,
      entityLabel,
      onSubmit: handleLogActivity,
      isSubmitting: logActivity.isPending,
      defaultType,
    },
  };
}
