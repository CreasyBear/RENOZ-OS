/**
 * Draft Restore Prompt
 *
 * UI component for prompting users to restore or discard a saved form draft.
 * Designed to integrate with useFormDraft hook.
 */

import { formatDistanceToNow } from 'date-fns';
import { RotateCcw, Trash2, Clock, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface DraftRestorePromptProps {
  /** Whether a draft exists */
  hasDraft: boolean;
  /** When the draft was saved */
  savedAt: Date | null;
  /** Callback to restore the draft */
  onRestore: () => void;
  /** Callback to discard the draft */
  onDiscard: () => void;
  /** Optional class name */
  className?: string;
  /** Variant style */
  variant?: 'banner' | 'inline' | 'toast';
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DraftRestorePrompt({
  hasDraft,
  savedAt,
  onRestore,
  onDiscard,
  className,
  variant = 'banner',
}: DraftRestorePromptProps) {
  if (!hasDraft) return null;

  const timeAgo = savedAt
    ? formatDistanceToNow(savedAt, { addSuffix: true })
    : 'recently';

  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 text-sm text-muted-foreground',
          className
        )}
      >
        <Clock className="h-4 w-4" />
        <span>Draft saved {timeAgo}</span>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0"
          onClick={onRestore}
        >
          Restore
        </Button>
        <span>·</span>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0 text-destructive"
          onClick={onDiscard}
        >
          Discard
        </Button>
      </div>
    );
  }

  return (
    <Alert
      className={cn(
        'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30',
        className
      )}
    >
      <Save className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-amber-800 dark:text-amber-200">
          You have an unsaved draft from {timeAgo}. Would you like to restore it?
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 border-amber-300 bg-white hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:hover:bg-amber-900"
            onClick={onRestore}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restore Draft
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-amber-700 hover:bg-amber-100 hover:text-amber-900 dark:text-amber-300 dark:hover:bg-amber-900 dark:hover:text-amber-100"
            onClick={onDiscard}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Discard
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

// ============================================================================
// SAVING INDICATOR
// ============================================================================

export interface DraftSavingIndicatorProps {
  /** Whether a save is in progress */
  isSaving: boolean;
  /** When the draft was last saved */
  savedAt: Date | null;
  /** Optional class name */
  className?: string;
}

export function DraftSavingIndicator({
  isSaving,
  savedAt,
  className,
}: DraftSavingIndicatorProps) {
  if (!isSaving && !savedAt) return null;

  const timeAgo = savedAt
    ? formatDistanceToNow(savedAt, { addSuffix: true })
    : null;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs text-muted-foreground',
        className
      )}
    >
      {isSaving ? (
        <>
          <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
          <span>Saving draft...</span>
        </>
      ) : (
        <>
          <Save className="h-3 w-3" />
          <span>Draft saved {timeAgo}</span>
        </>
      )}
    </div>
  );
}
