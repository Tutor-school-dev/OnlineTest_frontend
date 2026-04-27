import { useQuery } from '@tanstack/react-query'
import { fetchTests } from '../api/tests.api'

export function useTests() {
  return useQuery({
    queryKey: ['tests'],
    queryFn: fetchTests,
    staleTime: 1000 * 60 * 5,
  })
}
