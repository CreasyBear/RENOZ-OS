/**
 * Change Password Hook
 *
 * Hook for changing user password.
 *
 * @see src/server/functions/auth/change-password.ts
 */
import { useMutation } from "@tanstack/react-query";
import { changePassword } from "@/server/functions/auth/change-password";
import { toast } from "@/hooks/_shared/use-toast";
import { formatPasswordChangeError } from "@/hooks/auth/password-change-error-messages";

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const result = await changePassword({ data }).catch((error) => {
        throw new Error(formatPasswordChangeError(error));
      });
      if (!result.success) {
        throw new Error(formatPasswordChangeError(result.error));
      }
      return result;
    },
    onSuccess: () => {
      toast.success("Password changed successfully");
    },
    onError: (error: Error) => {
      toast.error(formatPasswordChangeError(error));
    },
  });
}
