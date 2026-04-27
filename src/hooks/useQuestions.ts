import { useQuery } from '@tanstack/react-query'
import { fetchQuestions } from '../api/questions.api'

export function useQuestions(testId: string) {
  return useQuery({
    queryKey: ['questions', testId],
    queryFn: () => fetchQuestions(testId),
    enabled: !!testId,
    staleTime: Infinity,
  })
}
