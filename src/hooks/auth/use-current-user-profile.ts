import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { normalizeReadQueryError } from '@/lib/read-path-policy'
import { queryKeys } from '@/lib/query-keys'
import { getCurrentUser } from '@/server/functions/users/users'

export function useCurrentUserProfile() {
  const getCurrentUserFn = useServerFn(getCurrentUser)

  return useQuery({
    queryKey: queryKeys.currentUser.detail(),
    queryFn: async () => {
      try {
        return await getCurrentUserFn()
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Your account information is temporarily unavailable. Please refresh and try again.',
        })
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}
