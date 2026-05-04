import { useQuery } from '@tanstack/react-query'
import { fetchUserAttempts } from '../api/tests.api'

export function useUserAttempts(testId: string, userId: string) {
  return useQuery({
    queryKey: ['user-attempts', testId, userId],
    queryFn: () => fetchUserAttempts(testId, userId),
    enabled: !!testId && !!userId,
  })
}
