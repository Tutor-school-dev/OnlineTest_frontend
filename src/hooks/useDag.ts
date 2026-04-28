import { useQuery } from '@tanstack/react-query'
import { fetchDag } from '@/api/admin.api'

export function useDag(dagId: string | null) {
  return useQuery({
    queryKey: ['dag', dagId],
    queryFn: () => fetchDag(dagId!),
    enabled: !!dagId,
    staleTime: 10 * 60 * 1000,
  })
}
