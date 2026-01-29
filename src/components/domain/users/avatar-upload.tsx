/**
 * Avatar Upload Component
 *
 * Component for uploading and managing user avatar.
 *
 * @see src/hooks/profile/use-avatar-upload.ts
 */
import { useRef, useCallback, useState } from "react";
import { Camera, Loader2, X, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAvatarUpload } from "@/hooks/profile/use-avatar-upload";

interface AvatarUploadProps {
  name: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
}

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

export function AvatarUpload({ name, avatarUrl, size = "lg" }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const uploadAvatar = useAvatarUpload({
    onSuccess: () => {
      setPreview(null);
    },
  });

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileSelect = useCallback(
    (file: File) => {
      // Validate file
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      const maxSize = 2 * 1024 * 1024; // 2MB

      if (!allowedTypes.includes(file.type)) {
        return;
      }

      if (file.size > maxSize) {
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
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

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleCancel = () => {
    setPreview(null);
    uploadAvatar.reset();
  };

  const isUploading = uploadAvatar.isPending;
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
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
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
            handleCancel();
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      {/* Success indicator */}
      {uploadAvatar.isSuccess && (
        <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-green-500 rounded-full flex items-center justify-center">
          <Check className="h-4 w-4 text-white" />
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleInputChange}
        disabled={isUploading}
      />
    </div>
  );
}
