import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { getCurrentUser } from '@/server/functions/users/users'

export function useCurrentUserProfile() {
  return useQuery({
    queryKey: queryKeys.currentUser.detail(),
    queryFn: () => getCurrentUser(),
    staleTime: 5 * 60 * 1000,
  })
}
