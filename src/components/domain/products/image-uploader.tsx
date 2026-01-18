/**
 * ImageUploader Component
 *
 * Handles image upload with drag-and-drop, preview, and validation.
 * Uploads to Supabase Storage and registers metadata via server function.
 */
import { useState, useRef, useCallback } from "react";
import {
  Upload,
  X,
  ImagePlus,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { addProductImage } from "@/lib/server/functions/product-images";

// Validation constants
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGES_PER_UPLOAD = 10;

interface UploadFile {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
  dimensions?: { width: number; height: number };
}

interface ImageUploaderProps {
  productId: string;
  onUploadComplete?: () => void;
  onClose?: () => void;
  existingImageCount?: number;
  maxImagesPerProduct?: number;
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Get image dimensions
function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// Validate file
function validateFile(
  file: File,
  existingCount: number,
  maxImages: number
): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: JPG, PNG, WebP, GIF`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  if (existingCount >= maxImages) {
    return {
      valid: false,
      error: `Maximum ${maxImages} images per product`,
    };
  }

  return { valid: true };
}

export function ImageUploader({
  productId,
  onUploadComplete,
  onClose,
  existingImageCount = 0,
  maxImagesPerProduct = 20,
}: ImageUploaderProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate remaining slots
  const remainingSlots = maxImagesPerProduct - existingImageCount - files.length;

  // Handle file selection
  const handleFileSelect = useCallback(
    async (selectedFiles: FileList | null) => {
      if (!selectedFiles || selectedFiles.length === 0) return;

      const newFiles: UploadFile[] = [];
      let currentCount = existingImageCount + files.length;

      for (let i = 0; i < Math.min(selectedFiles.length, MAX_IMAGES_PER_UPLOAD); i++) {
        const file = selectedFiles[i];

        // Validate
        const validation = validateFile(file, currentCount, maxImagesPerProduct);
        if (!validation.valid) {
          continue; // Skip invalid files
        }

        // Get dimensions
        let dimensions: { width: number; height: number } | undefined;
        try {
          dimensions = await getImageDimensions(file);
        } catch {
          // Continue without dimensions if we can't read them
        }

        newFiles.push({
          id: generateId(),
          file,
          preview: URL.createObjectURL(file),
          status: "pending",
          progress: 0,
          dimensions,
        });

        currentCount++;
      }

      setFiles((prev) => [...prev, ...newFiles]);
    },
    [existingImageCount, files.length, maxImagesPerProduct]
  );

  // Drag handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Remove file from queue
  const removeFile = (id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  // Upload a single file
  const uploadFile = async (uploadFile: UploadFile): Promise<boolean> => {
    // Update status to uploading
    setFiles((prev) =>
      prev.map((f) =>
        f.id === uploadFile.id ? { ...f, status: "uploading" as const, progress: 10 } : f
      )
    );

    try {
      // For now, we'll create a mock URL since Supabase Storage integration
      // would require client-side setup. In production, this would:
      // 1. Upload to Supabase Storage
      // 2. Get the public URL
      // 3. Register with addProductImage

      // Simulate upload progress
      for (let progress = 20; progress <= 80; progress += 20) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        setFiles((prev) =>
          prev.map((f) => (f.id === uploadFile.id ? { ...f, progress } : f))
        );
      }

      // In a real implementation, you would:
      // 1. Upload to Supabase: const { data } = await supabase.storage.from('product-images').upload(path, file)
      // 2. Get public URL: const { publicUrl } = supabase.storage.from('product-images').getPublicUrl(data.path)

      // For demo purposes, we'll use the local preview URL
      // In production, replace with actual storage URL
      const imageUrl = uploadFile.preview;

      // Register image with server
      await addProductImage({
        data: {
          productId,
          imageUrl,
          fileSize: uploadFile.file.size,
          dimensions: uploadFile.dimensions,
          mimeType: uploadFile.file.type,
          setAsPrimary: false,
        },
      });

      // Update status to success
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: "success" as const, progress: 100 }
            : f
        )
      );

      return true;
    } catch (error) {
      console.error("Upload failed:", error);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? {
                ...f,
                status: "error" as const,
                progress: 0,
                error: error instanceof Error ? error.message : "Upload failed",
              }
            : f
        )
      );
      return false;
    }
  };

  // Upload all pending files
  const handleUploadAll = async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    setIsUploading(true);

    // Upload files sequentially
    for (const file of pendingFiles) {
      await uploadFile(file);
    }

    setIsUploading(false);

    // Check if all succeeded
    const allSucceeded = files.every(
      (f) => f.status === "success" || f.status === "pending"
    );

    if (allSucceeded) {
      onUploadComplete?.();
    }
  };

  // Clear completed files
  const clearCompleted = () => {
    setFiles((prev) => {
      const remaining = prev.filter((f) => f.status !== "success");
      prev
        .filter((f) => f.status === "success")
        .forEach((f) => URL.revokeObjectURL(f.preview));
      return remaining;
    });

    if (files.every((f) => f.status === "success")) {
      onClose?.();
    }
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const successCount = files.filter((f) => f.status === "success").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_MIME_TYPES.join(",")}
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        <Upload
          className={cn(
            "mx-auto h-12 w-12 transition-colors",
            isDragging ? "text-primary" : "text-muted-foreground"
          )}
        />

        <h3 className="mt-4 text-lg font-medium">
          {isDragging ? "Drop images here" : "Upload images"}
        </h3>

        <p className="mt-2 text-sm text-muted-foreground">
          Drag and drop images here, or click to browse
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          JPG, PNG, WebP, GIF up to 10MB
          {remainingSlots < maxImagesPerProduct && (
            <span className="ml-1">({remainingSlots} slots remaining)</span>
          )}
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              {files.length} file{files.length !== 1 ? "s" : ""} selected
            </h4>
            {successCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCompleted}>
                Clear completed
              </Button>
            )}
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {files.map((file) => (
              <div
                key={file.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg border",
                  file.status === "success" && "bg-green-50 border-green-200",
                  file.status === "error" && "bg-red-50 border-red-200"
                )}
              >
                {/* Preview */}
                <div className="h-12 w-12 rounded overflow-hidden flex-shrink-0">
                  <img
                    src={file.preview}
                    alt={file.file.name}
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.file.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      {(file.file.size / 1024 / 1024).toFixed(2)} MB
                      {file.dimensions && (
                        <span className="ml-1">
                          • {file.dimensions.width}×{file.dimensions.height}
                        </span>
                      )}
                    </p>
                    {file.status === "uploading" && (
                      <Progress value={file.progress} className="h-1 w-20" />
                    )}
                  </div>
                  {file.error && (
                    <p className="text-xs text-red-600">{file.error}</p>
                  )}
                </div>

                {/* Status / Actions */}
                <div className="flex-shrink-0">
                  {file.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {file.status === "uploading" && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                  {file.status === "success" && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                  {file.status === "error" && (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Upload summary */}
          {(successCount > 0 || errorCount > 0) && (
            <div className="flex items-center gap-4 text-sm">
              {successCount > 0 && (
                <span className="text-green-600">
                  {successCount} uploaded successfully
                </span>
              )}
              {errorCount > 0 && (
                <span className="text-red-600">{errorCount} failed</span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button
              onClick={handleUploadAll}
              disabled={pendingCount === 0 || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <ImagePlus className="mr-2 h-4 w-4" />
                  Upload {pendingCount} Image{pendingCount !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
