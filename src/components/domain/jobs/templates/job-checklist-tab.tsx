/**
 * Job Checklist Tab
 *
 * Main container for commissioning checklist on job detail page.
 * Shows progress, checklist items, and apply template dialog.
 *
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-004c
 */

import * as React from 'react';
import { ClipboardList, AlertCircle, RefreshCw, CheckCircle2, Circle, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChecklistItemCard } from './checklist-item-card';
import { ApplyChecklistDialog } from './apply-checklist-dialog';
import type {
  ChecklistTemplateResponse,
  ChecklistItemResponse,
} from '@/lib/schemas/jobs/checklists';

// ============================================================================
// TYPES
// ============================================================================

export interface JobChecklistTabProps {
  /** Source: Jobs checklist container query. */
  checklistItems: ChecklistItemResponse[];
  /** Source: Jobs checklist container query. */
  stats: { total: number; completed: number; remaining: number; percentComplete: number };
  /** Source: Jobs checklist container query. */
  templateName?: string | null;
  /** Source: Jobs checklist container query. */
  hasChecklist: boolean;
  /** Source: Jobs checklist container query. */
  isLoading: boolean;
  /** Source: Jobs checklist container query. */
  isError: boolean;
  /** Source: Jobs checklist container query. */
  error?: Error | null;
  /** Source: Jobs checklist container query. */
  onRetry: () => void;
  /** Source: Jobs checklist container templates query. */
  templates: ChecklistTemplateResponse[];
  /** Source: Jobs checklist container templates query. */
  isLoadingTemplates: boolean;
  /** Source: Jobs checklist container apply mutation. */
  onApplyTemplate: (templateId: string) => Promise<void>;
  /** Source: Jobs checklist container update mutation. */
  onToggleComplete: (itemId: string, isCompleted: boolean) => Promise<void>;
  /** Source: Jobs checklist container update mutation. */
  onUpdateNotes: (itemId: string, notes: string | null) => Promise<void>;
  /** Source: Jobs checklist container mutations. */
  isApplying: boolean;
  /** Source: Jobs checklist container mutations. */
  isUpdating: boolean;
}

// ============================================================================
// SKELETON
// ============================================================================

function ChecklistSkeleton() {
  return (
    <div className="space-y-4">
      {/* Progress skeleton */}
      <div className="rounded-lg border p-4">
        <div className="mb-2 flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* Items skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-6 w-6 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function JobChecklistTab({
  checklistItems,
  stats,
  templateName,
  hasChecklist,
  isLoading,
  isError,
  error,
  onRetry,
  templates,
  isLoadingTemplates,
  onApplyTemplate,
  onToggleComplete,
  onUpdateNotes,
  isApplying,
  isUpdating,
}: JobChecklistTabProps) {
  // State
  const [applyDialogOpen, setApplyDialogOpen] = React.useState(false);

  // Handlers
  const handleApplyTemplate = async (templateId: string) => {
    try {
      await onApplyTemplate(templateId);
      setApplyDialogOpen(false);
    } catch (err) {
      console.error('Failed to apply checklist:', err);
    }
  };

  const handleToggleComplete = async (itemId: string, isCompleted: boolean) => {
    try {
      await onToggleComplete(itemId, isCompleted);
    } catch (err) {
      console.error('Failed to toggle item:', err);
    }
  };

  const handleUpdateNotes = async (itemId: string, notes: string | null) => {
    try {
      await onUpdateNotes(itemId, notes);
    } catch (err) {
      console.error('Failed to update notes:', err);
    }
  };

  const handleAttachPhoto = (itemId: string) => {
    // TODO: Implement photo upload functionality
    console.log('Attach photo to item:', itemId);
  };

  // Loading state
  if (isLoading) {
    return <ChecklistSkeleton />;
  }

  // Error state
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading checklist</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>{error?.message || 'Failed to load checklist'}</span>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // No checklist applied - show empty state with apply button
  if (!hasChecklist) {
    return (
      <>
        <Empty>
          <EmptyHeader>
            <ClipboardList className="text-muted-foreground/50 mx-auto h-12 w-12" />
            <EmptyTitle>No Checklist Applied</EmptyTitle>
            <EmptyDescription>
              Apply a commissioning checklist template to track completion of required items for
              this job.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setApplyDialogOpen(true)}>
              <ClipboardList className="mr-2 h-4 w-4" />
              Apply Checklist Template
            </Button>
          </EmptyContent>
        </Empty>

        <ApplyChecklistDialog
          open={applyDialogOpen}
          onOpenChange={setApplyDialogOpen}
          templates={templates}
          isLoadingTemplates={isLoadingTemplates}
          onApply={handleApplyTemplate}
          isApplying={isApplying}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="bg-card rounded-lg border p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-medium">{templateName || 'Checklist'}</h3>
            <p className="text-muted-foreground text-sm">
              {stats.completed} of {stats.total} items completed
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold">{Math.round(stats.percentComplete)}%</span>
          </div>
        </div>
        <Progress value={stats.percentComplete} className="h-2" />

        {/* Stats badges */}
        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>{stats.completed} completed</span>
          </div>
          <div className="text-muted-foreground flex items-center gap-1.5">
            <Circle className="h-4 w-4" />
            <span>{stats.remaining} remaining</span>
          </div>
          {checklistItems.some((item) => item.requiresPhoto && !item.photoUrl) && (
            <div className="flex items-center gap-1.5 text-amber-600">
              <Camera className="h-4 w-4" />
              <span>
                {checklistItems.filter((item) => item.requiresPhoto && !item.photoUrl).length}{' '}
                photos needed
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-3">
        {checklistItems.map((item) => (
          <ChecklistItemCard
            key={item.id}
            item={item}
            onToggleComplete={(isCompleted) => handleToggleComplete(item.id, isCompleted)}
            onUpdateNotes={(notes) => handleUpdateNotes(item.id, notes)}
            onAttachPhoto={() => handleAttachPhoto(item.id)}
            isUpdating={isUpdating}
          />
        ))}
      </div>

      {/* Completion message */}
      {stats.percentComplete === 100 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-900 dark:bg-green-950">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-600" />
          <p className="font-medium text-green-800 dark:text-green-200">Checklist Complete!</p>
          <p className="text-sm text-green-600 dark:text-green-400">
            All commissioning items have been checked off.
          </p>
        </div>
      )}
    </div>
  );
}
