import { useQuery } from '@tanstack/react-query'
import { fetchDag } from '@/api/admin.api'
import { fetchUserDag } from '@/api/tests.api'

export function useDag(dagId: string | null, variant: 'admin' | 'user' = 'admin') {
  return useQuery({
    queryKey: ['dag', dagId, variant],
    queryFn: () => variant === 'user' ? fetchUserDag(dagId!) : fetchDag(dagId!),
    enabled: !!dagId,
    staleTime: 10 * 60 * 1000,
  })
}
