/**
 * Organization Logo Upload Hook
 *
 * Hook for uploading and removing organization logo.
 * Uses server function for secure file upload (no direct Supabase access).
 *
 * @see src/server/functions/settings/organization-logo.ts
 * @see use-avatar-upload.ts
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import {
  uploadOrganizationLogoFile,
  removeOrganizationLogo,
} from '@/server/functions/settings/organization-logo';
import { toast } from '@/hooks/_shared/use-toast';
import { queryKeys } from '@/lib/query-keys';
import {
  isAllowedLogoMimeType,
  MAX_SIZE_BYTES,
  LOGO_ERROR_MESSAGES,
} from '@/lib/organization-logo';

interface UseOrganizationLogoUploadOptions {
  onSuccess?: () => void;
}

export function useOrganizationLogoUpload(options: UseOrganizationLogoUploadOptions = {}) {
  const queryClient = useQueryClient();
  const uploadFn = useServerFn(uploadOrganizationLogoFile);

  return useMutation({
    mutationFn: async (file: File) => {
      if (!isAllowedLogoMimeType(file.type)) {
        throw new Error(LOGO_ERROR_MESSAGES.invalidType);
      }

      if (file.size > MAX_SIZE_BYTES) {
        throw new Error(LOGO_ERROR_MESSAGES.fileTooLarge);
      }

      const base64Content = await new Promise<string>((resolve, reject) => {
        const reader = new globalThis.FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === 'string') {
            const base64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(base64 ?? '');
          } else {
            reject(new Error('Failed to read file'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const result = await uploadFn({
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
      toast.success('Logo updated successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.current() });
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.settings() });
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.branding() });
      options.onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update logo');
    },
  });
}

export function useRemoveOrganizationLogo(options: UseOrganizationLogoUploadOptions = {}) {
  const queryClient = useQueryClient();
  const removeFn = useServerFn(removeOrganizationLogo);

  return useMutation({
    mutationFn: async () => {
      return await removeFn({ data: undefined });
    },
    onSuccess: () => {
      toast.success('Logo removed successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.current() });
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.settings() });
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.branding() });
      options.onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove logo');
    },
  });
}
