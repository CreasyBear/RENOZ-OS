/**
 * Avatar Upload Hook
 *
 * Hook for uploading and updating user avatar.
 * Uses server function for secure file upload (no direct Supabase access).
 *
 * @lastReviewed 2026-02-10
 * @param options.onSuccess - Callback on successful upload
 * @returns TanStack Query mutation for avatar upload
 * @see src/server/functions/profile/avatar.ts
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { uploadAvatarFile, removeAvatar } from "@/server/functions/profile/avatar";
import { toast } from "@/hooks/_shared/use-toast";
import { queryKeys } from "@/lib/query-keys";
import { AVATAR_MAX_SIZE_BYTES, isAllowedAvatarType } from "@/lib/users";

interface UseAvatarUploadOptions {
  onSuccess?: () => void;
}

export function useAvatarUpload(options: UseAvatarUploadOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      // Validate file type and size using centralized constants
      if (!isAllowedAvatarType(file.type)) {
        throw new Error("Invalid file type. Please upload JPEG, PNG, or WebP.");
      }

      if (file.size > AVATAR_MAX_SIZE_BYTES) {
        throw new Error("File too large. Maximum size is 2MB.");
      }

      // Convert file to base64 for server upload
      const base64Content = await new Promise<string>((resolve, reject) => {
        const reader = new globalThis.FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === "string") {
            // Remove data URL prefix if present
            const base64 = result.includes(",") ? result.split(",")[1] : result;
            resolve(base64);
          } else {
            reject(new Error("Failed to read file"));
          }
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      // Upload via server function (secure, no direct Supabase access)
      const result = await uploadAvatarFile({
        data: {
          base64Content,
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        },
      });

      return result;
    },
    onSuccess: () => {
      toast.success("Avatar updated successfully");
      // Invalidate user profile cache
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });
      options.onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update avatar");
    },
  });
}

/**
 * Hook for removing user avatar.
 * 
 * @param options.onSuccess - Callback on successful removal
 * @returns TanStack Query mutation for avatar removal
 */
export function useRemoveAvatar(options: UseAvatarUploadOptions = {}) {
  const queryClient = useQueryClient();
  const removeAvatarFn = useServerFn(removeAvatar);

  return useMutation({
    mutationFn: async () => {
      return await removeAvatarFn({ data: undefined });
    },
    onSuccess: () => {
      toast.success("Avatar removed successfully");
      // Invalidate user profile cache
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });
      options.onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove avatar");
    },
  });
}
