/**
 * Attachment List Component
 *
 * Lists attachments for an entity with download and delete actions.
 *
 * @example
 * ```tsx
 * <AttachmentList
 *   entityType="customer"
 *   entityId={customerId}
 *   editable
 * />
 * ```
 */

import { useState } from "react"
import { Download, Trash2, Upload } from "lucide-react"
import { cn } from "~/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useAttachments, useDownloadUrl, useDeleteFile } from "@/hooks/use-files"
import { FilePreview } from "./file-preview"
import type { AttachmentInfo } from "@/lib/schemas/files"

// ============================================================================
// TYPES
// ============================================================================

export interface AttachmentListProps {
  /** Entity type to filter attachments */
  entityType: string
  /** Entity ID to filter attachments */
  entityId: string
  /** Allow delete actions */
  editable?: boolean
  /** Additional class name */
  className?: string
}

// ============================================================================
// HELPERS
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface AttachmentItemProps {
  attachment: AttachmentInfo
  editable?: boolean
  onDelete: (id: string) => void
  isDeleting: boolean
}

function AttachmentItem({
  attachment,
  editable,
  onDelete,
  isDeleting,
}: AttachmentItemProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const { data: downloadData } = useDownloadUrl(attachment.id)

  const handleDownload = () => {
    if (downloadData?.downloadUrl) {
      window.open(downloadData.downloadUrl, "_blank")
    }
  }

  const handleDelete = () => {
    onDelete(attachment.id)
    setDeleteDialogOpen(false)
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      {/* Preview - pass downloadUrl to avoid duplicate fetch */}
      <FilePreview
        attachment={attachment}
        size="sm"
        downloadUrl={downloadData?.downloadUrl}
      />

      {/* File Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {attachment.originalFilename}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(attachment.sizeBytes)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleDownload}
          disabled={!downloadData?.downloadUrl}
          aria-label={`Download ${attachment.originalFilename}`}
        >
          <Download className="h-4 w-4" />
        </Button>

        {editable && (
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={isDeleting}
                aria-label={`Delete ${attachment.originalFilename}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete attachment?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete "{attachment.originalFilename}". This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AttachmentList({
  entityType,
  entityId,
  editable = false,
  className,
}: AttachmentListProps) {
  const { data, isLoading, isError } = useAttachments(entityType, entityId)
  const deleteMutation = useDeleteFile()

  const handleDelete = (attachmentId: string) => {
    deleteMutation.mutate(attachmentId)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
            <Skeleton className="h-8 w-8 rounded" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center",
          className
        )}
      >
        <p className="text-sm text-destructive">Failed to load attachments</p>
      </div>
    )
  }

  // Empty state
  if (!data?.attachments || data.attachments.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center",
          className
        )}
      >
        <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No attachments</p>
      </div>
    )
  }

  // List view
  return (
    <div className={cn("space-y-2", className)}>
      {data.attachments.map((attachment) => (
        <AttachmentItem
          key={attachment.id}
          attachment={attachment}
          editable={editable}
          onDelete={handleDelete}
          isDeleting={deleteMutation.isPending}
        />
      ))}
    </div>
  )
}
