/**
 * File Uploader Component
 *
 * Drag-and-drop file upload with progress tracking.
 * Uses presigned URLs for direct upload to R2.
 *
 * @example
 * ```tsx
 * <FileUploader
 *   onUploadComplete={(attachment) => console.log('Uploaded:', attachment)}
 *   entityType="customer"
 *   entityId={customerId}
 *   accept="image/*,application/pdf"
 *   maxSizeMB={10}
 * />
 * ```
 */

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import {
  Upload,
  File,
  AlertTriangle,
  CheckCircle,
  X,
  Loader2,
} from "lucide-react"
import { cn } from "~/lib/utils"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { useUploadFile } from "@/hooks"
import type { AttachmentInfo } from "@/lib/schemas/files"

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_MAX_SIZE_MB = 50
const BYTES_PER_MB = 1024 * 1024

// ============================================================================
// TYPES
// ============================================================================

export interface FileUploaderProps {
  /** Callback when upload completes successfully */
  onUploadComplete: (attachment: AttachmentInfo) => void
  /** Entity type for attachment association */
  entityType?: string
  /** Entity ID for attachment association */
  entityId?: string
  /** Accepted file types (e.g., "image/*,application/pdf") */
  accept?: string
  /** Maximum file size in MB (default: 50) */
  maxSizeMB?: number
  /** Allow multiple file uploads */
  multiple?: boolean
  /** Additional class name */
  className?: string
}

interface FileUploadState {
  file: File
  status: "pending" | "uploading" | "success" | "error"
  progress: number
  error?: string
  attachment?: AttachmentInfo
}

// ============================================================================
// HELPERS
// ============================================================================

function parseAccept(accept?: string): Record<string, string[]> | undefined {
  if (!accept) return undefined

  const result: Record<string, string[]> = {}
  const types = accept.split(",").map((t) => t.trim())

  for (const type of types) {
    if (type.includes("/")) {
      // MIME type like "image/*" or "application/pdf"
      result[type] = []
    } else if (type.startsWith(".")) {
      // Extension like ".pdf"
      result["application/octet-stream"] = [
        ...(result["application/octet-stream"] || []),
        type,
      ]
    }
  }

  return Object.keys(result).length > 0 ? result : undefined
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < BYTES_PER_MB) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FileUploader({
  onUploadComplete,
  entityType,
  entityId,
  accept,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  multiple = false,
  className,
}: FileUploaderProps) {
  const [files, setFiles] = useState<FileUploadState[]>([])
  const uploadMutation = useUploadFile()

  const maxSizeBytes = maxSizeMB * BYTES_PER_MB

  const uploadFile = useCallback(
    async (fileState: FileUploadState) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.file === fileState.file
            ? { ...f, status: "uploading" as const, progress: 0 }
            : f
        )
      )

      try {
        const result = await uploadMutation.mutateAsync({
          file: fileState.file,
          entityType,
          entityId,
          onProgress: (progress) => {
            setFiles((prev) =>
              prev.map((f) =>
                f.file === fileState.file ? { ...f, progress } : f
              )
            )
          },
        })

        setFiles((prev) =>
          prev.map((f) =>
            f.file === fileState.file
              ? {
                  ...f,
                  status: "success" as const,
                  progress: 100,
                  attachment: result.attachment,
                }
              : f
          )
        )

        onUploadComplete(result.attachment)
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f.file === fileState.file
              ? {
                  ...f,
                  status: "error" as const,
                  error:
                    error instanceof Error
                      ? error.message
                      : "Upload failed",
                }
              : f
          )
        )
      }
    },
    [uploadMutation, entityType, entityId, onUploadComplete]
  )

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles: FileUploadState[] = acceptedFiles.map((file) => ({
        file,
        status: "pending" as const,
        progress: 0,
      }))

      // Validate file sizes
      const validFiles = newFiles.filter((f) => {
        if (f.file.size > maxSizeBytes) {
          f.status = "error"
          f.error = `File exceeds ${maxSizeMB}MB limit`
          return true // Keep in list to show error
        }
        return true
      })

      setFiles((prev) => (multiple ? [...prev, ...validFiles] : validFiles))

      // Start uploading valid files
      validFiles
        .filter((f) => f.status === "pending")
        .forEach((f) => uploadFile(f))
    },
    [maxSizeBytes, maxSizeMB, multiple, uploadFile]
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: parseAccept(accept),
      maxSize: maxSizeBytes,
      multiple,
    })

  const removeFile = useCallback((file: File) => {
    setFiles((prev) => prev.filter((f) => f.file !== file))
  }, [])

  const retryUpload = useCallback(
    (fileState: FileUploadState) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.file === fileState.file
            ? { ...f, status: "pending" as const, error: undefined, progress: 0 }
            : f
        )
      )
      uploadFile({ ...fileState, status: "pending", error: undefined, progress: 0 })
    },
    [uploadFile]
  )

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        role="button"
        aria-label="Upload files"
        className={cn(
          "relative flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
          isDragActive && !isDragReject && "border-primary bg-primary/5",
          isDragReject && "border-destructive bg-destructive/5",
          !isDragActive && "border-muted-foreground/25 hover:border-primary/50"
        )}
      >
        <input {...getInputProps()} />
        <Upload
          className={cn(
            "mb-4 h-10 w-10",
            isDragActive && !isDragReject && "text-primary",
            isDragReject && "text-destructive",
            !isDragActive && "text-muted-foreground"
          )}
        />
        <p className="mb-1 text-sm font-medium">
          {isDragActive
            ? isDragReject
              ? "File type not accepted"
              : "Drop files here"
            : "Drag & drop files here"}
        </p>
        <p className="text-xs text-muted-foreground">
          or click to browse (max {maxSizeMB}MB)
        </p>
        {accept && (
          <p className="mt-1 text-xs text-muted-foreground">
            Accepted: {accept}
          </p>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2" aria-live="polite">
          {files.map((fileState, index) => (
            <div
              key={`${fileState.file.name}-${index}`}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              {/* Icon */}
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-muted">
                {fileState.status === "success" ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : fileState.status === "error" ? (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                ) : fileState.status === "uploading" ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <File className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              {/* File Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {fileState.file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(fileState.file.size)}
                </p>

                {/* Progress Bar */}
                {fileState.status === "uploading" && (
                  <Progress value={fileState.progress} className="mt-2 h-1" />
                )}

                {/* Error Message */}
                {fileState.status === "error" && fileState.error && (
                  <p className="mt-1 text-xs text-destructive">
                    {fileState.error}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {fileState.status === "error" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => retryUpload(fileState)}
                    aria-label="Retry upload"
                  >
                    Retry
                  </Button>
                )}
                {fileState.status !== "uploading" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeFile(fileState.file)}
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
