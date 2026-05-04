import { useQuery } from '@tanstack/react-query'
import { fetchNodes } from '@/api/admin.api'
import { fetchUserNodes } from '@/api/tests.api'

export function useNodes(nodeIds: string | null, variant: 'admin' | 'user' = 'admin') {
  return useQuery({
    queryKey: ['nodes', nodeIds, variant],
    queryFn: () => variant === 'user' ? fetchUserNodes(nodeIds!) : fetchNodes(nodeIds!),
    enabled: !!nodeIds,
    staleTime: 10 * 60 * 1000,
  })
}
