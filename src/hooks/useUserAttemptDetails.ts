import { useQuery } from '@tanstack/react-query'
import { fetchUserAttemptDetails } from '../api/tests.api'

export function useUserAttemptDetails(attemptId: string) {
  return useQuery({
    queryKey: ['user-attempt-details', attemptId],
    queryFn: () => fetchUserAttemptDetails(attemptId),
    enabled: !!attemptId,
  })
}
