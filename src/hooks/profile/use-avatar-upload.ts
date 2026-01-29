/**
 * Avatar Upload Hook
 *
 * Hook for uploading and updating user avatar.
 *
 * @see src/server/functions/profile/avatar.ts
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getAvatarUploadUrl, confirmAvatarUpload } from "@/server/functions/profile/avatar";
import { toast } from "@/hooks/_shared/use-toast";
import { queryKeys } from "@/lib/query-keys";

interface UseAvatarUploadOptions {
  onSuccess?: () => void;
}

export function useAvatarUpload(options: UseAvatarUploadOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      // Validate file type and size
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      const maxSize = 2 * 1024 * 1024; // 2MB

      if (!allowedTypes.includes(file.type)) {
        throw new Error("Invalid file type. Please upload JPEG, PNG, or WebP.");
      }

      if (file.size > maxSize) {
        throw new Error("File too large. Maximum size is 2MB.");
      }

      // Step 1: Get presigned upload URL
      const uploadData = await getAvatarUploadUrl({
        data: {
          filename: file.name,
          mimeType: file.type as "image/jpeg" | "image/png" | "image/webp",
          sizeBytes: file.size,
        },
      });

      // Step 2: Upload file directly to Supabase Storage
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const uploadResponse = await fetch(
        `${supabaseUrl}/storage/v1/object/upload/sign/public/${uploadData.path}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        }
      );

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.message || "Failed to upload avatar");
      }

      // Step 3: Confirm upload and update user record
      const result = await confirmAvatarUpload({
        data: { avatarUrl: uploadData.publicUrl },
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
