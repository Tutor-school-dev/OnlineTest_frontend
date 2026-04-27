import { useQuery } from '@tanstack/react-query'
import { fetchAttemptDetails } from '../api/admin.api'

export function useAttemptDetails(attemptId: string) {
  return useQuery({
    queryKey: ['admin-attempt-details', attemptId],
    queryFn: () => fetchAttemptDetails(attemptId),
    enabled: !!attemptId,
  })
}
