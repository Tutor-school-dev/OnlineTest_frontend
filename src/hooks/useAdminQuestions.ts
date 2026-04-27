import { useQuery } from '@tanstack/react-query'
import { fetchAdminQuestions } from '../api/admin.api'

export function useAdminQuestions(testId: string) {
  return useQuery({
    queryKey: ['admin-questions', testId],
    queryFn: () => fetchAdminQuestions(testId),
    enabled: !!testId,
  })
}
