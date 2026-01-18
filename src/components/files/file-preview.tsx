/**
 * File Preview Component
 *
 * Renders preview for different file types:
 * - Images: Thumbnail with lazy loading
 * - PDFs: FileText icon with filename
 * - Other: Generic File icon
 *
 * @example
 * ```tsx
 * <FilePreview attachment={attachment} size="md" />
 * ```
 */

import { useState } from "react"
import { File, FileText, ImageOff } from "lucide-react"
import { cn } from "~/lib/utils"
import { useDownloadUrl } from "@/hooks/use-files"
import { Skeleton } from "@/components/ui/skeleton"
import type { AttachmentInfo } from "@/lib/schemas/files"

// ============================================================================
// TYPES
// ============================================================================

export interface FilePreviewProps {
  /** The attachment to preview */
  attachment: AttachmentInfo
  /** Size variant */
  size?: "sm" | "md" | "lg"
  /** Additional class name */
  className?: string
  /** Pre-fetched download URL (avoids duplicate fetch if parent already has it) */
  downloadUrl?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SIZE_MAP = {
  sm: { container: "h-8 w-8", icon: "h-4 w-4" },
  md: { container: "h-16 w-16", icon: "h-8 w-8" },
  lg: { container: "h-32 w-32", icon: "h-16 w-16" },
} as const

// ============================================================================
// HELPERS
// ============================================================================

function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/")
}

function isPdf(mimeType: string): boolean {
  return mimeType === "application/pdf"
}

function getFileExtension(filename: string): string {
  const parts = filename.split(".")
  return parts.length > 1 ? parts.pop()?.toUpperCase() || "" : ""
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FilePreview({
  attachment,
  size = "md",
  className,
  downloadUrl: propDownloadUrl,
}: FilePreviewProps) {
  const [imageError, setImageError] = useState(false)

  // Only fetch if: it's an image, no error, AND no URL was passed from parent
  const shouldFetch = isImage(attachment.mimeType) && !imageError && !propDownloadUrl
  const { data: downloadData, isLoading } = useDownloadUrl(
    shouldFetch ? attachment.id : undefined
  )

  // Use prop URL if provided, otherwise use fetched URL
  const downloadUrl = propDownloadUrl || downloadData?.downloadUrl

  const sizeClasses = SIZE_MAP[size]

  // Loading state for images (only show loading if we're fetching)
  if (isImage(attachment.mimeType) && !imageError && shouldFetch && isLoading) {
    return (
      <Skeleton
        className={cn(
          "flex-shrink-0 rounded",
          sizeClasses.container,
          className
        )}
      />
    )
  }

  // Image preview
  if (isImage(attachment.mimeType) && !imageError && downloadUrl) {
    return (
      <div
        className={cn(
          "relative flex-shrink-0 overflow-hidden rounded bg-muted",
          sizeClasses.container,
          className
        )}
      >
        <img
          src={downloadUrl}
          alt={attachment.originalFilename}
          loading="lazy"
          onError={() => setImageError(true)}
          className="h-full w-full object-cover"
        />
      </div>
    )
  }

  // Image error fallback
  if (isImage(attachment.mimeType) && imageError) {
    return (
      <div
        className={cn(
          "flex flex-shrink-0 items-center justify-center rounded bg-muted",
          sizeClasses.container,
          className
        )}
      >
        <ImageOff className={cn("text-muted-foreground", sizeClasses.icon)} />
      </div>
    )
  }

  // PDF preview
  if (isPdf(attachment.mimeType)) {
    return (
      <div
        className={cn(
          "flex flex-shrink-0 items-center justify-center rounded bg-red-50 dark:bg-red-950",
          sizeClasses.container,
          className
        )}
      >
        <FileText className={cn("text-red-500", sizeClasses.icon)} />
      </div>
    )
  }

  // Generic file preview
  return (
    <div
      className={cn(
        "flex flex-shrink-0 flex-col items-center justify-center rounded bg-muted",
        sizeClasses.container,
        className
      )}
    >
      <File className={cn("text-muted-foreground", sizeClasses.icon)} />
      {size !== "sm" && (
        <span className="mt-1 text-[10px] font-medium text-muted-foreground">
          {getFileExtension(attachment.originalFilename)}
        </span>
      )}
    </div>
  )
}
