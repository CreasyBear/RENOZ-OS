import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { queryKeys } from '@/lib/query-keys'
import { getCurrentUser } from '@/server/functions/users/users'

export function useCurrentUserProfile() {
  const getCurrentUserFn = useServerFn(getCurrentUser)

  return useQuery({
    queryKey: queryKeys.currentUser.detail(),
    queryFn: async () => {
      const result = await getCurrentUserFn()
      if (result == null) throw new Error('Current user returned no data')
      return result
    },
    staleTime: 5 * 60 * 1000,
  })
}
