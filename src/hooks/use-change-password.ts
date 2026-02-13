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

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const result = await changePassword({ data });
      if (!result.success) {
        throw new Error(result.error || "Failed to change password");
      }
      return result;
    },
    onSuccess: () => {
      toast.success("Password changed successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to change password");
    },
  });
}
