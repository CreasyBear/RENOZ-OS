/**
 * Avatar Upload Component
 *
 * Component for uploading and managing user avatar.
 *
 * ARCHITECTURE: Container/Presenter Pattern
 * - Container handles data fetching (useAvatarUpload hook)
 * - Presenter renders UI and receives callbacks via props
 *
 * @lastReviewed 2026-02-10
 * @see src/hooks/profile/use-avatar-upload.ts
 * @see src/server/functions/profile/avatar.ts
 */
import { useRef, useCallback, useState } from "react";
import { Camera, Loader2, X, Check, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAvatarUpload, useRemoveAvatar } from "@/hooks/profile/use-avatar-upload";
import { toast } from "@/hooks/_shared/use-toast";
import {
  getInitials,
  AVATAR_MAX_SIZE_BYTES,
  isAllowedAvatarType,
} from "@/lib/users";
import type { AvatarUploadProps, AvatarUploadPresenterProps } from "@/lib/schemas/users/profile";

// ============================================================================
// CONSTANTS
// ============================================================================

const sizeClasses = {
  sm: "h-10 w-10",
  md: "h-16 w-16",
  lg: "h-24 w-24",
  xl: "h-32 w-32",
};

const iconSizes = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

// ============================================================================
// PRESENTER
// ============================================================================

/**
 * Avatar Upload Presenter
 *
 * Pure UI component - receives all data and callbacks via props.
 * No data fetching hooks.
 *
 * @param name - User's display name
 * @param avatarUrl - Current avatar URL from profile JSONB
 * @param preview - Preview URL for newly selected file
 * @param size - Avatar size variant
 * @param isDragging - Whether file is being dragged over
 * @param isUploading - Upload in progress state
 * @param isSuccess - Upload success state
 * @param inputRef - Reference to hidden file input
 * @param onInputChange - File input change handler
 * @param onDrop - Drag and drop handler
 * @param onDragOver - Drag over handler
 * @param onDragLeave - Drag leave handler
 * @param onClick - Click handler to trigger file picker
 * @param onCancel - Cancel preview handler
 * @param onRemove - Remove avatar handler
 * @param isRemoving - Remove avatar in progress state
 */
export function AvatarUploadPresenter({
  name,
  avatarUrl,
  preview,
  size = "lg",
  isDragging,
  isUploading,
  isSuccess,
  isRemoving,
  inputRef,
  onInputChange,
  onDrop,
  onDragOver,
  onDragLeave,
  onClick,
  onCancel,
  onRemove,
}: AvatarUploadPresenterProps) {
  const displayUrl = preview || avatarUrl;

  return (
    <div className="relative">
      <div
        className={`
          relative cursor-pointer group
          ${sizeClasses[size]}
          rounded-full overflow-hidden
          ${isDragging ? "ring-2 ring-primary ring-offset-2" : ""}
        `}
        onClick={onClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <Avatar className={`${sizeClasses[size]} cursor-pointer`}>
          <AvatarImage
            src={displayUrl || undefined}
            alt={name || "User avatar"}
            className="object-cover"
          />
          <AvatarFallback className={`bg-primary text-primary-foreground text-${size === "xl" ? "2xl" : size === "lg" ? "xl" : "lg"}`}>
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>

        {/* Overlay */}
        <div
          className={`
            absolute inset-0 bg-black/50 flex items-center justify-center
            opacity-0 group-hover:opacity-100 transition-opacity
            ${isUploading ? "opacity-100" : ""}
          `}
        >
          {isUploading ? (
            <Loader2 className={`${iconSizes[size]} text-white animate-spin`} />
          ) : (
            <Camera className={`${iconSizes[size]} text-white`} />
          )}
        </div>
      </div>

      {/* Cancel button for preview */}
      {preview && !isUploading && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      {/* Success indicator */}
      {isSuccess && (
        <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-green-500 rounded-full flex items-center justify-center">
          <Check className="h-4 w-4 text-white" />
        </div>
      )}

      {/* Remove avatar button (only show if avatar exists and not uploading/removing) */}
      {avatarUrl && !preview && !isUploading && !isRemoving && onRemove && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Remove avatar"
          title="Remove avatar"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}

      {/* Loading indicator for removal */}
      {isRemoving && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
          <Loader2 className={`${iconSizes[size]} text-white animate-spin`} />
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onInputChange}
        disabled={isUploading || isRemoving}
        aria-label="Upload avatar"
      />
    </div>
  );
}

// ============================================================================
// CONTAINER
// ============================================================================

/**
 * Avatar Upload Container
 *
 * Container responsibilities:
 * - Fetches mutation hook (useAvatarUpload)
 * - Handles file validation and preview logic
 * - Manages drag/drop state
 * - Passes data and callbacks to presenter
 *
 * @param name - User's display name (@source user.name from useUser hook)
 * @param avatarUrl - Current avatar URL (@source extractAvatarUrl(user.profile))
 * @param size - Avatar size variant (default: "lg")
 */
export function AvatarUpload({ name, avatarUrl, size = "lg" }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const uploadAvatar = useAvatarUpload({
    onSuccess: () => {
      setPreview(null);
    },
  });

  const removeAvatarMutation = useRemoveAvatar({
    onSuccess: () => {
      // Avatar removed successfully
    },
  });

  const handleFileSelect = useCallback(
    (file: File) => {
      // Validate file using centralized constants
      if (!isAllowedAvatarType(file.type)) {
        toast.error("Invalid file type", {
          description: "Please upload a JPEG, PNG, or WebP image.",
        });
        return;
      }

      if (file.size > AVATAR_MAX_SIZE_BYTES) {
        toast.error("File too large", {
          description: "Maximum file size is 2MB. Please choose a smaller image.",
        });
        return;
      }

      // Create preview
      const reader = new globalThis.FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          setPreview(result);
        }
      };
      reader.readAsDataURL(file);

      // Upload
      uploadAvatar.mutate(file);
    },
    [uploadAvatar]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleCancel = useCallback(() => {
    setPreview(null);
    uploadAvatar.reset();
  }, [uploadAvatar]);

  const handleRemove = useCallback(() => {
    if (confirm("Are you sure you want to remove your avatar?")) {
      removeAvatarMutation.mutate();
    }
  }, [removeAvatarMutation]);

  return (
    <AvatarUploadPresenter
      name={name}
      avatarUrl={avatarUrl}
      preview={preview}
      size={size}
      isDragging={isDragging}
      isUploading={uploadAvatar.isPending}
      isSuccess={uploadAvatar.isSuccess}
      isRemoving={removeAvatarMutation.isPending}
      inputRef={inputRef}
      onInputChange={handleInputChange}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      onCancel={handleCancel}
      onRemove={handleRemove}
    />
  );
}
