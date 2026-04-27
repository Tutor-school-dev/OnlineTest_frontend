import { useQuery } from '@tanstack/react-query'
import { fetchAttempts } from '../api/admin.api'

export function useAttempts(testId: string) {
  return useQuery({
    queryKey: ['admin-attempts', testId],
    queryFn: () => fetchAttempts(testId),
    enabled: !!testId,
  })
}
