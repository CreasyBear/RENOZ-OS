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
import { toastError, toastSuccess } from '@/hooks';
import { logger } from '@/lib/logger';
import { useUploadFile, useFetchDownloadUrl } from '@/hooks/files';
import { useUpdateChecklistItem } from '@/hooks/jobs';
import type {
  ChecklistTemplateResponse,
  ChecklistItemResponse,
} from '@/lib/schemas/jobs/checklists';

// ============================================================================
// TYPES
// ============================================================================

export interface JobChecklistTabProps {
  /** Source: Jobs checklist container query. */
  jobId: string;
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

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = ['application/pdf'];

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isValidChecklistUpload = (file: File) => {
  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isImage && !isPdf) {
    return {
      valid: false,
      message: 'Only images and PDFs are allowed.',
    };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      valid: false,
      message: `File must be smaller than ${formatBytes(MAX_UPLOAD_BYTES)}.`,
    };
  }
  return { valid: true };
};

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
  jobId,
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
  const [pendingPhotoItemId, setPendingPhotoItemId] = React.useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<{
    itemId: string | null;
    message: string;
    file?: File;
  } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const uploadFile = useUploadFile();
  const updateChecklistItem = useUpdateChecklistItem(jobId);
  const fetchDownloadUrl = useFetchDownloadUrl();

  // Handlers
  const handleApplyTemplate = async (templateId: string) => {
    try {
      await onApplyTemplate(templateId);
      setApplyDialogOpen(false);
    } catch (err) {
      logger.error('Failed to apply checklist', err);
      toastError(err instanceof Error ? err.message : 'Failed to apply checklist');
    }
  };

  const handleToggleComplete = async (itemId: string, isCompleted: boolean) => {
    try {
      await onToggleComplete(itemId, isCompleted);
    } catch (err) {
      logger.error('Failed to toggle item', err);
      toastError(err instanceof Error ? err.message : 'Failed to update checklist item');
    }
  };

  const handleUpdateNotes = async (itemId: string, notes: string | null) => {
    try {
      await onUpdateNotes(itemId, notes);
    } catch (err) {
      logger.error('Failed to update notes', err);
      toastError(err instanceof Error ? err.message : 'Failed to update notes');
    }
  };

  const handleAttachPhoto = (itemId: string) => {
    setPendingPhotoItemId(itemId);
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const handleUpload = async (file: File, itemId: string) => {
    setIsUploadingPhoto(true);
    setUploadError(null);
    try {
      const uploadResult = await uploadFile.mutateAsync({
        file,
        entityType: 'job',
        entityId: jobId,
      });

      const download = await fetchDownloadUrl.mutateAsync(
        uploadResult.attachment.id
      );

      await updateChecklistItem.mutateAsync({
        itemId,
        photoUrl: download?.downloadUrl,
      });

      toastSuccess('Photo attached');
    } catch (err) {
      logger.error('Failed to upload photo', err);
      setUploadError({
        itemId,
        message: 'Failed to attach photo. Please try again.',
        file,
      });
      toastError('Failed to attach photo');
    } finally {
      setIsUploadingPhoto(false);
      setPendingPhotoItemId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !pendingPhotoItemId) return;

    const validation = isValidChecklistUpload(file);
    if (!validation.valid) {
      setUploadError({
        itemId: pendingPhotoItemId,
        message: validation.message ?? 'File is not supported.',
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    await handleUpload(file, pendingPhotoItemId);
  };

  const handleRetryUpload = async () => {
    if (!uploadError?.file || !uploadError.itemId) return;
    await handleUpload(uploadError.file, uploadError.itemId);
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
      <input
        ref={fileInputRef}
        type="file"
        accept={`image/*,${ACCEPTED_FILE_TYPES.join(',')}`}
        className="hidden"
        onChange={handleFileChange}
      />
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
      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Upload failed</AlertTitle>
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>{uploadError.message}</span>
            <div className="flex gap-2">
              {uploadError.file && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetryUpload}
                  disabled={isUploadingPhoto}
                >
                  Retry upload
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUploadError(null)}
                disabled={isUploadingPhoto}
              >
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      <div className="space-y-3">
        {checklistItems.map((item) => (
          <ChecklistItemCard
            key={item.id}
            item={item}
            onToggleComplete={(isCompleted) => handleToggleComplete(item.id, isCompleted)}
            onUpdateNotes={(notes) => handleUpdateNotes(item.id, notes)}
            onAttachPhoto={() => handleAttachPhoto(item.id)}
            isUpdating={
              isUpdating ||
              updateChecklistItem.isPending ||
              (isUploadingPhoto && pendingPhotoItemId === item.id)
            }
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
