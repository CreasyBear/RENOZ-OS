/**
 * User Profile Hook
 *
 * Hook for fetching and updating the current user's profile.
 *
 * @see src/server/functions/users/users.ts
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import { getUser, updateUser } from "@/server/functions/users/users";
import { toast } from "@/hooks/_shared/use-toast";
import { queryKeys } from "@/lib/query-keys";

export function useProfile(userId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.user.profile(),
    queryFn: async () => {
      try {
        return await getUser({ data: { id: userId } });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'detail-not-found',
          fallbackMessage: 'Your profile is temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested user profile could not be found.',
        });
      }
    },
    enabled: enabled && !!userId,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      profile,
    }: {
      id: string;
      name?: string;
      profile?: Record<string, unknown>;
    }) => {
      const result = await updateUser({
        data: {
          id,
          name,
          profile,
        },
      });
      if (result == null) {
        throw new Error('Profile update returned no data');
      }
      return result;
    },
    onSuccess: () => {
      toast.success("Profile updated successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update profile");
    },
  });
}
